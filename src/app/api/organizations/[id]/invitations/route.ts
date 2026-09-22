import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { inviteMemberSchema } from '@/lib/validation';
import { inviteMember, listInvitations } from '@/server/services/organization.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  return ok(await listInvitations({ organizationId: id, userId: user.id }));
});

/**
 * POST — invite someone by email.
 * Returns `inviteUrl` once: for invitees without an account yet, that link is how they join
 * (the notification email can only be queued for people who already have a user row).
 */
export const POST = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  const body = parseBody(inviteMemberSchema, await readJson(request));
  const result = await inviteMember({ organizationId: id, actorId: user.id, email: body.email, role: body.role });
  return created({ invitation: result.invitation, inviteUrl: result.inviteUrl, emailSent: result.emailSent });
});
