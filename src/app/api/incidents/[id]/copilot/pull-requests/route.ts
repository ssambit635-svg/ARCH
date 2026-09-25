import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { listPullRequests } from '@/server/services/verifiedFix.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(_request);
  const prs = await listPullRequests({ organizationId: organization.id, userId: user.id, incidentId: id });
  return ok(prs);
});
