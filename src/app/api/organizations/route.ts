import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { organizationCreateSchema } from '@/lib/validation';
import { createOrganization, listOrganizations } from '@/server/services/organization.service';

/** GET /api/organizations — every organization the caller belongs to. */
export const GET = handleRoute(async () => {
  const user = await requireUser();
  return ok(await listOrganizations(user.id));
});

/** POST /api/organizations — create one; the creator becomes OWNER. */
export const POST = handleRoute(async (request: NextRequest) => {
  const user = await requireUser();
  const body = parseBody(organizationCreateSchema, await readJson(request));
  const organization = await createOrganization({ userId: user.id, name: body.name, slug: body.slug });
  return created({ id: organization.id, name: organization.name, slug: organization.slug });
});
