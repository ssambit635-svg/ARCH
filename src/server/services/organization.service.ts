import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { randomToken, sha256 } from '@/lib/crypto';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { organizationRepository } from '../repositories/organization.repository';
import { invitationRepository } from '../repositories/invitation.repository';
import { userRepository } from '../repositories/user.repository';
import { uniqueOrganizationSlug } from './slug.service';
import { enqueueInvitationNotification, renderInvitation } from './notification.service';
import type { MembershipRole } from '@/generated/prisma/client';

/**
 * Organizations, members and invitations.
 *
 * Ownership rules that keep a tenant from becoming unmanageable:
 *  - the creator of an organization is its OWNER;
 *  - the last OWNER cannot be demoted or removed;
 *  - only an OWNER may grant the OWNER role.
 */

export const INVITATION_TTL_DAYS = 7;

export async function createOrganization(params: { userId: string; name: string; slug?: string }) {
  const slug = params.slug ?? (await uniqueOrganizationSlug(params.name));

  return db.$transaction(async (tx) => {
    const existing = await organizationRepository.findBySlug(slug, tx);
    if (existing) throw AppError.conflict('That slug is already taken.');

    const organization = await organizationRepository.createWithOwner(
      { name: params.name, slug, ownerId: params.userId },
      tx,
    );

    await writeAudit(
      {
        organizationId: organization.id,
        actorId: params.userId,
        action: 'organization.create',
        entityType: 'organization',
        entityId: organization.id,
        metadata: { name: organization.name, slug: organization.slug },
      },
      tx,
    );

    return organization;
  });
}

export async function listOrganizations(userId: string) {
  const memberships = await organizationRepository.listForUser(userId);
  return memberships.map((membership) => ({ ...membership.organization, role: membership.role }));
}

export async function getOrganization(params: { organizationId: string; userId: string }) {
  const membership = await requirePermission(params.organizationId, params.userId, 'org.read');
  const organization = await organizationRepository.findById(params.organizationId);
  if (!organization) throw AppError.notFound('Organization not found.');
  return { ...organization, role: membership.role };
}

export async function updateOrganization(params: { organizationId: string; userId: string; name: string }) {
  await requirePermission(params.organizationId, params.userId, 'org.settings');

  return db.$transaction(async (tx) => {
    const organization = await organizationRepository.update(params.organizationId, { name: params.name }, tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'organization.update',
        entityType: 'organization',
        entityId: params.organizationId,
        metadata: { name: params.name },
      },
      tx,
    );
    return organization;
  });
}

export async function listMembers(params: { organizationId: string; userId: string }) {
  await requirePermission(params.organizationId, params.userId, 'member.read');
  const members = await organizationRepository.listMembers(params.organizationId);
  return members.map((membership) => ({
    userId: membership.userId,
    role: membership.role,
    createdAt: membership.createdAt,
    user: membership.user,
  }));
}

export async function changeMemberRole(params: {
  organizationId: string;
  actorId: string;
  targetUserId: string;
  role: MembershipRole;
}) {
  const actor = await requirePermission(params.organizationId, params.actorId, 'member.manage');

  const target = await organizationRepository.findMembership(params.organizationId, params.targetUserId);
  if (!target) throw AppError.notFound('Member not found in this organization.');

  if (params.role === 'OWNER' && actor.role !== 'OWNER') {
    throw AppError.forbidden('Only an OWNER can grant the OWNER role.');
  }

  if (target.role === 'OWNER' && params.role !== 'OWNER') {
    const owners = await organizationRepository.countOwners(params.organizationId);
    if (owners <= 1) throw AppError.conflict('An organization must keep at least one OWNER.');
  }

  return db.$transaction(async (tx) => {
    const membership = await organizationRepository.updateMemberRole(params.organizationId, params.targetUserId, params.role, tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: 'member.role_change',
        entityType: 'membership',
        entityId: membership.id,
        metadata: { userId: params.targetUserId, from: target.role, to: params.role },
      },
      tx,
    );
    return membership;
  });
}

export async function removeMember(params: { organizationId: string; actorId: string; targetUserId: string }) {
  const actor = await requirePermission(params.organizationId, params.actorId, 'member.manage');
  const target = await organizationRepository.findMembership(params.organizationId, params.targetUserId);
  if (!target) throw AppError.notFound('Member not found in this organization.');

  if (target.role === 'OWNER') {
    const owners = await organizationRepository.countOwners(params.organizationId);
    if (owners <= 1) throw AppError.conflict('An organization must keep at least one OWNER.');
    if (actor.role !== 'OWNER' && actor.userId !== params.targetUserId) {
      throw AppError.forbidden('Only an OWNER can remove another OWNER.');
    }
  }

  return db.$transaction(async (tx) => {
    await organizationRepository.removeMember(params.organizationId, params.targetUserId, tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: 'member.remove',
        entityType: 'membership',
        entityId: target.id,
        metadata: { userId: params.targetUserId, role: target.role },
      },
      tx,
    );
    return { userId: params.targetUserId };
  });
}

