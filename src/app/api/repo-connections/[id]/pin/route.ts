import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { repoPinSchema } from '@/lib/validation';
import { pinRepoCommit } from '@/server/services/repo.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — Pin commit SHA for repo connection (OWNER/ADMIN).
 * Body: { commitSha }
 * M1: commit pinning — repo@commit checkout
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = repoPinSchema.parse(await request.json());
  const pinned = await pinRepoCommit({
    organizationId: organization.id,
    userId: user.id,
    repoConnectionId: id,
    commitSha: body.commitSha,
  });
  return ok(pinned);
});
