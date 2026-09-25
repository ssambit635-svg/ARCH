import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { dismissSuggestion } from '@/server/services/copilot.service';

type Context = { params: Promise<{ id: string }> };

/** POST — dismiss a Copilot draft. Removed from the pending list; the record stays for audit. */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await dismissSuggestion({ organizationId: organization.id, userId: user.id, suggestionId: id }));
});
