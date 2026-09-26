import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { repoConnectionRepository } from '@/server/repositories/repoConnection.repository';
import { enforceRateLimit } from '@/lib/rate-limit';
import { checkRepoAccess, githubMode, resolveCommitSha } from './github.service';

const COMMIT_SHA_REGEX = /^[a-f0-9]{7,40}$/i;
const OWNER_REGEX = /^[a-zA-Z0-9_.-]+$/;
const REPO_REGEX = /^[a-zA-Z0-9_.-]+$/;
const MAX_REPOS_PER_ORG = 20;
const REPO_RATE_LIMIT = { limit: 20, windowMs: 60_000 };

function normalizeFullName(owner: string, repo: string): string {
  return `${owner.trim()}/${repo.trim()}`;
}

function validateCommitSha(sha: string): void {
  if (!COMMIT_SHA_REGEX.test(sha)) {
    throw AppError.badRequest('Commit SHA must be 7-40 hex characters.', { commitSha: 'Invalid format.' });
  }
}

function validateOwnerRepo(owner: string, repo: string): void {
  if (!OWNER_REGEX.test(owner) || !REPO_REGEX.test(repo)) {
    throw AppError.badRequest('Invalid GitHub owner or repo name. Use letters, numbers, dash, dot, underscore.');
  }
  if (owner.length > 100 || repo.length > 100) {
    throw AppError.badRequest('Owner or repo name too long (max 100).');
  }
  // Prevent reserved names
  if (['.', '..'].includes(owner) || ['.', '..'].includes(repo)) {
    throw AppError.badRequest('Owner/repo cannot be . or ..');
  }
}

/**
 * V4 M1 — GitHub repo connect + org permission + commit pinning.
 *
 * Architecture:
 *   - Organization owns many RepoConnections (GitHub)
 *   - Each connection has pinnedCommitSha = exact commit fix was tested against (repo@commit)
 *   - RBAC: repo.manage (OWNER/ADMIN) to mutate, repo.read (all) to list
 *   - Rate limited + max per org to prevent abuse
 *   - Every mutation audited with actor, action, entity, metadata
 *   - Cross-tenant isolation: findById always filters by organizationId → 404 if not in org
 *
 * Why commit pinning matters:
 *   Without pinning, a patch generated against main today may not apply tomorrow.
 *   With pinning, evidence bundle says "tested against acme/api @ abc123", so human reviewer
 *   knows exact base, and PR can be created from that SHA.
 */

type GithubVerified = {
  fullName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  /** Full 40-char SHA GitHub resolved from the (possibly short) pin. */
  pinnedCommitSha: string | null;
  headSha: string;
  notes: string[];
};

/**
 * M1 hardening — when GitHub is reachable, a connection has to point at a repository the token can
 * actually write, and a pin has to be a commit that exists.
 *
 * Two concrete bugs this closes:
 *   - `git createRef` accepts only a full 40-char SHA, so a 7-char pin used to explode at approval
 *     time, three milestones after it was entered. Short SHAs are expanded here instead.
 *   - `defaultBranch: 'main'` was trusted blindly; a repo whose default is `master`/`develop` produced
 *     a PR against a branch that does not exist. GitHub's own answer wins unless the caller insisted.
 *
 * Returns null in mock mode (tests, air-gapped demo), so nothing here needs the network offline.
 */
async function verifyAgainstGithub(input: {
  owner: string;
  repo: string;
  defaultBranch?: string | null;
  commitSha?: string | null;
}): Promise<GithubVerified | null> {
  if (githubMode() !== 'real') return null;

  const check = await checkRepoAccess({
    owner: input.owner,
    repo: input.repo,
    commitSha: input.commitSha ?? null,
    defaultBranch: input.defaultBranch ?? null,
  });

  const notes: string[] = [];
  if (check.permissionsKnown && !check.canPush) {
    // A warning, not a refusal: GitHub reports `permissions.push: false` for some credentials that
    // can in fact write (GitHub App installation tokens, org-owner inheritance). Blocking on it would
    // lock people out of a working setup; the PR push itself is the real test, and its error is
    // explicit. The audit note + the "Check repo access" button make it visible either way.
    notes.push(`GitHub says this token cannot write ${check.fullName}; if that is right, give it "Contents: Read and write" before approving a fix.`);
  }
  if (check.archived) {
    throw AppError.badRequest(`${check.fullName} is archived on GitHub — unarchive it or connect an active repository.`);
  }
  if (input.defaultBranch && check.defaultBranch !== input.defaultBranch) {
    notes.push(`Base branch "${input.defaultBranch}" exists; note that ${check.fullName}'s default branch is "${check.defaultBranch}".`);
  }
  if (input.commitSha && check.baseSha !== input.commitSha.toLowerCase()) {
    notes.push(`Pinned "${input.commitSha}" resolved to full SHA ${check.baseSha}.`);
  }

  const [owner, repo] = check.fullName.split('/');
  return {
    fullName: check.fullName,
    owner: owner ?? input.owner,
    repo: repo ?? input.repo,
    defaultBranch: input.defaultBranch?.trim() || check.defaultBranch,
    pinnedCommitSha: input.commitSha ? check.baseSha : null,
    headSha: check.headSha,
    notes,
  };
}

export async function listRepoConnections(params: { organizationId: string; userId: string; includeInactive?: boolean }) {
  await requirePermission(params.organizationId, params.userId, 'repo.read');
  return repoConnectionRepository.list(params.organizationId, { includeInactive: params.includeInactive });
}

