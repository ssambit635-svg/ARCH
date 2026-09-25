import { handleRoute, ok, parseQuery } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { copilotSuggestionListQuerySchema } from '@/lib/validation';
import { listSuggestions } from '@/server/services/copilot.service';

type Context = { params: Promise<{ id: string }> };

/** GET — Copilot drafts for an incident, newest first. `?status=PENDING` for the review queue. */
export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const query = parseQuery(copilotSuggestionListQuerySchema, request.nextUrl.searchParams);
  return ok(await listSuggestions({ organizationId: organization.id, userId: user.id, incidentId: id, status: query.status }));
});
