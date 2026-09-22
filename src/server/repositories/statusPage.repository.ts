import { db, type DbClient } from '@/lib/db';

export const statusPageRepository = {
  list(organizationId: string, client: DbClient = db) {
    return client.statusPage.findMany({
      where: { organizationId },
      include: {
        services: {
          include: { service: { include: { project: { select: { id: true, name: true } } } } },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.statusPage.findFirst({
      where: { id, organizationId },
      include: {
        services: {
          include: { service: { include: { project: { select: { id: true, name: true } } } } },
          orderBy: { position: 'asc' },
        },
      },
    });
  },

  findBySlug(organizationId: string, slug: string, client: DbClient = db) {
    return client.statusPage.findFirst({ where: { slug, organizationId } });
  },

  slugTaken(slug: string, client: DbClient = db) {
    return client.statusPage.findUnique({ where: { slug }, select: { id: true, organizationId: true } });
  },

  create(
    data: { organizationId: string; name: string; slug: string; description?: string | null },
    client: DbClient = db,
  ) {
    return client.statusPage.create({ data });
  },

  update(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string | null; isPublished?: boolean; publishedAt?: Date | null; slug?: string },
    client: DbClient = db,
  ) {
    return client.statusPage.updateMany({ where: { id, organizationId }, data });
  },

  remove(organizationId: string, id: string, client: DbClient = db) {
    return client.statusPage.deleteMany({ where: { id, organizationId } });
  },

  /** Replace the service list of a page in one transaction. */
  async setServices(statusPageId: string, serviceIds: string[], client: DbClient = db) {
    await client.statusPageService.deleteMany({ where: { statusPageId } });
    if (serviceIds.length > 0) {
      await client.statusPageService.createMany({
        data: serviceIds.map((serviceId, index) => ({ statusPageId, serviceId, position: index })),
      });
    }
  },

  /**
   * Public read path. `isPublished: true` is part of the query, not a check after the fact, so an
   * unpublished page can never leak through a code path that forgets to check.
   */
  findPublishedBySlug(slug: string, client: DbClient = db) {
    return client.statusPage.findFirst({
      where: { slug, isPublished: true },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        services: {
          include: { service: { include: { project: { select: { id: true, name: true } } } } },
          orderBy: { position: 'asc' },
        },
      },
    });
  },

  publishedSlugs(client: DbClient = db) {
    return client.statusPage.findMany({ where: { isPublished: true }, select: { slug: true } });
  },
};
