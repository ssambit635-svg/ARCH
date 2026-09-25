import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { activateModelVersion } from '@/server/services/archModel.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — put a specific registry version in service (manual promotion or rollback to any older
 * version). OWNER/ADMIN; a version from another organization returns 404. Fully audited.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await activateModelVersion({ organizationId: organization.id, userId: user.id, versionId: id, reason: 'manual' }));
});
