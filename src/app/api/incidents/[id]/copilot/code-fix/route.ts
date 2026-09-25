import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { copilotCodeFixSchema } from '@/lib/validation';
import { generateSuggestion } from '@/server/services/copilot.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — ARCH Copilot code fix: diagnosis + suggested fix for a stack trace / snippet.
 * Body (optional): { "attachment": "<stack trace or code>" }. Without it, errors and code found in
 * the incident timeline are used. OWNER/ADMIN/RESPONDER. Returns a PENDING draft.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = copilotCodeFixSchema.parse(await request.json().catch(() => ({})));
  const suggestion = await generateSuggestion({ organizationId: organization.id, userId: user.id, incidentId: id, type: 'CODE_FIX', attachment: body.attachment });
  return created(suggestion);
});
