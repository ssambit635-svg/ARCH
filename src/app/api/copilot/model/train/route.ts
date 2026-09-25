import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { trainModel } from '@/server/services/archModel.service';

/** POST — retrain this organization's ARCH model on its resolved incidents now. OWNER/ADMIN. */
export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  return created(await trainModel({ organizationId: organization.id, userId: user.id }));
});
