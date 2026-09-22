import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { statusPageUpdateSchema } from '@/lib/validation';
import { deleteStatusPage, getStatusPage, updateStatusPage } from '@/server/services/statusPage.service';
import { revalidateOrganizationStatusPages } from '@/server/revalidate';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await getStatusPage({ organizationId: organization.id, userId: user.id, statusPageId: id }));
});

export const PATCH = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(statusPageUpdateSchema, await readJson(request));
  const page = await updateStatusPage({
    organizationId: organization.id,
    userId: user.id,
    statusPageId: id,
    name: body.name,
    description: body.description,
    serviceIds: body.serviceIds,
  });
  await revalidateOrganizationStatusPages(organization.id);
  return ok(page);
});

export const DELETE = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const result = await deleteStatusPage({ organizationId: organization.id, userId: user.id, statusPageId: id });
  await revalidateOrganizationStatusPages(organization.id);
  return ok(result);
});
