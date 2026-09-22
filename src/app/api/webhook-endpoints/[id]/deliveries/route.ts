import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseQuery } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { paginationSchema } from '@/lib/validation';
import { listDeliveries } from '@/server/services/webhook.service';

type Context = { params: Promise<{ id: string }> };

/** GET — delivery log for one endpoint (accepted / duplicate / rejected / failed). */
export const GET = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const query = parseQuery(paginationSchema, request.nextUrl.searchParams);
  return ok(
    await listDeliveries({
      organizationId: organization.id,
      userId: user.id,
      endpointId: id,
      page: query.page,
      pageSize: query.pageSize,
    }),
  );
});
