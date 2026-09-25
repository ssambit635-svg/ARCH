import { created, handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { repoConnectionCreateSchema, repoConnectionListQuerySchema } from '@/lib/validation';
import { createRepoConnection, listRepoConnections } from '@/server/services/repo.service';

/**
 * GET — List repo connections for caller's organization (or ?organizationId= for admin).
 * POST — Connect a GitHub repo (OWNER/ADMIN). Body: { owner, repo, defaultBranch?, pinnedCommitSha? }
 * M1: GitHub repo connect + org permission + commit pinning
 */
export const GET = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const url = new URL(request.url);
  const query = repoConnectionListQuerySchema.parse({
    organizationId: url.searchParams.get('organizationId') ?? undefined,
    includeInactive: url.searchParams.get('includeInactive') ?? undefined,
  });
  // Always scoped to caller's org; query.organizationId is ignored unless same org (prevent cross-tenant probe)
  const orgId = query.organizationId && query.organizationId === organization.id ? query.organizationId : organization.id;
  const connections = await listRepoConnections({ organizationId: orgId, userId: user.id, includeInactive: query.includeInactive });
  return ok(connections);
});

export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const body = repoConnectionCreateSchema.parse(await request.json());
  const connection = await createRepoConnection({
    organizationId: organization.id,
    userId: user.id,
    owner: body.owner,
    repo: body.repo,
    defaultBranch: body.defaultBranch,
    pinnedCommitSha: body.pinnedCommitSha ?? null,
  });
  return created(connection);
});
