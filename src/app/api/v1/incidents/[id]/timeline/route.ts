import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, parseQuery, readJson } from '@/lib/api';
import { publicContext } from '@/lib/public-auth';
import { incidentEventCreateSchema, paginationSchema } from '@/lib/validation';
import { addIncidentComment, listIncidentEvents } from '@/server/services/incident.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await publicContext(request, 'incident.read');
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

