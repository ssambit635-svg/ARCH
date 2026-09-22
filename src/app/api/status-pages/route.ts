import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { statusPageCreateSchema } from '@/lib/validation';
import { createStatusPage, listStatusPages } from '@/server/services/statusPage.service';

export const GET = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await listStatusPages({ organizationId: organization.id, userId: user.id }));
});

export const POST = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(statusPageCreateSchema, await readJson(request));
  const page = await createStatusPage({
    organizationId: organization.id,
    userId: user.id,
    name: body.name,
    slug: body.slug,
    description: body.description ?? null,
    serviceIds: body.serviceIds,
  });
  return created(page);
});
