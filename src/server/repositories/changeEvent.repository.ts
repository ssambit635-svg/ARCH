import { db, type DbClient } from '@/lib/db';

/**
 * V6 — change-risk training data.
 *
 * The label is history the organization already has: a change is a positive example when an
 * incident on the same service opened within the risk window after it. Both sides of that join are
 * read here, tenant-scoped; the classifier itself is pure (`ai/arch-model/risk.ts`).
 */

export const changeEventRepository = {
  /** Recent changes with the service they touched. */
  listForRisk(organizationId: string, since: Date, take = 2_000, client: DbClient = db) {
    return client.changeEvent.findMany({
      where: { organizationId, occurredAt: { gte: since } },
      select: {
        id: true,
        type: true,
        title: true,
        commitSha: true,
        author: true,
        source: true,
        occurredAt: true,
        metadata: true,
        serviceId: true,
        service: { select: { id: true, name: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take,
    });
  },

  /** Recent changes, newest first — for the "recent changes" panel on the incident form. */
  listRecent(organizationId: string, options: { serviceId?: string; take?: number } = {}, client: DbClient = db) {
    return client.changeEvent.findMany({
      where: { organizationId, ...(options.serviceId ? { serviceId: options.serviceId } : {}) },
      include: { service: { select: { id: true, name: true } } },
      orderBy: { occurredAt: 'desc' },
      take: Math.min(Math.max(options.take ?? 10, 1), 50),
    });
  },

  /** Incident starts, used to label changes. */
  listIncidentStarts(organizationId: string, since: Date, take = 4_000, client: DbClient = db) {
    return client.incident.findMany({
      where: { organizationId, startedAt: { gte: since } },
      select: { id: true, serviceId: true, startedAt: true, severity: true },
      orderBy: { startedAt: 'desc' },
      take,
    });
  },

  /** The most common failure category per service, from resolved incidents. */
  async categoryByService(organizationId: string, client: DbClient = db): Promise<Map<string, string>> {
    const rows = await client.incident.findMany({
      where: { organizationId, status: 'RESOLVED', serviceId: { not: null } },
      select: { serviceId: true, title: true },
      orderBy: { startedAt: 'desc' },
      take: 2_000,
    });
    // The classifier runs in the service layer; here we only group titles per service.
    const titles = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.serviceId) continue;
      const list = titles.get(row.serviceId) ?? [];
      list.push(row.title);
      titles.set(row.serviceId, list);
    }
    return new Map([...titles.entries()].map(([serviceId, list]) => [serviceId, list.join('. ')]));
  },
};
