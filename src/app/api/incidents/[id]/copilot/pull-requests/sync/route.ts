import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { syncPullRequests } from '@/server/services/verifiedFix.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — Re-read every PR ARCH opened for this incident from GitHub and store OPEN/MERGED/CLOSED.
 *
 * Needs a live GITHUB_TOKEN (GITHUB_MODE=auto/real); in offline mode it answers 400 with the reason
 * instead of returning a stale state that looks fresh.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const result = await syncPullRequests({ organizationId: organization.id, userId: user.id, incidentId: id });
  return ok(result);
});
