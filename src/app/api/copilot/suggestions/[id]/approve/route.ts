import { handleRoute, ok, parseBody, readOptionalJson } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { copilotApproveSchema } from '@/lib/validation';
import { approveSuggestion } from '@/server/services/copilot.service';
import { revalidateOrganizationStatusPages } from '@/server/revalidate';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — approve a Copilot draft. OWNER/ADMIN/RESPONDER; VIEWER → 403.
 * Body (optional): { "text": "edited draft" } for summary / status update / postmortem drafts.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(copilotApproveSchema, await readOptionalJson(request));
  const suggestion = await approveSuggestion({ organizationId: organization.id, userId: user.id, suggestionId: id, text: body.text });
  await revalidateOrganizationStatusPages(organization.id);
  return ok(suggestion);
});
