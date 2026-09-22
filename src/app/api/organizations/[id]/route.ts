import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { organizationUpdateSchema } from '@/lib/validation';
import { getOrganization, updateOrganization } from '@/server/services/organization.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  return ok(await getOrganization({ organizationId: id, userId: user.id }));
});

export const PATCH = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  const body = parseBody(organizationUpdateSchema, await request.json().catch(() => ({})));
  return ok(await updateOrganization({ organizationId: id, userId: user.id, name: body.name }));
});
