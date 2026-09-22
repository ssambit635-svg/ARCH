import { beforeEach, describe, expect, it } from 'vitest';
import { computeBodyHmac, computeHmacSignature, decryptSecret, sha256, verifyHmacSignature } from '@/lib/crypto';
import { ingest, verifySignature } from '@/server/services/webhook.service';
import { createEndpoint } from '@/server/services/webhook.service';
import { resetDatabase, createTenant, db } from './helpers/db';
import { AppError } from '@/lib/errors';
import { resetRateLimits } from '@/lib/rate-limit';

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

describe('webhook signature verification', () => {
  const secret = 'whsec_test_secret';
  const body = JSON.stringify({ title: 'Disk almost full', severity: 'HIGH' });
  const now = 1_700_000_000_000;

  it('accepts a correctly signed request', () => {
    const timestamp = String(Math.floor(now / 1000));
    const signature = computeHmacSignature(secret, timestamp, body);
    const result = verifyHmacSignature({
      secret,
      rawBody: body,
      header: `t=${timestamp},v1=${signature}`,
      toleranceSeconds: 300,
      now,
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects a wrong signature', () => {
    const timestamp = String(Math.floor(now / 1000));
    const result = verifyHmacSignature({
      secret,
      rawBody: body,
      header: `t=${timestamp},v1=${'a'.repeat(64)}`,
      toleranceSeconds: 300,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rejects a stale timestamp (replay)', () => {
    const timestamp = String(Math.floor(now / 1000) - 3600);
    const signature = computeHmacSignature(secret, timestamp, body);
    const result = verifyHmacSignature({ secret, rawBody: body, header: `t=${timestamp},v1=${signature}`, toleranceSeconds: 300, now });
    expect(result).toEqual({ ok: false, reason: 'stale' });
  });

  it('rejects malformed headers and missing headers', () => {
    expect(verifyHmacSignature({ secret, rawBody: body, header: null, toleranceSeconds: 300, now }).ok).toBe(false);
    expect(verifyHmacSignature({ secret, rawBody: body, header: 'nonsense', toleranceSeconds: 300, now })).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyHmacSignature({ secret, rawBody: body, header: 't=abc,v1=xyz', toleranceSeconds: 300, now })).toEqual({ ok: false, reason: 'malformed' });
  });

  it('treats a body changed after signing as a mismatch', () => {
    const timestamp = String(Math.floor(now / 1000));
    const signature = computeHmacSignature(secret, timestamp, body);
    const result = verifyHmacSignature({
      secret,
      rawBody: body.replace('HIGH', 'LOW'),
      header: `t=${timestamp},v1=${signature}`,
      toleranceSeconds: 300,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('supports the GitHub-style x-hub-signature-256 scheme', () => {
    const check = verifySignature({
      secret,
      rawBody: body,
      headers: headers({ 'x-hub-signature-256': `sha256=${computeBodyHmac(secret, body)}` }),
      toleranceSeconds: 300,
    });
    expect(check).toEqual({ ok: true, scheme: 'github' });

    const bad = verifySignature({ secret, rawBody: body, headers: headers({ 'x-hub-signature-256': 'sha256=deadbeef' }), toleranceSeconds: 300 });
    expect(bad.ok).toBe(false);

    const none = verifySignature({ secret, rawBody: body, headers: headers({}), toleranceSeconds: 300 });
    expect(none).toEqual({ ok: false, reason: 'malformed', scheme: 'none' });
  });
});

describe('webhook ingestion pipeline', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
  });

  async function setupEndpoint() {
    const tenant = await createTenant('Acme');
    const created = await createEndpoint({
      organizationId: tenant.organization.id,
      userId: tenant.owner.id,
      provider: 'grafana',
      projectId: tenant.project.id,
      serviceId: tenant.service.id,
      description: 'test',
    });
    return { ...tenant, ...created };
  }

  function signedRequest(secret: string, payload: unknown, deliveryId = 'delivery-1') {
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    return {
      rawBody,
      signature: computeHmacSignature(secret, timestamp, rawBody),
      timestamp,
      deliveryId,
    };
  }

  it('stores the secret encrypted and only its hash in clear', async () => {
    const { secret, endpoint } = await setupEndpoint();
    expect(endpoint.secretHash).toBe(sha256(secret));
    expect(endpoint.secretEncrypted).not.toContain(secret);
    expect(decryptSecret(endpoint.secretEncrypted, process.env.AUTH_SECRET!)).toBe(secret);
  });

  it('creates an incident from a valid payload', async () => {
    const { secret, endpoint, organization, service } = await setupEndpoint();
    const request = signedRequest(secret, { title: 'Checkout errors rising', severity: 'HIGH', status: 'INVESTIGATING' });

    const result = await ingest({
      provider: 'grafana',
      rawBody: request.rawBody,
      headers: headers({ 'x-arch-signature': `t=${request.timestamp},v1=${request.signature}`, 'x-arch-delivery-id': request.deliveryId }),
      searchParams: new URLSearchParams({ endpoint: endpoint.externalId }),
      clientIp: '203.0.113.7',
    });

    expect(result.statusCode).toBe(202);
    expect(result.body.status).toBe('accepted');

    const incident = await db.incident.findFirstOrThrow({ where: { organizationId: organization.id } });
    expect(incident.title).toBe('Checkout errors rising');
    expect(incident.severity).toBe('HIGH');
    expect(incident.source).toBe('WEBHOOK');
    expect(incident.serviceId).toBe(service.id);
    expect(incident.createdById).toBeNull();

    // Timeline + audit + delivery log are all written for a machine-originated incident.
    const events = await db.incidentEvent.findMany({ where: { incidentId: incident.id } });
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('CREATED');
    expect(events[0]!.actorLabel).toBe('webhook:grafana');
    expect(await db.auditLog.count({ where: { action: 'incident.create', organizationId: organization.id } })).toBe(1);
    expect(await db.webhookDelivery.count({ where: { endpointId: endpoint.id, status: 'ACCEPTED' } })).toBe(1);
  });

  it('is idempotent: the same delivery id never opens a second incident', async () => {
    const { secret, endpoint, organization } = await setupEndpoint();
    const request = signedRequest(secret, { title: 'Duplicate alert' });
    const options = {
      provider: 'grafana',
      rawBody: request.rawBody,
      headers: headers({ 'x-arch-signature': `t=${request.timestamp},v1=${request.signature}`, 'x-arch-delivery-id': 'fixed-delivery-id' }),
      searchParams: new URLSearchParams({ endpoint: endpoint.externalId }),
      clientIp: '203.0.113.7',
    };

    const first = await ingest(options);
    const second = await ingest(options);

    expect(first.body.status).toBe('accepted');
    expect(second.body.status).toBe('duplicate');
    expect(await db.incident.count({ where: { organizationId: organization.id } })).toBe(1);
  });

  it('collapses a repeating alert with the same dedupeKey onto the open incident', async () => {
    const { secret, endpoint, organization } = await setupEndpoint();

    const first = signedRequest(secret, { title: 'Disk 91% on db-1', severity: 'HIGH', dedupeKey: 'disk-db-1' }, 'd-1');
    await ingest({
      provider: 'grafana',
      rawBody: first.rawBody,
      headers: headers({ 'x-arch-signature': `t=${first.timestamp},v1=${first.signature}`, 'x-arch-delivery-id': first.deliveryId }),
      searchParams: new URLSearchParams({ endpoint: endpoint.externalId }),
      clientIp: '203.0.113.7',
    });

    const second = signedRequest(secret, { title: 'Disk 94% on db-1', severity: 'CRITICAL', dedupeKey: 'disk-db-1' }, 'd-2');
    const result = await ingest({
      provider: 'grafana',
      rawBody: second.rawBody,
      headers: headers({ 'x-arch-signature': `t=${second.timestamp},v1=${second.signature}`, 'x-arch-delivery-id': second.deliveryId }),
      searchParams: new URLSearchParams({ endpoint: endpoint.externalId }),
      clientIp: '203.0.113.7',
    });

    expect(result.body.status).toBe('duplicate');
    expect(await db.incident.count({ where: { organizationId: organization.id } })).toBe(1);
    const events = await db.incidentEvent.findMany({ where: { incidentId: String(result.body.incidentId) } });
    expect(events.some((event) => event.type === 'COMMENT')).toBe(true);
  });

  it('rejects an invalid signature with 401 and records the rejection', async () => {
    const { endpoint, organization } = await setupEndpoint();
    const rawBody = JSON.stringify({ title: 'Forged' });

    await expect(
      ingest({
        provider: 'grafana',
        rawBody,
        headers: headers({ 'x-arch-signature': `t=${Math.floor(Date.now() / 1000)},v1=${'b'.repeat(64)}` }),
        searchParams: new URLSearchParams({ endpoint: endpoint.externalId }),
        clientIp: '203.0.113.9',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(await db.incident.count({ where: { organizationId: organization.id } })).toBe(0);
    const deliveries = await db.webhookDelivery.findMany({ where: { endpointId: endpoint.id } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]!.status).toBe('REJECTED');
    expect(deliveries[0]!.httpStatus).toBe(401);
  });

  it('rejects an unknown or disabled endpoint without leaking anything', async () => {
    await setupEndpoint();
    await expect(
      ingest({
        provider: 'grafana',
        rawBody: '{}',
        headers: headers({}),
        searchParams: new URLSearchParams({ endpoint: 'does-not-exist' }),
        clientIp: '203.0.113.9',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects a payload that is missing required fields with 422', async () => {
    const { secret, endpoint } = await setupEndpoint();
    const request = signedRequest(secret, { not_a_title: true }, 'bad-payload');

    await expect(
      ingest({
        provider: 'grafana',
        rawBody: request.rawBody,
        headers: headers({ 'x-arch-signature': `t=${request.timestamp},v1=${request.signature}`, 'x-arch-delivery-id': request.deliveryId }),
        searchParams: new URLSearchParams({ endpoint: endpoint.externalId }),
        clientIp: '203.0.113.7',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    expect(await db.webhookDelivery.count({ where: { endpointId: endpoint.id, status: 'FAILED' } })).toBe(1);
  });
});
