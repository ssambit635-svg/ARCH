import type { NextRequest } from 'next/server';
import { handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { updateMemberRoleSchema } from '@/lib/validation';
import { changeMemberRole, removeMember } from '@/server/services/organization.service';
import { revalidatePath } from 'next/cache';

type Context = { params: Promise<{ id: string; userId: string }> };

/** PATCH — change a member's role (ADMIN+; granting OWNER is OWNER-only). */
export const PATCH = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id, userId } = await context.params;
  const user = await requireUser();
  const body = parseBody(updateMemberRoleSchema, await readJson(request));
  const membership = await changeMemberRole({ organizationId: id, actorId: user.id, targetUserId: userId, role: body.role });
  try {
    revalidatePath('/dashboard/settings');
  } catch {
    /* outside a request context */
  }
  return ok({ userId: membership.userId, role: membership.role });
});

/** DELETE — remove a member (ADMIN+; the last OWNER is protected). */
export const DELETE = handleRoute<Context>(async (_request, context) => {
  const { id, userId } = await context.params;
  const user = await requireUser();
  const result = await removeMember({ organizationId: id, actorId: user.id, targetUserId: userId });
  return ok(result);
});
