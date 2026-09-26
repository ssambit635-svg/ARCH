import { created, handleRoute, parseBody } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { askArch } from '@/server/services/copilot.service';
import { z } from 'zod';

const schema = z.object({ question: z.string().trim().min(2, 'Ask a question first.').max(800) });

type Context = { params: Promise<{ id: string }> };

/**
 * POST — Ask ARCH a natural-language question about this incident.
 *
 * Handled entirely by ARCH's native engine (no language model, no network, no cost). Answers are
 * grounded on the timeline, retrieved runbook passages, and similar past incidents. Nothing is
 * persisted — each call is a fresh read over the current state.
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(schema, await request.json());
  const result = await askArch({ organizationId: organization.id, userId: user.id, incidentId: id, question: body.question });
  return created(result);
});
