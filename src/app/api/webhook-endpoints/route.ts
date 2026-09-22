import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { webhookEndpointCreateSchema } from '@/lib/validation';
import { createEndpoint, listEndpoints } from '@/server/services/webhook.service';

export const GET = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await listEndpoints({ organizationId: organization.id, userId: user.id }));
});

/** POST — returns the signing secret exactly once; only a hash plus an encrypted copy are stored. */
export const POST = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(webhookEndpointCreateSchema, await readJson(request));
  const result = await createEndpoint({
    organizationId: organization.id,
    userId: user.id,
    provider: body.provider,
    projectId: body.projectId,
    serviceId: body.serviceId ?? null,
    description: body.description ?? null,
  });
  return created({ endpoint: result.endpoint, secret: result.secret, url: result.url });
});
