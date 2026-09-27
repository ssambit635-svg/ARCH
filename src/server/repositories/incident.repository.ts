import { db, type DbClient } from '@/lib/db';
import { Prisma } from '@/lib/db';
import type { IncidentEventType, IncidentSeverity, IncidentStatus } from '@/generated/prisma/client';

export type IncidentFilters = {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  projectId?: string;
  serviceId?: string;
  assignedToId?: string;
  q?: string;
  open?: boolean;
  resolvedSince?: Date;
};

const incidentInclude = {
  project: { select: { id: true, name: true, slug: true } },
  service: { select: { id: true, name: true, slug: true, status: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.IncidentInclude;

function where(organizationId: string, filters: IncidentFilters = {}): Prisma.IncidentWhereInput {
  return {
    organizationId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.open ? { status: { not: 'RESOLVED' } } : {}),
    ...(filters.resolvedSince ? { resolvedAt: { gte: filters.resolvedSince } } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
    ...(filters.q
      ? { OR: [{ title: { contains: filters.q, mode: 'insensitive' as const } }, { description: { contains: filters.q, mode: 'insensitive' as const } }] }
      : {}),
  };
}

export const incidentRepository = {
  list(organizationId: string, filters: IncidentFilters, pagination: { skip: number; take: number }, client: DbClient = db) {
    return client.incident.findMany({
      where: where(organizationId, filters),
      include: incidentInclude,
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  },

  count(organizationId: string, filters: IncidentFilters = {}, client: DbClient = db) {
    return client.incident.count({ where: where(organizationId, filters) });
  },

  countByStatus(organizationId: string, client: DbClient = db) {
    return client.incident.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } });
  },

  /** Open incidents per assignee — Copilot triage uses it as a workload signal. */
  async countOpenByAssignee(organizationId: string, client: DbClient = db): Promise<Map<string, number>> {
    const rows = await client.incident.groupBy({
      by: ['assignedToId'],
      where: { organizationId, status: { not: 'RESOLVED' }, assignedToId: { not: null } },
      _count: { _all: true },
    });
    return new Map(rows.filter((row) => row.assignedToId).map((row) => [row.assignedToId as string, row._count._all]));
  },

  countBySeverity(organizationId: string, client: DbClient = db) {
    return client.incident.groupBy({ by: ['severity'], where: { organizationId }, _count: { _all: true } });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.incident.findFirst({ where: { id, organizationId }, include: incidentInclude });
  },

  findByIdWithTimeline(organizationId: string, id: string, client: DbClient = db) {
    return client.incident.findFirst({
      where: { id, organizationId },
      include: {
        ...incidentInclude,
        events: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  findRecent(organizationId: string, take: number, client: DbClient = db) {
    return client.incident.findMany({ where: { organizationId }, include: incidentInclude, orderBy: { createdAt: 'desc' }, take });
  },

  /** V6 - a specific set of incidents, still organization-scoped (cross-tenant ids are dropped). */
  findByIds(organizationId: string, ids: string[], client: DbClient = db) {
    if (ids.length === 0) return Promise.resolve([]);
    return client.incident.findMany({ where: { organizationId, id: { in: ids } }, include: incidentInclude });
  },

  /**
   * V6 - resolved incidents since a date, with their human-written timeline. Used by the recurring
   * failure report; bounded so one workspace cannot ask for its whole history in one request.
   */
  listResolvedSince(organizationId: string, since: Date, take: number, client: DbClient = db) {
    return client.incident.findMany({
      where: { organizationId, status: 'RESOLVED', startedAt: { gte: since } },
      include: {
        ...incidentInclude,
        events: { select: { type: true, body: true }, orderBy: { createdAt: 'asc' as const }, take: 100 },
      },
      orderBy: { startedAt: 'desc' },
      take,
    });
  },

  /** Open incident previously created by the same alert source (alert-storm suppression). */
  findOpenByDedupeKey(organizationId: string, dedupeKey: string, client: DbClient = db) {
    return client.incident.findFirst({
      where: { organizationId, dedupeKey, status: { not: 'RESOLVED' } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * V7 — open incident with the same content fingerprint. Used for alert-storm suppression when
   * the sender supplies no explicit dedupeKey: the same failure re-firing must not open a second
   * incident. Same contract as findOpenByDedupeKey (latest open match wins).
   */
  findOpenByFingerprint(organizationId: string, fingerprint: string, client: DbClient = db) {
    return client.incident.findFirst({
      where: { organizationId, fingerprint, status: { not: 'RESOLVED' } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Every incident sharing an alert fingerprint — the "repeat alerts" correlation group. */
  findByFingerprint(organizationId: string, fingerprint: string, client: DbClient = db) {
    return client.incident.findMany({
      where: { organizationId, fingerprint },
      include: { service: { select: { id: true, name: true } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  },

  /** Latest timeline entries for a set of incidents (public status page "latest update"). */
  recentEventsForIncidents(incidentIds: string[], take = 200, client: DbClient = db) {
    if (incidentIds.length === 0) return Promise.resolve([]);
    return client.incidentEvent.findMany({
      where: { incidentId: { in: incidentIds } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  },

  listActiveForServices(serviceIds: string[], client: DbClient = db) {
    if (serviceIds.length === 0) return Promise.resolve([]);
    return client.incident.findMany({
      where: { serviceId: { in: serviceIds }, status: { not: 'RESOLVED' } },
      orderBy: [{ severity: 'desc' }, { startedAt: 'desc' }],
    });
  },

  /** Recently resolved incidents on these services — powers public history + uptime bars. */
  recentResolvedForServices(serviceIds: string[], since: Date, take = 25, client: DbClient = db) {
    if (serviceIds.length === 0) return Promise.resolve([]);
    return client.incident.findMany({
      where: { serviceId: { in: serviceIds }, status: 'RESOLVED', resolvedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      take,
    });
  },

  create(
    data: {
      organizationId: string;
      projectId: string;
      serviceId?: string | null;
      title: string;
      description?: string | null;
      severity: IncidentSeverity;
      status: IncidentStatus;
      source: 'DASHBOARD' | 'API' | 'WEBHOOK';
      createdById?: string | null;
      assignedToId?: string | null;
      webhookEndpointId?: string | null;
      dedupeKey?: string | null;
      fingerprint?: string | null;
      startedAt?: Date;
    },
    client: DbClient = db,
  ) {
    return client.incident.create({ data });
  },

  update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      severity?: IncidentSeverity;
      status?: IncidentStatus;
      assignedToId?: string | null;
      serviceId?: string | null;
      projectId?: string;
      resolvedAt?: Date | null;
      startedAt?: Date;
      fingerprint?: string | null;
    },
    client: DbClient = db,
  ) {
    return client.incident.update({ where: { id }, data });
  },

  addEvent(
    data: {
      incidentId: string;
      authorId?: string | null;
      actorLabel?: string | null;
      type: IncidentEventType;
      body?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    client: DbClient = db,
  ) {
    return client.incidentEvent.create({ data: { ...data, metadata: (data.metadata ?? undefined) as never } });
  },

  listEvents(incidentId: string, pagination: { skip: number; take: number }, client: DbClient = db) {
    return client.incidentEvent.findMany({
      where: { incidentId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
    });
  },

  countEvents(incidentId: string, client: DbClient = db) {
    return client.incidentEvent.count({ where: { incidentId } });
  },
};
