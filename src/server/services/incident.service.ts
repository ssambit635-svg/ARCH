import { db, type DbClient } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import type { IncidentSeverity, IncidentStatus } from '@/generated/prisma/client';
import { incidentRepository, type IncidentFilters } from '../repositories/incident.repository';
import { projectRepository } from '../repositories/project.repository';
import { serviceRepository } from '../repositories/service.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { buildIncidentNotifications } from './notification.service';
import { assertTransition, isReopen } from './incident-state';
import { alertFingerprint } from './incident-fingerprint';
import { getOrganizationModel } from './archModel.service';
import { recordSeverityCorrection } from './modelLearning.service';

/**
 * Incident service — the heart of ARCH.
 *
 * Rules enforced here (not in the UI, not in the route handler):
 *  - the caller has `incident.*` permission in *this* organization;
 *  - the project/service/assignee referenced all belong to that organization (otherwise 404);
 *  - status changes follow the state machine and are recorded as timeline events;
 *  - incident + timeline + audit + notification outbox are written in ONE transaction;
 *  - a service's live status is derived from its open incidents.
 */

export type IncidentCreateInput = {
  title: string;
  description?: string | null;
  severity: IncidentSeverity;
  projectId: string;
  serviceId?: string | null;
  assignedToId?: string | null;
  startedAt?: string | number | Date | null;
};

export type IncidentUpdateInput = {
  title?: string;
  description?: string | null;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  assignedToId?: string | null;
  serviceId?: string | null;
  projectId?: string;
  message?: string;
};

const responderRoles = ['OWNER', 'ADMIN', 'RESPONDER'] as const;

function parseStartedAt(value: string | number | Date | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const parsed = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw AppError.badRequest('startedAt is not a valid timestamp.');
  return parsed;
}

async function assertProjectExists(organizationId: string, projectId: string, client: DbClient) {
  const project = await projectRepository.findById(organizationId, projectId, client);
  if (!project) throw AppError.notFound('Project not found in this organization.');
  return project;
}

async function assertServiceBelongsToProject(projectId: string, serviceId: string, client: DbClient) {
  const service = await serviceRepository.findInProject(projectId, serviceId, client);
  if (!service) throw AppError.notFound('Service not found in this project.');
  return service;
}

async function assertAssigneeIsMember(organizationId: string, userId: string, client: DbClient) {
  const membership = await organizationRepository.findMembership(organizationId, userId, client);
  if (!membership) throw AppError.notFound('Assignee is not a member of this organization.');
  return membership;
}

/** Recipients = responders in the org + the assignee, minus whoever caused the change. */
async function notificationRecipients(organizationId: string, excludeUserId: string | null, assignedToId?: string | null, client: DbClient = db) {
  const memberships = await organizationRepository.listResponders(organizationId, client);
  const ids = new Set(memberships.map((membership) => membership.userId));
  if (assignedToId) ids.add(assignedToId);
  if (excludeUserId) ids.delete(excludeUserId);
  return [...ids];
}

/**
 * Derive the service status from its open incidents (CRITICAL/HIGH open → OUTAGE, anything else
 * open → DEGRADED, none → OPERATIONAL). Services with `autoStatus = false` are left alone so an
 * on-call engineer can pin a maintenance window.
 */
export async function recomputeServiceStatus(serviceId: string, client: DbClient = db): Promise<void> {
  const service = await client.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.autoStatus) return;

  const openIncidents = await client.incident.findMany({
    where: { serviceId, status: { not: 'RESOLVED' } },
    select: { severity: true },
  });

  const status =
    openIncidents.length === 0
      ? 'OPERATIONAL'
      : openIncidents.some((incident) => incident.severity === 'CRITICAL' || incident.severity === 'HIGH')
        ? 'OUTAGE'
        : 'DEGRADED';

  if (status !== service.status) {
    await serviceRepository.update(serviceId, { status }, client);
  }
}

