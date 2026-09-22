import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, parseQuery, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { serviceCreateSchema, paginationSchema } from '@/lib/validation';
import { createService, listServices } from '@/server/services/project.service';
import { z } from 'zod';

const listQuery = paginationSchema.extend({ projectId: z.string().trim().min(1).max(64).optional() });

export const GET = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  const query = parseQuery(listQuery, request.nextUrl.searchParams);
  return ok(await listServices({ organizationId: organization.id, userId: user.id, projectId: query.projectId }));
});

export const POST = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(serviceCreateSchema, await readJson(request));
  const service = await createService({
    organizationId: organization.id,
    userId: user.id,
    projectId: body.projectId,
    name: body.name,
    slug: body.slug,
    description: body.description ?? null,
    status: body.status,
    autoStatus: body.autoStatus,
  });
  return created(service);
});
