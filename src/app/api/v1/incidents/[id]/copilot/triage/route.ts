import { created, handleRoute } from '@/lib/api';
import { publicContext } from '@/lib/public-auth';
import { generateSuggestion } from '@/server/services/copilot.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — ARCH Copilot triage suggestion: { severity, assigneeId? }.
 * OWNER/ADMIN/RESPONDER. Returns a PENDING draft; nothing is applied until a human approves it.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await publicContext(request, 'copilot.generate');
  const suggestion = await generateSuggestion({ organizationId: organization.id, userId: user.id, incidentId: id, type: 'TRIAGE' });
  return created(suggestion);
});