export async function getRepoConnection(params: { organizationId: string; userId: string; repoConnectionId: string }) {
  await requirePermission(params.organizationId, params.userId, 'repo.read');
  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');
  return connection;
}

export async function createRepoConnection(params: {
  organizationId: string;
  userId: string;
  owner: string;
  repo: string;
  defaultBranch?: string | null;
  pinnedCommitSha?: string | null;
}) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');
  enforceRateLimit(`repo-connect:${params.organizationId}`, REPO_RATE_LIMIT);

  const owner = params.owner.trim();
  const repo = params.repo.trim();
  validateOwnerRepo(owner, repo);

  if (params.pinnedCommitSha) {
    validateCommitSha(params.pinnedCommitSha);
  }

  // Ask GitHub before storing anything (no-op while GITHUB_MODE keeps us offline).
  const verified = await verifyAgainstGithub({
    owner,
    repo,
    defaultBranch: params.defaultBranch,
    commitSha: params.pinnedCommitSha ?? null,
  });

  const fullName = verified?.fullName ?? normalizeFullName(owner, repo);

  const count = await repoConnectionRepository.countActive(params.organizationId);
  if (count >= MAX_REPOS_PER_ORG) {
    throw AppError.badRequest(`Too many connected repos (max ${MAX_REPOS_PER_ORG}). Deactivate unused ones first.`);
  }

  const existing = await repoConnectionRepository.findByFullName(params.organizationId, fullName);
  if (existing) {
    throw AppError.conflict(`Repository ${fullName} is already connected.`, { fullName });
  }

  const connection = await db.$transaction(async (tx) => {
    const created = await repoConnectionRepository.create(
      {
        organizationId: params.organizationId,
        owner: verified?.owner ?? owner,
        repo: verified?.repo ?? repo,
        fullName,
        defaultBranch: verified?.defaultBranch ?? params.defaultBranch?.trim() ?? 'main',
        pinnedCommitSha: verified?.pinnedCommitSha ?? (params.pinnedCommitSha ? params.pinnedCommitSha.toLowerCase() : null),
        connectedById: params.userId,
      },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.connect',
        entityType: 'repo_connection',
        entityId: created.id,
        metadata: {
          fullName,
          owner,
          repo,
          defaultBranch: created.defaultBranch,
          pinnedCommitSha: created.pinnedCommitSha ?? null,
          provider: 'github',
          githubVerified: Boolean(verified),
          headShaAtConnect: verified?.headSha ?? null,
          notes: verified?.notes ?? [],
        },
      },
      tx,
    );
    return created;
  });

  return connection;
}

export async function updateRepoConnection(params: {
  organizationId: string;
  userId: string;
  repoConnectionId: string;
  defaultBranch?: string;
  isActive?: boolean;
}) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');
  enforceRateLimit(`repo-connect:${params.organizationId}`, REPO_RATE_LIMIT);

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');

  if (params.defaultBranch !== undefined) {
    const branch = params.defaultBranch.trim();
    if (branch.length === 0 || branch.length > 100) throw AppError.badRequest('Invalid branch name.');
    // Real mode: refuse a base branch GitHub has never heard of, instead of discovering it at PR time.
    if (githubMode() === 'real') {
      await checkRepoAccess({ owner: connection.owner, repo: connection.repo, defaultBranch: branch });
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await repoConnectionRepository.update(
      params.repoConnectionId,
      {
        ...(params.defaultBranch !== undefined ? { defaultBranch: params.defaultBranch.trim() } : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.update',
        entityType: 'repo_connection',
        entityId: result.id,
        metadata: { fullName: result.fullName, changes: { defaultBranch: params.defaultBranch, isActive: params.isActive } },
      },
      tx,
    );
    return result;
  });

  return updated;
}

export async function pinRepoCommit(params: {
  organizationId: string;
  userId: string;
  repoConnectionId: string;
  commitSha: string;
}) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');
  enforceRateLimit(`repo-connect:${params.organizationId}`, REPO_RATE_LIMIT);
  validateCommitSha(params.commitSha);

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');

  // The pin must be a commit that exists, and must be stored as a full SHA: GitHub's createRef — which
  // the PR path uses — rejects a 7-char abbreviation.
  const requested = params.commitSha.toLowerCase();
  let resolvedSha = requested;
  let commitMessage: string | null = null;
  if (githubMode() === 'real') {
    const commit = await resolveCommitSha({ owner: connection.owner, repo: connection.repo, ref: requested });
    resolvedSha = commit.sha;
    commitMessage = commit.message;
  }

  const pinned = await db.$transaction(async (tx) => {
    const result = await repoConnectionRepository.pinCommit(params.repoConnectionId, resolvedSha, tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.pin_commit',
        entityType: 'repo_connection',
        entityId: result.id,
        metadata: {
          fullName: result.fullName,
          previousSha: connection.pinnedCommitSha,
          newSha: result.pinnedCommitSha,
          requestedSha: requested,
          resolvedFromGithub: resolvedSha !== requested,
          commitMessage,
          pinnedAt: new Date().toISOString(),
        },
      },
      tx,
    );
    return result;
  });

  return pinned;
}

export async function deactivateRepoConnection(params: { organizationId: string; userId: string; repoConnectionId: string }) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');

  const deactivated = await db.$transaction(async (tx) => {
    const result = await repoConnectionRepository.deactivate(params.repoConnectionId, tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.deactivate',
        entityType: 'repo_connection',
        entityId: result.id,
        metadata: { fullName: result.fullName, deactivatedAt: new Date().toISOString() },
      },
      tx,
    );
    return result;
  });

  return deactivated;
}
