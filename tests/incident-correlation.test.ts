import { beforeEach, describe, expect, it } from 'vitest';
import { computeHmacSignature } from '@/lib/crypto';
import { alertFingerprint, normalizeAlertText } from '@/server/services/incident-fingerprint';
import { createEndpoint, ingest } from '@/server/services/webhook.service';
import { incidentCorrelation } from '@/server/services/insights.service';
import { createTestIncident, createTenant, db, resetDatabase } from './helpers/db';
import { resetRateLimits } from '@/lib/rate-limit';

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

/**
 * V7 — incident correlation & dedup:
 *   - alert fingerprints survive dirty titles (fresh numbers, hosts, timestamps each alert);
 *   - a repeat of the same alert signature collapses onto the open incident even without an
 *     explicit dedupeKey;
 *   - the correlation view groups repeats and surfaces the strongest root-cause evidence.
 */

describe('alert fingerprints', () => {
  it('normalizes away volatile noise but keeps discriminating error codes', () => {
    expect(normalizeAlertText('ALERT: Disk 91% full on db-1 (2h ago)')).toBe(normalizeAlertText('disk 94% full on db-02 at 17:22:03'));
    expect(normalizeAlertText('500 errors on checkout')).not.toBe(normalizeAlertText('404 errors on checkout'));
  });

  it('is stable across hosts, numbers and timestamps', () => {
    const a = alertFingerprint({ source: 'grafana', serviceKey: 'payments-api', title: 'ALERT: Checkout latency spike (pod-7d2f9a1)' });
    const b = alertFingerprint({ source: 'grafana', serviceKey: 'payments-api', title: 'Checkout latency spike' });
    expect(a).toBe(b);
  });

  it('separates different failures, services and sources', () => {
    const base = { source: 'grafana', serviceKey: 'payments-api', title: 'Queue backlog growing' };
    expect(alertFingerprint(base)).not.toBe(alertFingerprint({ ...base, title: 'Memory exhaustion on workers' }));
    expect(alertFingerprint(base)).not.toBe(alertFingerprint({ ...base, serviceKey: 'checkout-api' }));
    expect(alertFingerprint(base)).not.toBe(alertFingerprint({ ...base, source: 'sentry' }));
  });

  it('falls back to the description for boilerplate titles', () => {
    const a = alertFingerprint({ source: 'pagerduty', serviceKey: 'api', title: 'ALERT', description: 'Postgres connection pool saturated' });
    const b = alertFingerprint({ source: 'pagerduty', serviceKey: 'api', title: 'ALERT', description: 'TLS certificate expires in 2 days' });
    expect(a).not.toBe(b);
  });
});

describe('webhook alert-storm suppression via fingerprint', () => {
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

  function signedRequest(secret: string, payload: unknown, deliveryId: string) {
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    return { rawBody, signature: computeHmacSignature(secret, timestamp, rawBody), timestamp, deliveryId };
  }

  async function deliver(secret: string, endpointExternalId: string, payload: unknown, deliveryId: string) {
    const request = signedRequest(secret, payload, deliveryId);
    return ingest({
      provider: 'grafana',
      rawBody: request.rawBody,
      headers: headers({ 'x-arch-signature': `t=${request.timestamp},v1=${request.signature}`, 'x-arch-delivery-id': request.deliveryId }),
      searchParams: new URLSearchParams({ endpoint: endpointExternalId }),
      clientIp: '203.0.113.7',
    });
  }

  it('collapses the same alert signature even with no dedupeKey in the payload', async () => {
    const { secret, endpoint, organization } = await setupEndpoint();

    const first = await deliver(secret, endpoint.externalId, { title: 'ALERT: Disk 91% on db-1', severity: 'HIGH' }, 'd-1');
    const second = await deliver(secret, endpoint.externalId, { title: 'Disk 94% on db-02', severity: 'CRITICAL' }, 'd-2');

    expect(first.body.status).toBe('accepted');
    expect(second.body.status).toBe('duplicate');
    expect(second.body.incidentId).toBe(first.body.incidentId);
    expect(await db.incident.count({ where: { organizationId: organization.id } })).toBe(1);

    const incident = await db.incident.findFirst({ where: { organizationId: organization.id } });
    expect(incident?.fingerprint).toBeTruthy();
  });

  it('still opens separate incidents for genuinely different alerts', async () => {
    const { secret, endpoint, organization } = await setupEndpoint();

    await deliver(secret, endpoint.externalId, { title: 'Disk 91% on db-1', severity: 'HIGH' }, 'd-1');
    await deliver(secret, endpoint.externalId, { title: 'Memory exhaustion on workers', severity: 'HIGH' }, 'd-2');

    expect(await db.incident.count({ where: { organizationId: organization.id } })).toBe(2);
  });

  it('does not collapse once the earlier incident is resolved', async () => {
    const { secret, endpoint, organization } = await setupEndpoint();

    // metadata varies so the raw bodies (and delivery keys) differ — only the signature matches.
    const first = await deliver(secret, endpoint.externalId, { title: 'Queue backlog growing', severity: 'HIGH', metadata: { n: 1 } }, 'd-1');
    await db.incident.update({ where: { id: String(first.body.incidentId) }, data: { status: 'RESOLVED', resolvedAt: new Date() } });

    const second = await deliver(secret, endpoint.externalId, { title: 'Queue backlog growing', severity: 'HIGH', metadata: { n: 2 } }, 'd-2');
    expect(second.body.status).toBe('accepted');
    expect(second.body.incidentId).not.toBe(first.body.incidentId);
  });
});