/**
 * Invite someone by email.
 *
 * The raw token is generated here, hashed for storage and returned once so it can be put in the
 * email — and, for people who do not have an ARCH account yet, shown to the inviter so it can be
 * shared out of band.
 */
export async function inviteMember(params: {
  organizationId: string;
  actorId: string;
  email: string;
  role: MembershipRole;
}) {
  await requirePermission(params.organizationId, params.actorId, 'member.manage');
  const email = params.email.toLowerCase();

  const [organization, existingUser] = await Promise.all([
    organizationRepository.findById(params.organizationId),
    userRepository.findByEmail(email),
  ]);
  if (!organization) throw AppError.notFound('Organization not found.');

  if (existingUser) {
    const existingMembership = await organizationRepository.findMembership(params.organizationId, existingUser.id);
    if (existingMembership) throw AppError.conflict('That person is already a member.');
  }

  const token = randomToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await db.$transaction(async (tx) => {
    const created = await invitationRepository.upsertPending(
      { organizationId: params.organizationId, email, role: params.role, tokenHash, expiresAt, invitedById: params.actorId },
      tx,
    );

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: 'member.invite',
        entityType: 'invitation',
        entityId: created.id,
        metadata: { email, role: params.role },
      },
      tx,
    );
    return created;
  });

  if (existingUser) {
    const inviter = await userRepository.findById(params.actorId);
    const message = renderInvitation({
      organizationName: organization.name,
      invitedByLabel: inviter?.name ?? inviter?.email ?? 'An administrator',
      role: params.role,
      token,
      expiresAt,
    });
    await enqueueInvitationNotification({
      organizationId: params.organizationId,
      recipientId: existingUser.id,
      subject: message.subject,
      body: message.body,
    });
  }

  return {
    invitation,
    inviteUrl: `/invite/${token}`,
    emailSent: Boolean(existingUser),
  };
}

export async function listInvitations(params: { organizationId: string; userId: string }) {
  await requirePermission(params.organizationId, params.userId, 'member.read');
  await invitationRepository.expireStale(new Date());
  return invitationRepository.list(params.organizationId, undefined);
}

export async function revokeInvitation(params: { organizationId: string; actorId: string; invitationId: string }) {
  await requirePermission(params.organizationId, params.actorId, 'member.manage');
  const invitation = await invitationRepository.findById(params.organizationId, params.invitationId);
  if (!invitation) throw AppError.notFound('Invitation not found.');

  return db.$transaction(async (tx) => {
    const updated = await invitationRepository.setStatus(invitation.id, 'REVOKED', null, tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: 'member.invite_revoke',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: { email: invitation.email },
      },
      tx,
    );
    return updated;
  });
}

/** Public preview for the accept page — no session required, no member data exposed. */
export async function getInvitationPreview(token: string) {
  const invitation = await invitationRepository.findByTokenHash(sha256(token));
  if (!invitation) throw AppError.notFound('This invitation link is not valid.');

  const expired = invitation.expiresAt.getTime() < Date.now();
  return {
    email: invitation.email,
    role: invitation.role,
    status: expired && invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status,
    organization: { name: invitation.organization.name, slug: invitation.organization.slug },
    invitedBy: invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? null,
    expiresAt: invitation.expiresAt,
  };
}

/** Accept an invitation: the signed-in email must match the invited email. */
export async function acceptInvitation(params: { token: string; userId: string; userEmail: string }) {
  const invitation = await invitationRepository.findByTokenHash(sha256(params.token));
  if (!invitation) throw AppError.notFound('This invitation link is not valid.');
  if (invitation.status === 'ACCEPTED') throw AppError.conflict('This invitation has already been accepted.');
  if (invitation.status !== 'PENDING') throw AppError.conflict('This invitation is no longer valid.');
  if (invitation.expiresAt.getTime() < Date.now()) {
    await invitationRepository.setStatus(invitation.id, 'EXPIRED', null);
    throw AppError.conflict('This invitation has expired.');
  }
  if (invitation.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    throw AppError.forbidden('This invitation was sent to a different email address.');
  }

  return db.$transaction(async (tx) => {
    const existing = await organizationRepository.findMembership(invitation.organizationId, params.userId, tx);
    if (!existing) {
      await organizationRepository.addMember(invitation.organizationId, params.userId, invitation.role, tx);
    }
    await invitationRepository.setStatus(invitation.id, 'ACCEPTED', new Date(), tx);
    await writeAudit(
      {
        organizationId: invitation.organizationId,
        actorId: params.userId,
        action: 'member.join',
        entityType: 'membership',
        entityId: invitation.id,
        metadata: { role: invitation.role, via: 'invitation' },
      },
      tx,
    );
    return { organizationId: invitation.organizationId, role: invitation.role };
  });
}
