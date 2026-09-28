import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { z } from 'zod';
import { CHAT_LIMITS } from '@/server/ai/arch-model/chat';
import { sendChatMessage } from '@/server/services/archChat.service';

/**
 * POST — one turn of a conversation: the human's message and ARCH's answer, both persisted.
 *
 * The answer is produced by ARCH's native engine on this server (no vendor, no tokens, no
 * network): workspace counts, the open queue, recent history, the knowledge base and the ARCH
 * model's own similarity search over past incidents. Rate limited per organization like every
 * other Copilot surface.
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
