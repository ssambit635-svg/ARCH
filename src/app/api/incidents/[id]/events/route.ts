import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, parseQuery, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { incidentEventCreateSchema, paginationSchema } from '@/lib/validation';
import { addIncidentComment, listIncidentEvents } from '@/server/services/incident.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const query = parseQuery(paginationSchema, request.nextUrl.searchParams);
  return ok(
    await listIncidentEvents({
      organizationId: organization.id,
      userId: user.id,
      incidentId: id,
      page: query.page,
      pageSize: query.pageSize,
    }),
  );
});

/** POST — append a timeline entry (comment). Status/assignment changes get their own events. */
export const POST = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(incidentEventCreateSchema, await readJson(request));

  const incident = await addIncidentComment({
    organizationId: organization.id,
    userId: user.id,
    incidentId: id,
    body: body.body,
    metadata: body.metadata,
  });
  return created(incident);
});
