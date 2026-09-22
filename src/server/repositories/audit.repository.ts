import { db, type DbClient } from '@/lib/db';
import { Prisma } from '@/lib/db';

export type AuditFilters = { action?: string; actorId?: string; entityType?: string; from?: Date; to?: Date };

export const auditRepository = {
  list(organizationId: string, filters: AuditFilters, pagination: { skip: number; take: number }, client: DbClient = db) {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(filters.action ? { action: { startsWith: filters.action } } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.from || filters.to
        ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    };
    return client.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    });
  },

  count(organizationId: string, filters: AuditFilters = {}, client: DbClient = db) {
    return client.auditLog.count({
      where: {
        organizationId,
        ...(filters.action ? { action: { startsWith: filters.action } } : {}),
        ...(filters.actorId ? { actorId: filters.actorId } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
      },
    });
  },

  actions(organizationId: string, client: DbClient = db) {
    return client.auditLog.groupBy({ by: ['action'], where: { organizationId }, _count: { _all: true } });
  },
};
