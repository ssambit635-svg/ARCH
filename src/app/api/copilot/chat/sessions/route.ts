import { created, handleRoute, ok, parseBody } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { z } from 'zod';
import { createChatSession, deleteAllChatSessions, listChatSessions } from '@/server/services/archChat.service';

/**
 * Chat with ARCH — conversations.
 *
 * GET    list this member's conversations in the current workspace, newest first.
 * POST   open a new (empty) conversation. Sending a message without a session id creates one too,
 *        so the UI can start typing right away.
 * DELETE clear all of this member's conversations, in one request (the "shared my screen" escape
 *        hatch) — incidents, audit entries and the trained model are untouched.
 *
 * Conversations are personal: the service scopes every query by organization *and* user, so one
 * member's chat ids are invisible to another even inside the same workspace.
 */

const createSchema = z.object({ title: z.string().trim().max(60).optional() });

export const GET = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await listChatSessions({ organizationId: organization.id, userId: user.id }));
});

export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(createSchema, await request.json().catch(() => ({})));
  return created(await createChatSession({ organizationId: organization.id, userId: user.id, title: body.title ?? null }));
});

export const DELETE = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await deleteAllChatSessions({ organizationId: organization.id, userId: user.id }));
});
