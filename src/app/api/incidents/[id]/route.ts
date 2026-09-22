import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { incidentUpdateSchema } from '@/lib/validation';
import { getIncident, updateIncident } from '@/server/services/incident.service';
import { revalidateOrganizationStatusPages } from '@/server/revalidate';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await getIncident({ organizationId: organization.id, userId: user.id, incidentId: id }));
});

/** PATCH — status transitions are validated against the incident state machine. */
export const PATCH = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(incidentUpdateSchema, await readJson(request));

  const incident = await updateIncident({
    organizationId: organization.id,
    userId: user.id,
    incidentId: id,
    input: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
      ...(body.serviceId !== undefined ? { serviceId: body.serviceId } : {}),
      ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
      ...(body.message !== undefined ? { message: body.message } : {}),
    },
  });

  await revalidateOrganizationStatusPages(organization.id);
  return ok(incident);
});
