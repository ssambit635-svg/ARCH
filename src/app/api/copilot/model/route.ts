import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { getModelStatus } from '@/server/services/archModel.service';

/** GET — status of this organization's ARCH model (version, training data, accuracy). */
export const GET = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await getModelStatus({ organizationId: organization.id, userId: user.id }));
});
