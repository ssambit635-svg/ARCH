import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { scoreChange } from './changeRisk.service';

export async function listDependencyGraph(p: { organizationId: string; userId: string }) {
  await requirePermission(p.organizationId, p.userId, 'project.read');
  const [services, dependencies, changes] = await Promise.all([
    db.service.findMany({ where: { project: { organizationId: p.organizationId } }, include: { project: { select: { name: true } } }, orderBy: { name: 'asc' } }),
    db.serviceDependency.findMany({ where: { organizationId: p.organizationId }, include: { fromService: { select: { id: true, name: true } }, toService: { select: { id: true, name: true } } } }),
    db.changeEvent.findMany({ where: { organizationId: p.organizationId, occurredAt: { gte: new Date(Date.now() - 14 * 86400000) } }, orderBy: { occurredAt: 'desc' }, take: 100 }),
  ]);
  return { services, dependencies, recentChanges: changes };
}

export async function createDependency(p: { organizationId: string; userId: string; fromServiceId: string; toServiceId: string; relationship?: string; criticality?: number }) {
  await requirePermission(p.organizationId, p.userId, 'project.manage');
  if (p.fromServiceId === p.toServiceId) throw AppError.badRequest('A service cannot depend on itself.');
  const services = await db.service.findMany({ where: { id: { in: [p.fromServiceId, p.toServiceId] }, project: { organizationId: p.organizationId } }, select: { id: true } });
  if (services.length !== 2) throw AppError.notFound('Both services must belong to this organization.');
  return db.$transaction(async tx => {
    const dependency = await tx.serviceDependency.create({ data: { organizationId: p.organizationId, fromServiceId: p.fromServiceId, toServiceId: p.toServiceId, relationship: p.relationship ?? 'DEPENDS_ON', criticality: p.criticality ?? 3 } });
    await writeAudit({ organizationId: p.organizationId, actorId: p.userId, action: 'dependency.create', entityType: 'service_dependency', entityId: dependency.id, metadata: { fromServiceId: p.fromServiceId, toServiceId: p.toServiceId } }, tx);
    return dependency;
  });
}

export async function deleteDependency(p: { organizationId: string; userId: string; id: string }) {
  await requirePermission(p.organizationId, p.userId, 'project.manage');
  const result = await db.serviceDependency.deleteMany({ where: { id: p.id, organizationId: p.organizationId } });
  if (!result.count) throw AppError.notFound('Dependency not found.');
  return { id: p.id };
}

export async function createChange(p: { organizationId: string; userId: string; serviceId?: string; projectId?: string; title: string; type?: string; commitSha?: string; author?: string; occurredAt?: Date; source?: string }) {
  await requirePermission(p.organizationId, p.userId, 'project.manage');
  if (p.serviceId) { const service = await db.service.findFirst({ where: { id: p.serviceId, project: { organizationId: p.organizationId } } }); if (!service) throw AppError.notFound('Service not found.'); }
  return db.changeEvent.create({ data: { organizationId: p.organizationId, serviceId: p.serviceId, projectId: p.projectId, title: p.title, type: p.type ?? 'DEPLOYMENT', commitSha: p.commitSha, author: p.author, occurredAt: p.occurredAt, source: p.source ?? 'MANUAL' } });
}

function incidentDowntime(start: Date, end: Date, from: Date, to: Date) { const a = Math.max(start.getTime(), from.getTime()); const b = Math.min(end.getTime(), to.getTime()); return Math.max(0, b - a); }
export async function listSloStatus(p: { organizationId: string; userId: string }) {
  await requirePermission(p.organizationId, p.userId, 'project.read');
  const slos = await db.serviceSlo.findMany({ where: { organizationId: p.organizationId }, include: { service: { select: { id: true, name: true, project: { select: { name: true } } } } }, orderBy: { service: { name: 'asc' } } });
  const now = Date.now();
  return Promise.all(slos.map(async slo => {
    const from = new Date(now - slo.windowDays * 86400000);
    const incidents = await db.incident.findMany({ where: { organizationId: p.organizationId, serviceId: slo.serviceId, startedAt: { lt: new Date(now) }, OR: [{ resolvedAt: null }, { resolvedAt: { gt: from } }] }, select: { startedAt: true, resolvedAt: true, updatedAt: true } });
    const downtimeMs = incidents.reduce((sum, i) => sum + incidentDowntime(i.startedAt, i.resolvedAt ?? new Date(), from, new Date(now)), 0);
    const windowMs = slo.windowDays * 86400000; const actual = Math.max(0, 100 - (downtimeMs / windowMs) * 100); const allowance = windowMs * (1 - slo.targetPercent / 100); const burn = allowance <= 0 ? 0 : downtimeMs / allowance * 100;
    return { ...slo, actualPercent: Number(actual.toFixed(3)), errorBudgetPercent: Number(Math.max(0, 100 - burn).toFixed(1)), burnPercent: Number(burn.toFixed(1)), alert: slo.enabled && burn >= slo.burnAlertPercent, downtimeMinutes: Math.round(downtimeMs / 60000), incidents: incidents.length };
  }));
}

export async function upsertSlo(p: { organizationId: string; userId: string; serviceId: string; targetPercent: number; windowDays: number; burnAlertPercent: number; enabled?: boolean }) {
  await requirePermission(p.organizationId, p.userId, 'project.manage');
  const service = await db.service.findFirst({ where: { id: p.serviceId, project: { organizationId: p.organizationId } } }); if (!service) throw AppError.notFound('Service not found.');
  return db.serviceSlo.upsert({ where: { serviceId: p.serviceId }, create: { organizationId: p.organizationId, serviceId: p.serviceId, targetPercent: p.targetPercent, windowDays: p.windowDays, burnAlertPercent: p.burnAlertPercent, enabled: p.enabled ?? true }, update: { targetPercent: p.targetPercent, windowDays: p.windowDays, burnAlertPercent: p.burnAlertPercent, enabled: p.enabled ?? true } });
}

