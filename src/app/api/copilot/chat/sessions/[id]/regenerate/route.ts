import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { regenerateChatAnswer } from '@/server/services/archChat.service';

/**
 * POST — retry ARCH's last answer in this chat.
 *
 * The stored answer is rewritten in place (same row, same transcript shape) and the question is
 * re-answered against the workspace as it is right now. Same permission as sending a message
 * (`copilot.generate`), same per-organization rate limit, and the retry is audited with metadata
 * only — never the conversation text.
 */

type Context = { params: Promise<{ id: string }> };

export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return created(await regenerateChatAnswer({ organizationId: organization.id, userId: user.id, sessionId: id }));
});
