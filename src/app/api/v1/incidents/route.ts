import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, parseQuery, readJson } from '@/lib/api';
import { publicContext } from '@/lib/public-auth';
import { incidentCreateSchema, incidentListQuerySchema } from '@/lib/validation';
import { createIncident, listIncidents } from '@/server/services/incident.service';
import { revalidateOrganizationStatusPages } from '@/server/revalidate';

/** GET /api/incidents — filtered, paginated, always scoped to one organization. */
export const GET = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await publicContext(request, 'incident.read');
  const query = parseQuery(incidentListQuerySchema, request.nextUrl.searchParams);

  const result = await listIncidents({
    organizationId: organization.id,
    userId: user.id,
    page: query.page,
    pageSize: query.pageSize,
    filters: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.q ? { q: query.q } : {}),
      ...(query.open !== undefined ? { open: query.open } : {}),
    },
  });

  return ok(result);
});

/** POST /api/incidents — open an incident (RESPONDER+). */
export const POST = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await publicContext(request, 'incident.write');
  const body = parseBody(incidentCreateSchema, await readJson(request));

  const incident = await createIncident({
    organizationId: organization.id,
    userId: user.id,
    source: 'API',
    input: {
      title: body.title,
      description: body.description ?? null,
      severity: body.severity,
      projectId: body.projectId,
      serviceId: body.serviceId ?? null,
      assignedToId: body.assignedToId ?? null,
      startedAt: body.startedAt ?? null,
    },
  });

  await revalidateOrganizationStatusPages(organization.id);
  return created(incident);
});
