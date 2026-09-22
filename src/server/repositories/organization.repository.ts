import { db, type DbClient } from '@/lib/db';
import type { MembershipRole } from '@/generated/prisma/client';

export const organizationRepository = {
  createWithOwner(data: { name: string; slug: string; ownerId: string }, client: DbClient = db) {
    return client.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        memberships: { create: { userId: data.ownerId, role: 'OWNER' } },
      },
      include: { memberships: true },
    });
  },

  findById(id: string, client: DbClient = db) {
    return client.organization.findUnique({ where: { id } });
  },

  findBySlug(slug: string, client: DbClient = db) {
    return client.organization.findUnique({ where: { slug } });
  },

  update(id: string, data: { name?: string }, client: DbClient = db) {
    return client.organization.update({ where: { id }, data });
  },

  /** Every organization the user belongs to, with the caller's role. */
  listForUser(userId: string, client: DbClient = db) {
    return client.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  findMembership(organizationId: string, userId: string, client: DbClient = db) {
    return client.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
  },

  listMembers(organizationId: string, client: DbClient = db) {
    return client.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, name: true, image: true, createdAt: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  },

  countMembers(organizationId: string, client: DbClient = db) {
    return client.membership.count({ where: { organizationId } });
  },

  countOwners(organizationId: string, client: DbClient = db) {
    return client.membership.count({ where: { organizationId, role: 'OWNER' } });
  },

  addMember(organizationId: string, userId: string, role: MembershipRole, client: DbClient = db) {
    return client.membership.create({ data: { organizationId, userId, role } });
  },

  updateMemberRole(organizationId: string, userId: string, role: MembershipRole, client: DbClient = db) {
    return client.membership.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { role },
    });
  },

  removeMember(organizationId: string, userId: string, client: DbClient = db) {
    return client.membership.delete({ where: { userId_organizationId: { userId, organizationId } } });
  },

  /** Members who can be notified about incidents (RESPONDER and above). */
  listResponders(organizationId: string, client: DbClient = db) {
    return client.membership.findMany({
      where: { organizationId, role: { in: ['OWNER', 'ADMIN', 'RESPONDER'] } },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  },
};
