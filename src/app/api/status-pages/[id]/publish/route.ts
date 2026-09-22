import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { statusPagePublishSchema } from '@/lib/validation';
import { setStatusPagePublished } from '@/server/services/statusPage.service';
import { revalidateOrganizationStatusPages } from '@/server/revalidate';

type Context = { params: Promise<{ id: string }> };

/** POST /api/status-pages/:id/publish — publish/unpublish (ADMIN+), then bust the public cache. */
export const POST = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(statusPagePublishSchema, await readJson(request));

  const page = await setStatusPagePublished({
    organizationId: organization.id,
    userId: user.id,
    statusPageId: id,
    isPublished: body.isPublished,
  });

  await revalidateOrganizationStatusPages(organization.id);
  return ok(page);
});
