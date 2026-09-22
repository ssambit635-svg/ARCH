import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { enforceRateLimit } from '@/lib/rate-limit';
import { computeBodyHmac, decryptSecret, encryptSecret, generateSecret, sha256, timingSafeEqualStrings, verifyHmacSignature } from '@/lib/crypto';
import type { IncidentSeverity } from '@/generated/prisma/client';
import { webhookRepository } from '../repositories/webhook.repository';
import { incidentRepository } from '../repositories/incident.repository';
import { projectRepository } from '../repositories/project.repository';
import { serviceRepository } from '../repositories/service.repository';
import { createIncidentInternal } from './incident.service';
import { newExternalId } from './slug.service';
import { webhookIngestSchema } from '@/lib/validation';

/**
 * Webhook ingestion.
 *
 * Pipeline (and the order matters):
 *   resolve endpoint → rate limit → verify signature → replay/idempotency check → normalize
 *   payload → create incident + delivery log in one transaction → 202 Accepted.
 *
 * Anything rejected is *recorded* (status REJECTED with the reason) so an operator can see why
 * their integration is not working, without the response telling an attacker anything useful.
 */

export type RequestHeaders = { get(name: string): string | null };

function endpointUrl(provider: string, externalId: string): string {
  return `${env.APP_URL.replace(/\/$/, '')}/api/webhooks/${provider}?endpoint=${externalId}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function pickString(source: Record<string, unknown> | null, path: string[]): string | undefined {
  let current: unknown = source;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return typeof current === 'string' && current.trim() ? current.trim() : undefined;
}

function mapSeverity(value: unknown): IncidentSeverity | undefined {
  if (typeof value !== 'string') return undefined;
  switch (value.toLowerCase()) {
    case 'critical':
    case 'fatal':
    case 'severe':
    case 'p1':
      return 'CRITICAL';
    case 'error':
    case 'high':
    case 'p2':
      return 'HIGH';
    case 'warning':
    case 'warn':
    case 'medium':
    case 'p3':
      return 'MEDIUM';
    case 'info':
    case 'low':
    case 'p4':
    case 'p5':
      return 'LOW';
    default:
      return undefined;
  }
}

/**
 * Provider adapters. Each turns a provider-specific body into ARCH's normalized payload shape.
 * Unknown providers pass through unchanged, and anything a mapping misses can still supply
 * the normalized fields directly.
 */
export function normalizePayload(provider: string, body: unknown): Record<string, unknown> {
  const record = asRecord(body) ?? {};

  switch (provider) {
    case 'github': {
      const title =
        pickString(record, ['alert', 'title']) ??
        (pickString(record, ['repository', 'full_name'])
          ? `${pickString(record, ['action']) ?? 'event'} · ${pickString(record, ['repository', 'full_name'])}`
          : undefined);
      return {
        ...record,
        title,
        description: pickString(record, ['alert', 'body']) ?? pickString(record, ['head_commit', 'message']),
        severity: mapSeverity(pickString(record, ['alert', 'severity'])) ?? 'MEDIUM',
        status: pickString(record, ['alert', 'state']) === 'resolved' ? 'RESOLVED' : 'INVESTIGATING',
        event: pickString(record, ['action']),
      };
    }
    case 'sentry': {
      const title = pickString(record, ['data', 'issue', 'title']) ?? pickString(record, ['issue', 'title']) ?? pickString(record, ['message']);
      return {
        ...record,
        title,
        description: pickString(record, ['data', 'issue', 'culprit']) ?? pickString(record, ['url']),
        severity: mapSeverity(pickString(record, ['data', 'issue', 'level']) ?? pickString(record, ['level'])) ?? 'HIGH',
        event: pickString(record, ['action']) ?? 'sentry-issue',
      };
    }
    case 'grafana': {
      const title = pickString(record, ['title']) ?? pickString(record, ['message']) ?? pickString(record, ['ruleName']);
      return {
        ...record,
        title,
        description: pickString(record, ['message']),
        severity: mapSeverity(pickString(record, ['severity']) ?? pickString(record, ['state'])) ?? 'MEDIUM',
        status: /resolv|ok/i.test(pickString(record, ['state']) ?? '') ? 'RESOLVED' : 'INVESTIGATING',
        event: pickString(record, ['state']) ?? 'alert',
      };
    }
    default:
      return record;
  }
}

export type SignatureCheck =
  | { ok: true; scheme: 'arch' | 'github' }
  | { ok: false; reason: 'malformed' | 'stale' | 'mismatch'; scheme: string };

/**
 * Signature verification supports two schemes:
 *  - `x-arch-signature: t=<unix>,v1=<hex>` — our documented format (HMAC over `t.body`) with
 *    replay protection via the timestamp tolerance;
 *  - `x-hub-signature-256: sha256=<hex>` — the GitHub/Sentry-compatible format (HMAC over the raw
 *    body), where replay protection comes from delivery-id idempotency instead.
 */
export function verifySignature(options: {
  secret: string;
  rawBody: string;
  headers: RequestHeaders;
  toleranceSeconds: number;
  now?: number;
}): SignatureCheck {
  const archHeader = options.headers.get('x-arch-signature');
  if (archHeader) {
    const result = verifyHmacSignature({
      secret: options.secret,
      rawBody: options.rawBody,
      header: archHeader,
      toleranceSeconds: options.toleranceSeconds,
      ...(options.now ? { now: options.now } : {}),
    });
    return result.ok ? { ok: true, scheme: 'arch' } : { ok: false, reason: result.reason, scheme: 'arch' };
  }

  const hubHeader = options.headers.get('x-hub-signature-256');
  if (hubHeader) {
    const provided = (hubHeader.includes('=') ? hubHeader.split('=').slice(1).join('=') : hubHeader).trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(provided)) return { ok: false, reason: 'malformed', scheme: 'github' };
    const expected = computeBodyHmac(options.secret, options.rawBody);
    return timingSafeEqualStrings(expected, provided)
      ? { ok: true, scheme: 'github' }
      : { ok: false, reason: 'mismatch', scheme: 'github' };
  }

  return { ok: false, reason: 'malformed', scheme: 'none' };
}

export async function listEndpoints(params: { organizationId: string; userId: string }) {
  await requirePermission(params.organizationId, params.userId, 'webhook.read');
  return webhookRepository.listEndpoints(params.organizationId);
}

export async function createEndpoint(params: {
  organizationId: string;
  userId: string;
  provider: string;
  projectId: string;
  serviceId?: string | null;
  description?: string | null;
}) {
  await requirePermission(params.organizationId, params.userId, 'webhook.manage');

  const project = await projectRepository.findById(params.organizationId, params.projectId);
  if (!project) throw AppError.notFound('Project not found.');
  if (params.serviceId) {
    const service = await serviceRepository.findInProject(params.projectId, params.serviceId);
    if (!service) throw AppError.notFound('Service not found in this project.');
  }

  const secret = generateSecret('whsec');
  const externalId = newExternalId();

  const endpoint = await db.$transaction(async (tx) => {
    const created = await webhookRepository.createEndpoint(
      {
        organizationId: params.organizationId,
        projectId: params.projectId,
        serviceId: params.serviceId ?? null,
        provider: params.provider,
        externalId,
        description: params.description ?? null,
        secretHash: sha256(secret),
        secretEncrypted: encryptSecret(secret, env.AUTH_SECRET),
      },
      tx,
    );

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'webhook.create',
        entityType: 'webhook_endpoint',
        entityId: created.id,
        metadata: { provider: created.provider, projectId: created.projectId },
      },
      tx,
    );
    return created;
  });

  // The secret is returned exactly once — the database only keeps its hash and an encrypted copy.
  return { endpoint, secret, url: endpointUrl(endpoint.provider, endpoint.externalId) };
}

export async function updateEndpoint(params: {
  organizationId: string;
  userId: string;
  endpointId: string;
  description?: string | null;
  isActive?: boolean;
  projectId?: string;
  serviceId?: string | null;
}) {
  await requirePermission(params.organizationId, params.userId, 'webhook.manage');
  const existing = await webhookRepository.findEndpointById(params.organizationId, params.endpointId);
  if (!existing) throw AppError.notFound('Webhook endpoint not found.');

  if (params.projectId) {
    const project = await projectRepository.findById(params.organizationId, params.projectId);
    if (!project) throw AppError.notFound('Project not found.');
  }

  return db.$transaction(async (tx) => {
    await webhookRepository.updateEndpoint(
      params.organizationId,
      params.endpointId,
      {
        ...(params.description !== undefined ? { description: params.description } : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.serviceId !== undefined ? { serviceId: params.serviceId } : {}),
      },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'webhook.update',
        entityType: 'webhook_endpoint',
        entityId: params.endpointId,
        metadata: { isActive: params.isActive ?? existing.isActive },
      },
      tx,
    );
    return webhookRepository.findEndpointById(params.organizationId, params.endpointId, tx);
  });
}

export async function rotateEndpointSecret(params: { organizationId: string; userId: string; endpointId: string }) {
  await requirePermission(params.organizationId, params.userId, 'webhook.manage');
  const existing = await webhookRepository.findEndpointById(params.organizationId, params.endpointId);
  if (!existing) throw AppError.notFound('Webhook endpoint not found.');

  const secret = generateSecret('whsec');
  await db.$transaction(async (tx) => {
    await webhookRepository.updateEndpoint(
      params.organizationId,
      params.endpointId,
      { secretHash: sha256(secret), secretEncrypted: encryptSecret(secret, env.AUTH_SECRET) },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'webhook.rotate_secret',
        entityType: 'webhook_endpoint',
        entityId: params.endpointId,
        metadata: { provider: existing.provider },
      },
      tx,
    );
  });

  return { secret, url: endpointUrl(existing.provider, existing.externalId) };
}

export async function deleteEndpoint(params: { organizationId: string; userId: string; endpointId: string }) {
  await requirePermission(params.organizationId, params.userId, 'webhook.manage');
  const existing = await webhookRepository.findEndpointById(params.organizationId, params.endpointId);
  if (!existing) throw AppError.notFound('Webhook endpoint not found.');

  return db.$transaction(async (tx) => {
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'webhook.delete',
        entityType: 'webhook_endpoint',
        entityId: params.endpointId,
        metadata: { provider: existing.provider },
      },
      tx,
    );
    await webhookRepository.removeEndpoint(params.organizationId, params.endpointId, tx);
    return { id: params.endpointId };
  });
}

export async function listDeliveries(params: {
  organizationId: string;
  userId: string;
  endpointId: string;
  page: number;
  pageSize: number;
}) {
  await requirePermission(params.organizationId, params.userId, 'webhook.read');
  const endpoint = await webhookRepository.findEndpointById(params.organizationId, params.endpointId);
  if (!endpoint) throw AppError.notFound('Webhook endpoint not found.');

  const [items, total] = await Promise.all([
    webhookRepository.listDeliveries(params.endpointId, { skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
    webhookRepository.countDeliveries(params.endpointId),
  ]);

  return { items, page: params.page, pageSize: params.pageSize, total, totalPages: Math.max(1, Math.ceil(total / params.pageSize)) };
}

export type IngestResult = {
  statusCode: number;
  body: Record<string, unknown>;
  deliveryId?: string;
  incidentId?: string;
};

/** The public ingestion entrypoint used by POST /api/webhooks/[provider]. */
export async function ingest(params: {
  provider: string;
  rawBody: string;
  headers: RequestHeaders;
  searchParams: URLSearchParams;
  clientIp: string;
}): Promise<IngestResult> {
  const externalId = params.searchParams.get('endpoint') ?? params.headers.get('x-arch-endpoint') ?? undefined;
  if (!externalId) {
    throw AppError.unauthorized('Unknown webhook endpoint.');
  }

  const endpoint = await webhookRepository.findEndpointByExternalId(externalId);
  if (!endpoint || !endpoint.isActive) {
    throw AppError.unauthorized('Unknown webhook endpoint.');
  }

  // Two limits: one per endpoint (protects the tenant's data) and one per source IP (protects us).
  enforceRateLimit(`webhook:endpoint:${endpoint.id}`, { limit: 120, windowMs: 60_000 });
  enforceRateLimit(`webhook:ip:${params.clientIp}`, { limit: 240, windowMs: 60_000 });

  const secret = decryptSecret(endpoint.secretEncrypted, env.AUTH_SECRET);
  const check = verifySignature({
    secret,
    rawBody: params.rawBody,
    headers: params.headers,
    toleranceSeconds: env.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
  });

  const deliveryKey =
    params.headers.get('x-arch-delivery-id') ??
    params.headers.get('x-github-delivery') ??
    params.headers.get('sentry-hook-resource')
      ? `${params.headers.get('sentry-hook-resource')}:${sha256(params.rawBody)}`
      : sha256(params.rawBody);

  if (!check.ok) {
    const delivery = await webhookRepository.createDelivery({
      endpointId: endpoint.id,
      deliveryKey: `${deliveryKey}:rejected:${Date.now()}`,
      status: 'REJECTED',
      httpStatus: 401,
      error: `signature ${check.reason} (${check.scheme})`,
      payload: null,
    });
    await webhookRepository.markDelivered(endpoint.id, new Date());
    throw AppError.unauthorized(`Webhook signature rejected (${check.reason}).`, { deliveryId: delivery.id });
  }

  // Idempotency: a delivery we already accepted is a no-op (202), never a second incident.
  const previous = await webhookRepository.findDelivery(endpoint.id, deliveryKey);
  if (previous && (previous.status === 'ACCEPTED' || previous.status === 'DUPLICATE')) {
    return {
      statusCode: 202,
      body: { status: 'duplicate', deliveryId: previous.id, incidentId: previous.incidentId ?? undefined },
      deliveryId: previous.id,
      ...(previous.incidentId ? { incidentId: previous.incidentId } : {}),
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(params.rawBody);
  } catch {
    const delivery = await webhookRepository.createDelivery({
      endpointId: endpoint.id,
      deliveryKey: `${deliveryKey}:invalid-json:${Date.now()}`,
      status: 'FAILED',
      httpStatus: 400,
      error: 'body is not valid JSON',
    });
    throw AppError.badRequest('Webhook body must be valid JSON.', { deliveryId: delivery.id });
  }

  const normalized = normalizePayload(params.provider, json);
  const parsed = webhookIngestSchema.safeParse(normalized);
  if (!parsed.success) {
    const delivery = await webhookRepository.createDelivery({
      endpointId: endpoint.id,
      deliveryKey: `${deliveryKey}:invalid-payload:${Date.now()}`,
      status: 'FAILED',
      httpStatus: 422,
      error: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ').slice(0, 300),
      payload: normalized as Record<string, unknown>,
    });
    throw AppError.validation(
      'Webhook payload is missing required fields.',
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }

  const payload = parsed.data;
  const actorLabel = `webhook:${endpoint.provider}`;

  // Resolve the service: explicit id, then slug inside the endpoint's project, then the endpoint default.
  let serviceId: string | null = endpoint.serviceId ?? null;
  if (payload.serviceId) {
    const service = await serviceRepository.findByIds(endpoint.project.organizationId, [payload.serviceId]);
    if (service.length === 0) throw AppError.notFound('Service in payload does not belong to this organization.');
    serviceId = service[0]!.id;
  } else if (payload.serviceSlug) {
    const services = await serviceRepository.list(endpoint.project.organizationId, { projectId: endpoint.projectId });
    const match = services.find((service) => service.slug === payload.serviceSlug);
    if (match) serviceId = match.id;
  }

  // Alert-storm suppression: an identical open incident on the same service is updated, not duplicated.
  if (payload.dedupeKey) {
    const existingIncident = await incidentRepository.findOpenByDedupeKey(endpoint.project.organizationId, payload.dedupeKey);
    if (existingIncident) {
      const delivery = await db.$transaction(async (tx) => {
        const created = await webhookRepository.createDelivery(
          {
            endpointId: endpoint.id,
            deliveryKey,
            status: 'DUPLICATE',
            httpStatus: 202,
            incidentId: existingIncident.id,
            payload: normalized as Record<string, unknown>,
          },
          tx,
        );
        await incidentRepository.addEvent(
          {
            incidentId: existingIncident.id,
            authorId: null,
            actorLabel,
            type: 'COMMENT',
            body: payload.description ?? 'Duplicate alert received from the same source.',
            metadata: { dedupeKey: payload.dedupeKey, event: payload.event ?? null },
          },
          tx,
        );
        await webhookRepository.markDelivered(endpoint.id, new Date(), tx);
        return created;
      });

      return { statusCode: 202, body: { status: 'duplicate', deliveryId: delivery.id, incidentId: existingIncident.id }, deliveryId: delivery.id, incidentId: existingIncident.id };
    }
  }

  const result = await db.$transaction(async (tx) => {
    const incident = await createIncidentInternal(tx, {
      organizationId: endpoint.project.organizationId,
      actorId: null,
      actorLabel,
      source: 'WEBHOOK',
      webhookEndpointId: endpoint.id,
      skipPermissionCheck: true,
      dedupeKey: payload.dedupeKey ?? null,
      input: {
        title: payload.title,
        description: payload.description ?? null,
        severity: payload.severity,
        projectId: endpoint.projectId,
        serviceId,
        assignedToId: null,
        startedAt: payload.timestamp ?? null,
      },
    });

    const delivery = await webhookRepository.createDelivery(
      {
        endpointId: endpoint.id,
        deliveryKey,
        status: 'ACCEPTED',
        httpStatus: 202,
        incidentId: incident.id,
        payload: normalized as Record<string, unknown>,
      },
      tx,
    );
    await webhookRepository.markDelivered(endpoint.id, new Date(), tx);
    return { incident, delivery };
  });

  return {
    statusCode: 202,
    body: { status: 'accepted', deliveryId: result.delivery.id, incidentId: result.incident.id },
    deliveryId: result.delivery.id,
    incidentId: result.incident.id,
  };
}