export async function getIncidentBlastRadius(p: { organizationId: string; userId: string; incidentId: string }) {
  await requirePermission(p.organizationId, p.userId, 'project.read');
  const incident = await db.incident.findFirst({ where: { id: p.incidentId, organizationId: p.organizationId }, include: { service: { select: { id: true, name: true } } } });
  if (!incident) throw AppError.notFound('Incident not found.');
  if (!incident.service) return { incidentId: incident.id, rootService: null, affectedServices: [], relatedChanges: [], relatedIncidents: [] };
  const edges = await db.serviceDependency.findMany({ where: { organizationId: p.organizationId } });
  const affected = new Set([incident.service.id]); const queue = [incident.service.id];
  while (queue.length) { const current = queue.shift()!; for (const edge of edges) if (edge.toServiceId === current && !affected.has(edge.fromServiceId)) { affected.add(edge.fromServiceId); queue.push(edge.fromServiceId); } }
  const [services, relatedChanges, relatedIncidents] = await Promise.all([
    db.service.findMany({ where: { id: { in: [...affected] } }, select: { id: true, name: true, status: true } }),
    db.changeEvent.findMany({ where: { organizationId: p.organizationId, serviceId: { in: [...affected] }, occurredAt: { gte: new Date(incident.startedAt.getTime() - 7 * 86400000), lte: incident.startedAt } }, orderBy: { occurredAt: 'desc' } }),
    db.incident.findMany({ where: { organizationId: p.organizationId, serviceId: { in: [...affected] }, id: { not: incident.id }, createdAt: { gte: new Date(incident.startedAt.getTime() - 30 * 86400000) } }, select: { id: true, title: true, severity: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  return { incidentId: incident.id, rootService: incident.service, affectedServices: services, relatedChanges, relatedIncidents };
}

/**
 * V7 — change-aware blast radius: "this deploy just shipped — who is downstream of it?"
 *
 * Walks the dependency map from the changed service outwards (who DEPENDS ON this service), and
 * pairs the result with the change-risk score and recent incidents on the affected set. The
 * answer to "yeh service affect hoga?" is the affected list, ordered by graph distance. Read-only:
 * it never blocks a deploy or touches the services it names.
 */
export async function getChangeBlastRadius(p: { organizationId: string; userId: string; changeId: string }) {
  await requirePermission(p.organizationId, p.userId, 'change.read');
  const change = await db.changeEvent.findFirst({
    where: { id: p.changeId, organizationId: p.organizationId },
    include: { service: { select: { id: true, name: true, status: true } } },
  });
  if (!change) throw AppError.notFound('Change not found.');

  const empty = {
    changeId: change.id,
    change: { title: change.title, type: change.type, commitSha: change.commitSha, author: change.author, occurredAt: change.occurredAt.toISOString(), serviceName: change.service?.name ?? null },
    rootService: change.service ? { id: change.service.id, name: change.service.name } : null,
    affectedServices: [] as { id: string; name: string; status: string; distance: number }[],
    recentIncidents: [] as { id: string; title: string; severity: string; status: string; startedAt: string }[],
    risk: null as null | { probability: number; band: string },
    note: '',
  };
  if (!change.service) {
    return { ...empty, note: 'This change is not linked to a service, so ARCH cannot walk the dependency map. Link the change to a service to get a blast radius.' };
  }

  // BFS over the dependency map: if service X depends on the changed service and the change goes
  // wrong, X is affected — one hop further for each dependent-of-dependent.
  const edges = await db.serviceDependency.findMany({ where: { organizationId: p.organizationId } });
  const distance = new Map<string, number>([[change.service.id, 0]]);
  let queue = [change.service.id];
  let depth = 0;
  while (queue.length) {
    depth += 1;
    const next: string[] = [];
    for (const current of queue) {
      for (const edge of edges) {
        if (edge.toServiceId === current && !distance.has(edge.fromServiceId)) {
          distance.set(edge.fromServiceId, depth);
          next.push(edge.fromServiceId);
        }
      }
    }
    queue = next;
  }

  const ids = [...distance.keys()];
  const [services, recentIncidents, risk] = await Promise.all([
    db.service.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, status: true } }),
    db.incident.findMany({
      where: { organizationId: p.organizationId, serviceId: { in: ids }, startedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { id: true, title: true, severity: true, status: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    scoreChange({
      organizationId: p.organizationId,
      userId: p.userId,
      change: {
        id: change.id,
        type: change.type,
        serviceId: change.serviceId,
        serviceName: change.service.name,
        author: change.author,
        occurredAt: change.occurredAt,
        filesChanged: change.metadata && typeof change.metadata === 'object' && typeof (change.metadata as Record<string, unknown>).filesChanged === 'number' ? ((change.metadata as Record<string, unknown>).filesChanged as number) : null,
        commitMessage: change.title,
      },
    }).catch(() => null),
  ]);

  const affectedServices = services
    .map((service) => ({ id: service.id, name: service.name, status: service.status, distance: distance.get(service.id) ?? 0 }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
  const dependents = affectedServices.filter((service) => service.distance >= 1);

  return {
    ...empty,
    affectedServices,
    recentIncidents: recentIncidents.map((incident) => ({ ...incident, startedAt: incident.startedAt.toISOString() })),
    risk: risk ? { probability: risk.probability, band: risk.band } : null,
    note: dependents.length
      ? `${dependents.length} service(s) sit downstream of this change in the dependency map — watch them while it rolls out.`
      : 'Nothing in the dependency map depends on this service yet, so a bad rollout stays contained to it.',
  };
}
