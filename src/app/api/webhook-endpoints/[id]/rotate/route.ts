import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { rotateEndpointSecret } from '@/server/services/webhook.service';

type Context = { params: Promise<{ id: string }> };

/** POST — rotate the signing secret (the old one stops working immediately). */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await rotateEndpointSecret({ organizationId: organization.id, userId: user.id, endpointId: id }));
});
