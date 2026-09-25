import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { rollbackModel } from '@/server/services/archModel.service';

/**
 * POST — roll back to the model version that served before the current one. OWNER/ADMIN.
 * Fully audited (`arch_model.activate` with reason "rollback").
 */
export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await rollbackModel({ organizationId: organization.id, userId: user.id }));
});