function incidentContext(
  organizationName: string,
  projectName: string,
  serviceName: string | null,
  incident: { id: string; title: string; severity: IncidentSeverity; status: IncidentStatus; description: string | null; startedAt: Date },
  actorLabel: string,
  extra: { change?: { from: IncidentStatus; to: IncidentStatus } | null; message?: string | null; assigneeId?: string | null } = {},
) {
  return {
    organizationName,
    projectName,
    serviceName,
    incident,
    actorLabel,
    assigneeId: extra.assigneeId ?? null,
    change: extra.change ?? null,
    message: extra.message ?? null,
  };
}

export type ListIncidentsParams = {
  organizationId: string;
  userId: string;
  filters?: IncidentFilters;
  page: number;
  pageSize: number;
};

export async function listIncidents(params: ListIncidentsParams) {
  await requirePermission(params.organizationId, params.userId, 'incident.read');
  const filters = params.filters ?? {};
  const [items, total] = await Promise.all([
    incidentRepository.list(params.organizationId, filters, {
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    incidentRepository.count(params.organizationId, filters),
  ]);

  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getIncident(params: { organizationId: string; userId: string; incidentId: string }) {
  await requirePermission(params.organizationId, params.userId, 'incident.read');
  const incident = await incidentRepository.findByIdWithTimeline(params.organizationId, params.incidentId);
  // Cross-tenant ids look exactly like ids that do not exist.
  if (!incident) throw AppError.notFound('Incident not found.');
  return incident;
}

export async function listIncidentEvents(params: { organizationId: string; userId: string; incidentId: string; page: number; pageSize: number }) {
  await requirePermission(params.organizationId, params.userId, 'incident.read');
  const incident = await incidentRepository.findById(params.organizationId, params.incidentId);
  if (!incident) throw AppError.notFound('Incident not found.');
  const [items, total] = await Promise.all([
    incidentRepository.listEvents(params.incidentId, { skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
    incidentRepository.countEvents(params.incidentId),
  ]);
  return { items, page: params.page, pageSize: params.pageSize, total, totalPages: Math.max(1, Math.ceil(total / params.pageSize)) };
}

/**
 * Create an incident. Used by the dashboard, the public API and — with `source: 'WEBHOOK'` — by
 * webhook ingestion, which passes a system actor instead of a user id.
 */
export async function createIncidentInternal(
  client: DbClient,
  params: {
    organizationId: string;
    actorId?: string | null;
    actorLabel?: string | null;
    source: 'DASHBOARD' | 'API' | 'WEBHOOK';
    webhookEndpointId?: string | null;
    /// Suppresses duplicate incidents coming from a repeating alert source.
    dedupeKey?: string | null;
    /// Pre-computed alert fingerprint (webhook path); otherwise derived from title + service.
    fingerprint?: string | null;
    input: IncidentCreateInput;
    /// Set by the webhook path, which already authenticates with HMAC instead of a session.
    skipPermissionCheck?: boolean;
  },
) {
  const { organizationId, input } = params;

  if (!params.skipPermissionCheck) {
    if (!params.actorId) throw AppError.unauthorized();
    await requirePermission(organizationId, params.actorId, 'incident.write', client);
  }

  const project = await assertProjectExists(organizationId, input.projectId, client);
  const service = input.serviceId ? await assertServiceBelongsToProject(input.projectId, input.serviceId, client) : null;
  if (input.assignedToId) await assertAssigneeIsMember(organizationId, input.assignedToId, client);

  const startedAt = parseStartedAt(input.startedAt);
  // Alert fingerprint: supplied by webhook ingestion (so the pre-create dedupe check and the
  // stored row agree) or derived here so dashboard/API incidents join the same correlation groups.
  const fingerprint =
    params.fingerprint ??
    alertFingerprint({
      source: params.source,
      serviceKey: service?.name ?? null,
      title: input.title,
      description: input.description ?? null,
    });
  const incident = await incidentRepository.create(
    {
      organizationId,
      projectId: project.id,
      serviceId: service?.id ?? null,
      title: input.title,
      description: input.description ?? null,
      severity: input.severity,
      status: 'INVESTIGATING',
      source: params.source,
      createdById: params.actorId ?? null,
      assignedToId: input.assignedToId ?? null,
      webhookEndpointId: params.webhookEndpointId ?? null,
      dedupeKey: params.dedupeKey ?? null,
      fingerprint,
      startedAt,
    },
    client,
  );

  await incidentRepository.addEvent(
    {
      incidentId: incident.id,
      authorId: params.actorId ?? null,
      actorLabel: params.actorLabel ?? null,
      type: 'CREATED',
      body: input.description ?? null,
      metadata: {
        severity: incident.severity,
        projectId: project.id,
        serviceId: service?.id ?? null,
        source: params.source,
      },
    },
    client,
  );

  if (incident.assignedToId) {
    await incidentRepository.addEvent(
      {
        incidentId: incident.id,
        authorId: params.actorId ?? null,
        actorLabel: params.actorLabel ?? null,
        type: 'ASSIGNED',
        metadata: { to: incident.assignedToId },
      },
      client,
    );
  }

  await writeAudit(
    {
      organizationId,
      actorId: params.actorId ?? null,
      actorLabel: params.actorLabel ?? null,
      action: 'incident.create',
      entityType: 'incident',
      entityId: incident.id,
      metadata: { title: incident.title, severity: incident.severity, projectId: project.id, serviceId: service?.id ?? null, source: params.source },
    },
    client,
  );

  const organization = await organizationRepository.findById(organizationId, client);
  const recipients = await notificationRecipients(organizationId, params.actorId ?? null, incident.assignedToId, client);
  await notificationRepository.enqueueMany(
    buildIncidentNotifications(
      incidentContext(
        organization?.name ?? 'Organization',
        project.name,
        service?.name ?? null,
        incident,
        params.actorLabel ?? 'a teammate',
      ),
      recipients,
      'INCIDENT_CREATED',
      organizationId,
    ),
    client,
  );

  if (service) await recomputeServiceStatus(service.id, client);

  return incident;
}

export async function createIncident(params: {
  organizationId: string;
  userId: string;
  input: IncidentCreateInput;
  source?: 'DASHBOARD' | 'API';
}) {
  const incident = await db.$transaction((tx) =>
    createIncidentInternal(tx, {
      organizationId: params.organizationId,
      actorId: params.userId,
      source: params.source ?? 'DASHBOARD',
      input: params.input,
    }),
  );
  return incidentRepository.findByIdWithTimeline(params.organizationId, incident.id);
}

/**
 * V6 — record what ARCH would have predicted when a human overrides the severity.
 *
 * The prediction is computed *after* the transaction commits so the responder's severity change is
 * never delayed by, or broken by, model work. Any failure is swallowed: learning is a side effect.
 */
async function learnFromSeverityChange(params: {
  organizationId: string;
  userId: string;
  incidentId: string;
  text: string;
  actual: IncidentSeverity;
}): Promise<void> {
  try {
    const model = await getOrganizationModel(params.organizationId);
    const predicted = model.classifySeverity(params.text).severity;
    if (predicted === params.actual) return; // agreement is not a correction
    await recordSeverityCorrection({
      organizationId: params.organizationId,
      userId: params.userId,
      incidentId: params.incidentId,
      task: 'incident',
      incidentText: params.text,
      predicted,
      actual: params.actual,
    });
  } catch (error) {
    console.warn(`[arch-model] severity correction not recorded for ${params.incidentId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Update an incident: status transitions, severity, assignment, service/project link. */
export async function updateIncident(params: {
  organizationId: string;
  userId: string;
  incidentId: string;
  input: IncidentUpdateInput;
}) {
  const { organizationId, userId, incidentId, input } = params;

  await requirePermission(organizationId, userId, 'incident.write');

  const existing = await incidentRepository.findById(organizationId, incidentId);
  if (!existing) throw AppError.notFound('Incident not found.');
  if (input.assignedToId) await requirePermission(organizationId, userId, 'incident.assign');

  const incident = await db.$transaction(async (tx) => {
    const data: Parameters<typeof incidentRepository.update>[1] = {};
    const events: Parameters<typeof incidentRepository.addEvent>[0][] = [];
    const audits: Parameters<typeof writeAudit>[0][] = [];
    let statusChange: { from: IncidentStatus; to: IncidentStatus } | null = null;

    if (input.projectId && input.projectId !== existing.projectId) {
      await assertProjectExists(organizationId, input.projectId, tx);
      data.projectId = input.projectId;
    }

    if (input.serviceId !== undefined && input.serviceId !== existing.serviceId) {
      const projectId = data.projectId ?? existing.projectId;
      if (input.serviceId) {
        const service = await assertServiceBelongsToProject(projectId, input.serviceId, tx);
        data.serviceId = service.id;
      } else {
        data.serviceId = null;
      }
      events.push({
        incidentId,
        authorId: userId,
        type: 'LINKED',
        metadata: { serviceId: data.serviceId ?? null, previousServiceId: existing.serviceId },
      });
    }

    if (input.severity && input.severity !== existing.severity) {
      data.severity = input.severity;
      events.push({ incidentId, authorId: userId, type: 'SEVERITY_CHANGED', metadata: { from: existing.severity, to: input.severity } });
      // V6 — a human overriding the severity is the clearest signal there is about what this
      // workspace considers serious. ARCH re-classifies the incident to see what it would have
      // said and records the disagreement. Never allowed to fail the severity change itself.
      void learnFromSeverityChange({
        organizationId,
        userId,
        incidentId,
        text: `${existing.title}. ${existing.description ?? ''}`,
        actual: input.severity,
      });
      audits.push({
        organizationId,
        actorId: userId,
        action: 'incident.severity_change',
        entityType: 'incident',
        entityId: incidentId,
        metadata: { from: existing.severity, to: input.severity },
      });
    }

    if (input.status && input.status !== existing.status) {
      assertTransition(existing.status, input.status);
      const reopen = isReopen(existing.status, input.status);
      data.status = input.status;
      data.resolvedAt = input.status === 'RESOLVED' ? new Date() : reopen ? null : existing.resolvedAt ?? null;
      statusChange = { from: existing.status, to: input.status };
      events.push({
        incidentId,
        authorId: userId,
        type: 'STATUS_CHANGED',
        body: input.message ?? null,
        metadata: { from: existing.status, to: input.status, reopen },
      });
      audits.push({
        organizationId,
        actorId: userId,
        action: reopen ? 'incident.reopen' : 'incident.status_change',
        entityType: 'incident',
        entityId: incidentId,
        metadata: { from: existing.status, to: input.status },
      });
    }

    if (input.assignedToId !== undefined && input.assignedToId !== existing.assignedToId) {
      if (input.assignedToId) await assertAssigneeIsMember(organizationId, input.assignedToId, tx);
      data.assignedToId = input.assignedToId;
      events.push({
        incidentId,
        authorId: userId,
        type: 'ASSIGNED',
        metadata: { from: existing.assignedToId, to: input.assignedToId },
      });
      audits.push({
        organizationId,
        actorId: userId,
        action: 'incident.assign',
        entityType: 'incident',
        entityId: incidentId,
        metadata: { from: existing.assignedToId, to: input.assignedToId },
      });
    }

    if (input.title && input.title !== existing.title) data.title = input.title;
    if (input.description !== undefined && input.description !== existing.description) data.description = input.description;

    if (Object.keys(data).length === 0 && events.length === 0) {
      throw AppError.badRequest('Nothing to update.');
    }

    if (input.message && !statusChange) {
      events.push({ incidentId, authorId: userId, type: 'COMMENT', body: input.message });
    }

    const updated = await incidentRepository.update(incidentId, data, tx);
    for (const event of events) await incidentRepository.addEvent(event, tx);
    for (const audit of audits) await writeAudit(audit, tx);

    if (Object.keys(data).some((key) => ['title', 'description', 'severity', 'status', 'projectId'].includes(key))) {
      await writeAudit(
        {
          organizationId,
          actorId: userId,
          action: 'incident.update',
          entityType: 'incident',
          entityId: incidentId,
          metadata: { fields: Object.keys(data) },
        },
        tx,
      );
    }

    const organization = await organizationRepository.findById(organizationId, tx);
    const project = await projectRepository.findById(organizationId, updated.projectId, tx);
    const service = updated.serviceId ? await serviceRepository.findById(organizationId, updated.serviceId, tx) : null;

    const recipients = await notificationRecipients(organizationId, userId, updated.assignedToId, tx);
    const assignmentChanged = input.assignedToId !== undefined && input.assignedToId !== existing.assignedToId;
    // Assignment-only updates used to be labeled as a status change, so the outbox reason lied.
    const reason = statusChange
      ? 'INCIDENT_STATUS_CHANGED'
      : input.message
        ? 'INCIDENT_COMMENT'
        : assignmentChanged
          ? 'INCIDENT_ASSIGNED'
          : 'INCIDENT_STATUS_CHANGED';
    await notificationRepository.enqueueMany(
      buildIncidentNotifications(
        incidentContext(organization?.name ?? 'Organization', project?.name ?? '—', service?.name ?? null, updated, 'a teammate', {
          change: statusChange,
          message: input.message ?? null,
          assigneeId: updated.assignedToId,
        }),
        recipients,
        reason,
        organizationId,
      ),
      tx,
    );

    // Both the previous and the new service need their derived status refreshed.
    for (const serviceId of new Set([existing.serviceId, updated.serviceId].filter((id): id is string => Boolean(id)))) {
      await recomputeServiceStatus(serviceId, tx);
    }

    return updated;
  });

  return incidentRepository.findByIdWithTimeline(organizationId, incident.id);
}

type CommentIncident = NonNullable<Awaited<ReturnType<typeof incidentRepository.findById>>>;

/**
 * Timeline comment + audit row + notification outbox, inside the caller's transaction.
 * Shared by `addIncidentComment` and by ARCH Copilot when an approved draft is posted.
 * The caller has already authorized the actor and loaded `incident` scoped to the organization.
 */
export async function addIncidentCommentInTransaction(
  tx: DbClient,
  params: { organizationId: string; userId: string; incident: CommentIncident; body: string; metadata?: Record<string, unknown> | null },
) {
  const { organizationId, userId, incident, body, metadata } = params;
  const event = await incidentRepository.addEvent({ incidentId: incident.id, authorId: userId, type: 'COMMENT', body, metadata: metadata ?? null }, tx);
  await writeAudit(
    { organizationId, actorId: userId, action: 'incident.comment', entityType: 'incident', entityId: incident.id, metadata: null },
    tx,
  );

  const organization = await organizationRepository.findById(organizationId, tx);
  const project = await projectRepository.findById(organizationId, incident.projectId, tx);
  const recipients = await notificationRecipients(organizationId, userId, incident.assignedToId, tx);
  await notificationRepository.enqueueMany(
    buildIncidentNotifications(
      incidentContext(organization?.name ?? 'Organization', project?.name ?? '—', incident.service?.name ?? null, incident, 'a teammate', {
        message: body,
      }),
      recipients,
      'INCIDENT_COMMENT',
      organizationId,
    ),
    tx,
  );
  return event;
}

export async function addIncidentComment(params: {
  organizationId: string;
  userId: string;
  incidentId: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const { organizationId, userId, incidentId, body, metadata } = params;
  await requirePermission(organizationId, userId, 'incident.write');

  const existing = await incidentRepository.findById(organizationId, incidentId);
  if (!existing) throw AppError.notFound('Incident not found.');

  await db.$transaction((tx) => addIncidentCommentInTransaction(tx, { organizationId, userId, incident: existing, body, metadata: metadata ?? null }));

  return incidentRepository.findByIdWithTimeline(organizationId, incidentId);
}
