import { db, type DbClient } from '@/lib/db';

export const projectRepository = {
  list(organizationId: string, options: { q?: string } = {}, client: DbClient = db) {
    return client.project.findMany({
      where: {
        organizationId,
        ...(options.q ? { name: { contains: options.q, mode: 'insensitive' as const } } : {}),
      },
      include: { _count: { select: { services: true, incidents: true } } },
      orderBy: { name: 'asc' },
    });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.project.findFirst({
      where: { id, organizationId },
      include: { services: { orderBy: { name: 'asc' } } },
    });
  },

  findBySlug(organizationId: string, slug: string, client: DbClient = db) {
    return client.project.findFirst({ where: { slug, organizationId } });
  },

  create(data: { organizationId: string; name: string; slug: string; description?: string | null }, client: DbClient = db) {
    return client.project.create({ data });
  },

  update(organizationId: string, id: string, data: { name?: string; description?: string | null }, client: DbClient = db) {
    return client.project.updateMany({ where: { id, organizationId }, data });
  },

  remove(organizationId: string, id: string, client: DbClient = db) {
    return client.project.deleteMany({ where: { id, organizationId } });
  },

  count(organizationId: string, client: DbClient = db) {
    return client.project.count({ where: { organizationId } });
  },
};
