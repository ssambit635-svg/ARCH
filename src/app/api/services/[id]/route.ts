import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { serviceUpdateSchema } from '@/lib/validation';
import { deleteService, updateService } from '@/server/services/project.service';

type Context = { params: Promise<{ id: string }> };

export const PATCH = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(serviceUpdateSchema, await readJson(request));
  return ok(
    await updateService({
      organizationId: organization.id,
      userId: user.id,
      serviceId: id,
      name: body.name,
      description: body.description,
      status: body.status,
      autoStatus: body.autoStatus,
    }),
  );
});

export const DELETE = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await deleteService({ organizationId: organization.id, userId: user.id, serviceId: id }));
});
