import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { generateSuggestion } from '@/server/services/copilot.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — ARCH Copilot postmortem draft (Timeline / Impact / Root cause / Action items).
 * OWNER/ADMIN/RESPONDER. Returns a PENDING draft; nothing is applied until a human approves it.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const suggestion = await generateSuggestion({ organizationId: organization.id, userId: user.id, incidentId: id, type: 'POSTMORTEM' });
  return created(suggestion);
});
