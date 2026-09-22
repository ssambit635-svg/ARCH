import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { projectUpdateSchema } from '@/lib/validation';
import { deleteProject, getProject, updateProject } from '@/server/services/project.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await getProject({ organizationId: organization.id, userId: user.id, projectId: id }));
});

export const PATCH = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(projectUpdateSchema, await readJson(request));
  return ok(
    await updateProject({
      organizationId: organization.id,
      userId: user.id,
      projectId: id,
      name: body.name,
      description: body.description,
    }),
  );
});

export const DELETE = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await deleteProject({ organizationId: organization.id, userId: user.id, projectId: id }));
});
