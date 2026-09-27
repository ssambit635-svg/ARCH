import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import type { ServiceStatus } from '@/generated/prisma/client';
import { statusPageRepository } from '../repositories/statusPage.repository';
import { serviceRepository } from '../repositories/service.repository';
import { incidentRepository } from '../repositories/incident.repository';
import { uniqueStatusPageSlug } from './slug.service';

/**
 * Status pages: the dashboard-managed half (`listStatusPages` … `setStatusPagePublished`) and the
 * anonymous read path (`getPublicStatusPage`).
 *
 * Two things the public path must never do: return an unpublished page, or return another
 * organization's page. Both are impossible by construction — the lookup is a single query with
 * `slug` + `isPublished: true`, and it takes no session for context.
 */

/// Worst-first ordering used to compute the overall indicator.
const STATUS_WEIGHT: Record<ServiceStatus, number> = { OPERATIONAL: 0, MAINTENANCE: 1, DEGRADED: 2, OUTAGE: 3 };

export async function listStatusPages(params: { organizationId: string; userId: string }) {
  await requirePermission(params.organizationId, params.userId, 'statuspage.read');
  return statusPageRepository.list(params.organizationId);
}

export async function getStatusPage(params: { organizationId: string; userId: string; statusPageId: string }) {
  await requirePermission(params.organizationId, params.userId, 'statuspage.read');
  const page = await statusPageRepository.findById(params.organizationId, params.statusPageId);
  if (!page) throw AppError.notFound('Status page not found.');
  return page;
}

export async function createStatusPage(params: {
  organizationId: string;
  userId: string;
  name: string;
  slug?: string;
  description?: string | null;
  serviceIds?: string[];
}) {
  await requirePermission(params.organizationId, params.userId, 'statuspage.manage');
  const serviceIds = params.serviceIds ?? [];

  return db.$transaction(async (tx) => {
    const slug = params.slug ?? (await uniqueStatusPageSlug(params.name, tx));
    const taken = await statusPageRepository.slugTaken(slug, tx);
    if (taken) throw AppError.conflict('That status page slug is already taken (slugs are global).');

    if (serviceIds.length > 0) {
      const services = await serviceRepository.findByIds(params.organizationId, serviceIds, tx);
      if (services.length !== serviceIds.length) throw AppError.notFound('One or more services were not found in this organization.');
    }

    const page = await statusPageRepository.create(
      { organizationId: params.organizationId, name: params.name, slug, description: params.description ?? null },
      tx,
    );
    if (serviceIds.length > 0) await statusPageRepository.setServices(page.id, serviceIds, tx);

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'statuspage.create',
        entityType: 'status_page',
        entityId: page.id,
        metadata: { name: page.name, slug: page.slug },
      },
      tx,
    );
    return page;
  });
}

export async function updateStatusPage(params: {
  organizationId: string;
  userId: string;
  statusPageId: string;
  name?: string;
  description?: string | null;
  serviceIds?: string[];
}) {
  await requirePermission(params.organizationId, params.userId, 'statuspage.manage');
  const existing = await statusPageRepository.findById(params.organizationId, params.statusPageId);
  if (!existing) throw AppError.notFound('Status page not found.');

  await db.$transaction(async (tx) => {
    if (params.name || params.description !== undefined) {
      await statusPageRepository.update(
        params.organizationId,
        params.statusPageId,
        {
          ...(params.name ? { name: params.name } : {}),
          ...(params.description !== undefined ? { description: params.description } : {}),
        },
        tx,
      );
    }

    if (params.serviceIds) {
      const services = await serviceRepository.findByIds(params.organizationId, params.serviceIds, tx);
      if (services.length !== params.serviceIds.length) {
        throw AppError.notFound('One or more services were not found in this organization.');
      }
      await statusPageRepository.setServices(params.statusPageId, params.serviceIds, tx);
    }

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'statuspage.update',
        entityType: 'status_page',
        entityId: params.statusPageId,
        metadata: { servicesChanged: Boolean(params.serviceIds) },
      },
      tx,
    );
  });

  return statusPageRepository.findById(params.organizationId, params.statusPageId);
}

