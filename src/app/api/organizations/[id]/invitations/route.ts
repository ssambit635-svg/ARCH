import type { NextRequest } from 'next/server';
import { created, handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { inviteMemberSchema } from '@/lib/validation';
import { inviteMember, listInvitations } from '@/server/services/organization.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  const invitations = await listInvitations({ organizationId: id, userId: user.id });
  return ok(
    invitations.map(({ id: invitationId, email, role, status, expiresAt, acceptedAt, createdAt }) => ({
      id: invitationId,
      email,
      role,
      status,
      expiresAt,
      acceptedAt,
      createdAt,
    })),
  );
});

/**
 * POST — invite someone by email.
 * For an invitee without an account, return the absolute one-time link once. If an email is queued,
 * report that state without returning the raw link; never serialize the stored token hash.
 */
export const POST = handleRoute<Context>(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  const body = parseBody(inviteMemberSchema, await readJson(request));
  const result = await inviteMember({ organizationId: id, actorId: user.id, email: body.email, role: body.role });
  const { id: invitationId, email, role, status, expiresAt, acceptedAt, createdAt } = result.invitation;
  return created({
    invitation: { id: invitationId, email, role, status, expiresAt, acceptedAt, createdAt },
    emailQueued: result.emailQueued,
    ...(result.emailQueued ? {} : { inviteUrl: result.inviteUrl }),
  });
});
