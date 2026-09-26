import { handleRoute, ok, readOptionalJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { githubCheckSchema } from '@/lib/validation';
import { checkRepoAccess, describeGithubConfig, verifyGithubCredentials } from '@/server/services/github.service';

/**
 * V4 M1/M4 — GitHub connectivity self-check.
 *
 * GET  /api/github  → what .env says (mode, masked token, base URL). No network for config; one cheap
 *                     probe when the token is configured.
 * POST /api/github  → live check: is the token alive, and (optionally) can ARCH reach a specific repo
 *                     and does the pinned commit exist?
 *                     Body: { owner?, repo?, commitSha?, defaultBranch?, configOnly? }
 *
 * Why this exists: a broken or under-scoped GITHUB_TOKEN used to surface only at "Approve & create PR"
 * time — after a human had already read the diff. Checking at connect time turns that into a red banner
 * on the repositories page instead.
 *
 * The token is never part of a response; only a masked hint is returned.
 */

type GithubFailure = {
  ok: false;
  mode: 'real';
  actor: null;
  actorType: null;
  scopes: never[];
  rateLimit: { limit: number; used: number; remaining: number; resetsAt: null };
  message: string;
};

/** A failed probe is data for the UI, not a 500: the page should show "GitHub: unreachable — why". */
function asFailure(error: unknown): GithubFailure {
  return {
    ok: false,
    mode: 'real',
    actor: null,
    actorType: null,
    scopes: [],
    rateLimit: { limit: 0, used: 0, remaining: 0, resetsAt: null },
    message: error instanceof AppError ? error.message : 'GitHub check failed.',
  };
}

export const GET = handleRoute(async (request) => {
  await requireApiContext(request);
  const config = describeGithubConfig();
  if (config.mode === 'mock') return ok({ config, check: null });
  return ok({ config, check: await verifyGithubCredentials().catch(asFailure) });
});

export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  // OWNER/ADMIN only: this probes repository existence with the *server's* token, so letting any role
  // call it would turn ARCH into a way to enumerate private repositories its own org has no claim on.
  await requirePermission(organization.id, user.id, 'repo.manage');

  const body = githubCheckSchema.parse(await readOptionalJson(request));
  const config = describeGithubConfig();

  if (body.configOnly || config.mode === 'mock') {
    return ok({ config, check: await verifyGithubCredentials(), repository: null, note: config.reason });
  }

  const check = await verifyGithubCredentials();
  // A dead token is the answer. Don't continue into a repo probe that would only repeat the 401.
  if (!check.ok || !body.owner || !body.repo) return ok({ config, check, repository: null });

  const repository = await checkRepoAccess({
    owner: body.owner,
    repo: body.repo,
    defaultBranch: body.defaultBranch ?? null,
    commitSha: body.commitSha ?? null,
  });

  await writeAudit({
    organizationId: organization.id,
    actorId: user.id,
    action: 'github.check',
    entityType: 'repo_connection',
    entityId: repository.fullName,
    metadata: {
      mode: config.mode,
      actor: check.actor,
      canPush: repository.canPush,
      requestedCommitSha: body.commitSha ?? null,
      resolvedSha: repository.baseSha,
    },
  });

  return ok({ config, check, repository });
});
