import { db, type DbClient } from '@/lib/db';
import type { InvitationStatus, MembershipRole } from '@/generated/prisma/client';

export const invitationRepository = {
  upsertPending(
    data: { organizationId: string; email: string; role: MembershipRole; tokenHash: string; expiresAt: Date; invitedById: string },
    client: DbClient = db,
  ) {
    return client.invitation.upsert({
      where: { organizationId_email: { organizationId: data.organizationId, email: data.email } },
      update: { role: data.role, tokenHash: data.tokenHash, expiresAt: data.expiresAt, status: 'PENDING', acceptedAt: null, invitedById: data.invitedById },
      create: data,
    });
  },

  findByTokenHash(tokenHash: string, client: DbClient = db) {
    return client.invitation.findUnique({
      where: { tokenHash },
      include: { organization: { select: { id: true, name: true, slug: true } }, invitedBy: { select: { name: true, email: true } } },
    });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.invitation.findFirst({ where: { id, organizationId } });
  },

  list(organizationId: string, status: InvitationStatus | undefined, client: DbClient = db) {
    return client.invitation.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  },

  transitionStatus(
    id: string,
    from: InvitationStatus,
    to: InvitationStatus,
    acceptedAt: Date | null,
    client: DbClient = db,
  ) {
    return client.invitation.updateMany({
      where: { id, status: from },
      data: { status: to, acceptedAt },
    });
  },

  async expireStale(now: Date, client: DbClient = db) {
    return client.invitation.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: now } },
      data: { status: 'EXPIRED' },
    });
  },
};
