import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, parseQuery, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { projectCreateSchema, paginationSchema } from '@/lib/validation';
import { createProject, listProjects } from '@/server/services/project.service';
import { z } from 'zod';

const listQuery = paginationSchema.extend({ q: z.string().trim().max(80).optional() });

/** GET /api/projects?organizationId=... — projects of the caller's organization. */
export const GET = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  const query = parseQuery(listQuery, request.nextUrl.searchParams);
  return ok(await listProjects({ organizationId: organization.id, userId: user.id, q: query.q }));
});

export const POST = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(projectCreateSchema, await readJson(request));
  const project = await createProject({
    organizationId: organization.id,
    userId: user.id,
    name: body.name,
    slug: body.slug,
    description: body.description ?? null,
  });
  return created(project);
});