describe('incident correlation (same root cause)', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
  });

  it('groups repeat alerts by fingerprint and offers the resolved twin\'s root cause', async () => {
    const tenant = await createTenant('Acme');
    const fingerprint = alertFingerprint({ source: 'WEBHOOK', serviceKey: tenant.service.name, title: 'Checkout 502s' });

    const past = await createTestIncident({ organizationId: tenant.organization.id, projectId: tenant.project.id, serviceId: tenant.service.id, createdById: tenant.owner.id, title: 'Checkout 502s from db-1' });
    await db.incident.update({ where: { id: past.id }, data: { fingerprint, status: 'RESOLVED', resolvedAt: new Date(Date.now() - 86_400_000) } });
    await db.incidentEvent.create({
      data: {
        incidentId: past.id,
        type: 'COMMENT',
        body: 'Root cause was a bad connection pool size after the deploy. Rolled back the config and the error rate dropped.',
      },
    });

    const current = await createTestIncident({ organizationId: tenant.organization.id, projectId: tenant.project.id, serviceId: tenant.service.id, createdById: tenant.owner.id, title: 'Checkout 502s from db-2' });
    await db.incident.update({ where: { id: current.id }, data: { fingerprint } });

    const report = await incidentCorrelation({ organizationId: tenant.organization.id, userId: tenant.owner.id, incidentId: current.id });

    expect(report.totalOccurrences).toBe(2);
    expect(report.openOccurrences).toBe(1);
    expect(report.repeats.map((r) => r.id).sort()).toEqual([past.id, current.id].sort());
    expect(report.sharedRootCause.evidence).toBe('shared_alert_signature');
    expect(report.sharedRootCause.fromIncidentId).toBe(past.id);
    expect(report.sharedRootCause.rootCause).toMatch(/connection pool/i);
    expect(report.sharedRootCause.fix?.join(' ')).toMatch(/rolled back/i);
  });

  it('fingerprintes legacy incidents on first read and finds their repeats', async () => {
    const tenant = await createTenant('Acme');
    const fingerprint = alertFingerprint({ source: 'DASHBOARD', serviceKey: tenant.service.name, title: 'TLS certificate expiring in 2 days' });

    const legacy = await createTestIncident({ organizationId: tenant.organization.id, projectId: tenant.project.id, serviceId: tenant.service.id, createdById: tenant.owner.id, title: 'TLS certificate expiring in 2 days' });
    expect((await db.incident.findUnique({ where: { id: legacy.id } }))?.fingerprint).toBeNull();

    const twin = await createTestIncident({ organizationId: tenant.organization.id, projectId: tenant.project.id, serviceId: tenant.service.id, createdById: tenant.owner.id, title: 'TLS certificate expiring in 5 days' });
    await db.incident.update({ where: { id: twin.id }, data: { fingerprint } });

    const report = await incidentCorrelation({ organizationId: tenant.organization.id, userId: tenant.owner.id, incidentId: legacy.id });
    expect(report.totalOccurrences).toBe(2);
    // Lazily backfilled so the group holds together from now on.
    expect((await db.incident.findUnique({ where: { id: legacy.id } }))?.fingerprint).toBeTruthy();
  });

  it('never claims a shared root cause it does not have', async () => {
    const tenant = await createTenant('Acme');
    const incident = await createTestIncident({ organizationId: tenant.organization.id, projectId: tenant.project.id, serviceId: tenant.service.id, createdById: tenant.owner.id, title: 'Something entirely new' });

    const report = await incidentCorrelation({ organizationId: tenant.organization.id, userId: tenant.owner.id, incidentId: incident.id });
    expect(report.totalOccurrences).toBe(1);
    expect(report.sharedRootCause.evidence).toBe('none');
    expect(report.sharedRootCause.rootCause).toBeNull();
  });
});
