import { created, handleRoute, parseBody } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { askArch } from '@/server/services/copilot.service';
import { z } from 'zod';

const schema = z.object({
  question: z.string().trim().min(2, 'Ask a question first.').max(800),
  /** Recent conversation turns, so follow-ups ("aur phir?", "what about the db?") resolve. */
  history: z
    .array(z.object({ question: z.string().max(800), answer: z.string().max(4000) }))
    .max(6)
    .optional(),
});

type Context = { params: Promise<{ id: string }> };

/**
 * POST — Ask ARCH a natural-language question about this incident.
 *
 * Handled entirely by ARCH's native engine (no language model, no network, no cost). Answers are
 * grounded on the timeline, retrieved runbook passages, and similar past incidents. The engine
 * also chats (greetings, thanks, capabilities) and works through described ops problems step by
 * step — it advises, it never writes code. Nothing is persisted; `history` is the caller's own
 * recent turns, used only to understand follow-ups.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(schema, await request.json());
  const result = await askArch({ organizationId: organization.id, userId: user.id, incidentId: id, question: body.question, history: body.history });
  return created(result);
});
