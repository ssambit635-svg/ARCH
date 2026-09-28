import { handleRoute, ok, parseBody } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { z } from 'zod';
import { deleteChatSession, getChatSession, renameChatSession } from '@/server/services/archChat.service';

/**
 * One conversation: read the transcript, rename it, or delete it.
 *
 * A session id that belongs to another member or another workspace answers 404 — the same answer as
 * an id that never existed, so chat ids cannot be probed.
 */

const renameSchema = z.object({ title: z.string().trim().min(1).max(60) });

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await getChatSession({ organizationId: organization.id, userId: user.id, sessionId: id }));
});

export const PATCH = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(renameSchema, await request.json());
  return ok(await renameChatSession({ organizationId: organization.id, userId: user.id, sessionId: id, title: body.title }));
});

export const DELETE = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  return ok(await deleteChatSession({ organizationId: organization.id, userId: user.id, sessionId: id }));
});
