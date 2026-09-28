import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { setChatMessageFeedback } from '@/server/services/archChat.service';
import { z } from 'zod';

type Context = { params: Promise<{ id: string; messageId: string }> };

const schema = z.object({ rating: z.enum(['UP', 'DOWN']).nullable() });

/** One private usefulness rating per answer. PATCH with null removes it. */
export const PATCH = handleRoute<Context>(async (request, context) => {
  const { id: sessionId, messageId } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = schema.parse(await request.json());
  return ok(await setChatMessageFeedback({
    organizationId: organization.id,
    userId: user.id,
    sessionId,
    messageId,
    rating: body.rating,
  }));
});
