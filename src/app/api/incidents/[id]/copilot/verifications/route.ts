import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { listVerifications } from '@/server/services/verifiedFix.service';

type Context = { params: Promise<{ id: string }> };

/**
 * GET — List fix verifications for an incident (diff + test results + evidence bundle)
 * M4 UI needs this.
 */
export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(_request);
  const verifications = await listVerifications({ organizationId: organization.id, userId: user.id, incidentId: id });
  return ok(verifications);
});
