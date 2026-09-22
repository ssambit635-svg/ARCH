import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { webhookEndpointUpdateSchema } from '@/lib/validation';
import { deleteEndpoint, updateEndpoint } from '@/server/services/webhook.service';

type Context = { params: Promise<{ id: string }> };

export const PATCH = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(webhookEndpointUpdateSchema, await readJson(request));
  return ok(
    await updateEndpoint({
      organizationId: organization.id,
      userId: user.id,
      endpointId: id,
      description: body.description,
      isActive: body.isActive,
      projectId: body.projectId,
      serviceId: body.serviceId,
    }),
  );
});

export const DELETE = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await deleteEndpoint({ organizationId: organization.id, userId: user.id, endpointId: id }));
});
