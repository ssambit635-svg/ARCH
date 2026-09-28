import { handleRoute, ok, parseBody, parseQuery } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { z } from 'zod';
import { clearChatMemory, getChatMemory, updateChatMemory } from '@/server/services/archChat.service';

/**
 * ARCH's memory about the caller — read it, edit it, or forget everything.
 *
 * This is the honest half of "I will remember that": the facts ARCH actually stored are visible,
 * correctable and deletable by the member they belong to, and never shared with anyone else in the
 * workspace. Reading needs `copilot.read`; changing needs `copilot.generate`.
 */

const patchSchema = z.object({
  notes: z.object({ add: z.string().max(240).optional(), remove: z.string().max(240).optional() }).optional(),
  userName: z.string().max(60).nullable().optional(),
  userRole: z.string().max(60).nullable().optional(),
  clearStack: z.boolean().optional(),
});

const querySchema = z.object({ summary: z.string().optional() });

export const GET = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const query = parseQuery(querySchema, new URL(request.url).searchParams);
  const memory = await getChatMemory({ organizationId: organization.id, userId: user.id });
  if (query.summary === 'true') return ok({ summary: memory.summary, hasFacts: memory.hasFacts });
  return ok(memory);
});

export const PATCH = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const body = parseBody(patchSchema, await request.json());
  return ok(await updateChatMemory({ organizationId: organization.id, userId: user.id, ...body }));
});

export const DELETE = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await clearChatMemory({ organizationId: organization.id, userId: user.id }));
});
