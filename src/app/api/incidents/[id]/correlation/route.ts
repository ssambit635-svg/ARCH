import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';

type Context = { params: Promise<{ id: string }> };
import { incidentCorrelation } from '@/server/services/insights.service';

/**
 * V7 — incident correlation & dedup: "is this a repeat, and is it the same root cause?"
 *
 * Groups incidents by their content fingerprint (same alert signature, even when the title
 * carries fresh numbers/hosts each time) and reports the strongest available root-cause evidence:
 * a resolved fingerprint twin first, otherwise a same-failure-family hypothesis. Read-only.
 */
export const GET = handleRoute(async (request, context: Context) => {
  const { user, organization } = await requireApiContext(request);
  const { id } = await context.params;
  return ok(await incidentCorrelation({ organizationId: organization.id, userId: user.id, incidentId: id }));
});
