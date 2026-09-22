import { db, type DbClient } from '@/lib/db';
import type { ServiceStatus } from '@/generated/prisma/client';

/**
 * Services belong to projects, which belong to organizations — so service queries are scoped by
 * traversing the relation. Filtering by `id` alone would be a cross-tenant leak.
 */
export const serviceRepository = {
  list(organizationId: string, options: { projectId?: string } = {}, client: DbClient = db) {
    return client.service.findMany({
      where: { project: { organizationId }, ...(options.projectId ? { projectId: options.projectId } : {}) },
      include: { project: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.service.findFirst({
      where: { id, project: { organizationId } },
      include: { project: { select: { id: true, name: true, slug: true, organizationId: true } } },
    });
  },

  findByIds(organizationId: string, ids: string[], client: DbClient = db) {
    return client.service.findMany({ where: { id: { in: ids }, project: { organizationId } } });
  },

  findInProject(projectId: string, id: string, client: DbClient = db) {
    return client.service.findFirst({ where: { id, projectId } });
  },

  create(
    data: { projectId: string; name: string; slug: string; description?: string | null; status?: ServiceStatus; autoStatus?: boolean },
    client: DbClient = db,
  ) {
    return client.service.create({ data });
  },

  update(
    id: string,
    data: { name?: string; description?: string | null; status?: ServiceStatus; autoStatus?: boolean },
    client: DbClient = db,
  ) {
    return client.service.update({ where: { id }, data });
  },

  remove(projectId: string, id: string, client: DbClient = db) {
    return client.service.deleteMany({ where: { id, projectId } });
  },

  /** Open (unresolved) incidents attached to a service — used to derive its live status. */
  countOpenIncidents(serviceId: string, client: DbClient = db) {
    return client.incident.groupBy({
      by: ['severity'],
      where: { serviceId, status: { not: 'RESOLVED' } },
      _count: { _all: true },
    });
  },
};
