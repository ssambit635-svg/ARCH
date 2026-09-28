import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { z } from 'zod';
import { CHAT_LIMITS } from '@/server/ai/arch-model/chat';
import { sendChatMessage } from '@/server/services/archChat.service';

/**
 * POST — one turn of a conversation: the human's message and ARCH's answer, both persisted.
 *
 * The native engine answers from the workspace snapshot and local retrieval — no LLM call, no
 * hybrid mode, no vendor. Chat data never leaves this server. Rate limited per organization like
 * other Copilot APIs.
 */

const schema = z.object({
  content: z.string().trim().min(2).max(CHAT_LIMITS.maxQuestionChars),
});

type Context = { params: Promise<{ id: string }> };

export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = schema.parse(await request.json());
  return created(await sendChatMessage({ organizationId: organization.id, userId: user.id, sessionId: id, content: body.content }));
});
