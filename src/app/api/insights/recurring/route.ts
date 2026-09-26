import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { recurringQuerySchema } from '@/lib/validation';
import { recurringReport } from '@/server/services/insights.service';

/**
 * V6 — recurring failures: the failure categories that keep coming back, with the fix that worked
 * last time. Turns a pile of resolved incidents into an engineering backlog.
 */
export const GET = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const url = new URL(request.url);
  const query = recurringQuerySchema.parse({ sinceDays: url.searchParams.get('sinceDays') ?? undefined });
  return ok(await recurringReport({ organizationId: organization.id, userId: user.id, sinceDays: query.sinceDays }));
});