export async function setStatusPagePublished(params: {
  organizationId: string;
  userId: string;
  statusPageId: string;
  isPublished: boolean;
}) {
  await requirePermission(params.organizationId, params.userId, 'statuspage.publish');
  const existing = await statusPageRepository.findById(params.organizationId, params.statusPageId);
  if (!existing) throw AppError.notFound('Status page not found.');

  const now = new Date();
  return db.$transaction(async (tx) => {
    await statusPageRepository.update(
      params.organizationId,
      params.statusPageId,
      {
        isPublished: params.isPublished,
        publishedAt: params.isPublished ? existing.publishedAt ?? now : existing.publishedAt,
      },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: params.isPublished ? 'statuspage.publish' : 'statuspage.unpublish',
        entityType: 'status_page',
        entityId: params.statusPageId,
        metadata: { slug: existing.slug },
      },
      tx,
    );
    return statusPageRepository.findById(params.organizationId, params.statusPageId, tx);
  });
}

export async function deleteStatusPage(params: { organizationId: string; userId: string; statusPageId: string }) {
  await requirePermission(params.organizationId, params.userId, 'statuspage.manage');
  const existing = await statusPageRepository.findById(params.organizationId, params.statusPageId);
  if (!existing) throw AppError.notFound('Status page not found.');

  return db.$transaction(async (tx) => {
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'statuspage.delete',
        entityType: 'status_page',
        entityId: params.statusPageId,
        metadata: { slug: existing.slug },
      },
      tx,
    );
    await statusPageRepository.remove(params.organizationId, params.statusPageId, tx);
    return { id: params.statusPageId };
  });
}

export type PublicStatusPage = NonNullable<Awaited<ReturnType<typeof statusPageRepository.findPublishedBySlug>>>;

/** Everything the public page renders, in one shot. Returns null for unknown/unpublished slugs. */
export async function getPublicStatusPage(slug: string) {
  const page = await statusPageRepository.findPublishedBySlug(slug);
  if (!page) return null;

  const serviceIds = page.services.map((entry) => entry.serviceId);
  const activeIncidents = await incidentRepository.listActiveForServices(serviceIds);
  const historyWindow = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const resolvedHistory = await incidentRepository.recentResolvedForServices(serviceIds, historyWindow);
  const recentEvents = await incidentRepository.recentEventsForIncidents([
    ...activeIncidents.map((incident) => incident.id),
    ...resolvedHistory.map((incident) => incident.id),
  ]);

  // Newest-first, so the first event seen for an incident is its latest update.
  const latestUpdateByIncident = new Map<string, (typeof recentEvents)[number]>();
  for (const event of recentEvents) {
    if (!latestUpdateByIncident.has(event.incidentId)) latestUpdateByIncident.set(event.incidentId, event);
  }

  const overallStatus =
    page.services.length === 0
      ? ('OPERATIONAL' as ServiceStatus)
      : page.services
          .map((entry) => entry.service.status)
          .reduce<ServiceStatus>((worst, status) => (STATUS_WEIGHT[status] > STATUS_WEIGHT[worst] ? status : worst), 'OPERATIONAL');

  return {
    organization: page.organization,
    page: {
      name: page.name,
      slug: page.slug,
      description: page.description,
      isPublished: page.isPublished,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
    },
    overallStatus,
    components: page.services.map((entry) => ({
      id: entry.service.id,
      name: entry.displayName ?? entry.service.name,
      description: entry.service.description,
      status: entry.service.status,
      projectName: entry.service.project.name,
    })),
    activeIncidents: activeIncidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      startedAt: incident.startedAt,
      updatedAt: incident.updatedAt,
      resolvedAt: incident.resolvedAt,
      serviceId: incident.serviceId,
      componentName: page.services.find((entry) => entry.serviceId === incident.serviceId)?.service.name ?? null,
      latestUpdate: (() => {
        const event = latestUpdateByIncident.get(incident.id);
        return event ? { body: event.body, actorLabel: event.actorLabel, createdAt: event.createdAt, type: event.type } : null;
      })(),
    })),
    // Resolved in the last 90 days — customer-safe subset (no severities, no assignees).
    history: resolvedHistory.map((incident) => ({
      id: incident.id,
      title: incident.title,
      status: incident.status,
      severity: incident.severity,
      serviceId: incident.serviceId,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      updates: recentEvents
        .filter((event) => event.incidentId === incident.id && event.body)
        .slice(0, 6)
        .map((event) => ({ id: event.id, body: event.body, createdAt: event.createdAt })),
    })),
    generatedAt: new Date(),
  };
}

/** Slugs of the published pages of an organization — used to revalidate the right ISR entries. */
export async function publishedSlugsForOrganization(organizationId: string) {
  const pages = await db.statusPage.findMany({ where: { organizationId, isPublished: true }, select: { slug: true } });
  return pages.map((page) => page.slug);
}
