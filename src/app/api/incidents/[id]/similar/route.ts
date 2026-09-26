import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';

type Context = { params: Promise<{ id: string }> };
import { similarIncidentsQuerySchema } from '@/lib/validation';
import { similarIncidents } from '@/server/services/insights.service';

/**
 * V6 — "have we seen this before?"
 *
 * Similar past incidents (with what fixed them) plus runbook passages, retrieved with the same
 * dense + sparse retrieval the Copilot uses.
 */
export const GET = handleRoute(async (request, context: Context) => {
  const { user, organization } = await requireApiContext(request);
  const { id } = await context.params;
  const url = new URL(request.url);
  const query = similarIncidentsQuerySchema.parse({
    incidentId: id,
    q: url.searchParams.get('q') ?? undefined,
    k: url.searchParams.get('k') ?? undefined,
  });
  return ok(
    await similarIncidents({
      organizationId: organization.id,
      userId: user.id,
      incidentId: query.incidentId,
      query: query.q,
      k: query.k,
    }),
  );
});
