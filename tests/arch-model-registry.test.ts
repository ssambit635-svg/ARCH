import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetRateLimits } from '@/lib/rate-limit';
import { setAiProviderForTesting } from '@/server/ai/provider';
import { createArchNativeProvider } from '@/server/ai/arch-native';
import {
  activateModelVersion,
  getModelStatus,
  getOrganizationModel,
  processTrainingJobs,
  resetArchModelCache,
  rollbackModel,
  trainModel,
} from '@/server/services/archModel.service';
import { addMember, createTenant, createTestIncident, createTestUser, db, resetDatabase } from './helpers/db';

/**
 * V3 model registry end to end (real database):
 *  - retraining is a background job, never synchronous in the API path;
 *  - every run becomes a registry version; promotion only when the candidate beats the active one;
 *  - rollback / manual activation of any version, fully audited (which version served when).
 */

async function setup(name = 'Acme') {
  const tenant = await createTenant(name);
  const responder = await createTestUser(`responder@${name.toLowerCase()}.test`, 'Riya Responder');
  const viewer = await createTestUser(`viewer@${name.toLowerCase()}.test`, 'Vik Viewer');
  await addMember(tenant.organization.id, responder.id, 'RESPONDER');
  await addMember(tenant.organization.id, viewer.id, 'VIEWER');
  return { ...tenant, responder, viewer };
}

async function resolvedIncident(tenant: Awaited<ReturnType<typeof setup>>, title: string, notes: string[]) {
  const incident = await createTestIncident({
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    serviceId: tenant.service.id,
    createdById: tenant.owner.id,
    title,
    severity: 'HIGH',
  });
  const start = Date.now() - 3 * 60 * 60_000;
  for (const [index, body] of notes.entries()) {
    await db.incidentEvent.create({ data: { incidentId: incident.id, authorId: tenant.responder.id, type: 'COMMENT', body, createdAt: new Date(start + index * 60_000) } });
  }
  await db.incident.update({ where: { id: incident.id }, data: { status: 'RESOLVED', startedAt: new Date(start), resolvedAt: new Date(start + 40 * 60_000) } });
  return incident;
}

/** Enqueue through the API path, then run the worker pass. */
async function trainAndDrain(tenant: Awaited<ReturnType<typeof setup>>) {
  const job = await trainModel({ organizationId: tenant.organization.id, userId: tenant.owner.id });
  const processed = await processTrainingJobs();
  return { job, processed };
}

describe('ARCH model registry (V3)', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    resetArchModelCache();
    setAiProviderForTesting(createArchNativeProvider());
  });

  afterEach(() => {
    setAiProviderForTesting(null);
  });

  it('the API only enqueues; the worker trains and the first model is promoted', async () => {
    const acme = await setup();
    await resolvedIncident(acme, 'Search slow: database connection pool exhausted', [
      'Connections pinned at 100%, queries queueing.',
      'Root cause: leaked connections after the ORM upgrade.',
      'Restarted api and set pool max to 50; recovered.',
    ]);

    const job = await trainModel({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(job).toMatchObject({ status: 'PENDING' });
    // Nothing trained yet — the web request did not touch the model.
    expect(await db.archModelVersion.count()).toBe(0);

    const processed = await processTrainingJobs();
    expect(processed).toMatchObject({ processed: 1, promoted: 1, rejected: 0, failed: 0 });

    const version = await db.archModelVersion.findFirstOrThrow({ where: { organizationId: acme.organization.id } });
    expect(version).toMatchObject({ version: 1, status: 'ACTIVE' });
    const active = await db.archModel.findUniqueOrThrow({ where: { organizationId: acme.organization.id } });
    expect(active.activeVersionId).toBe(version.id);
  });

  it('promotes when the candidate is stronger and rejects when it is not', async () => {
    const acme = await setup();
    await resolvedIncident(acme, 'Payments API 502s after deploy', ['error rate 12% after deploy', 'rolled back payments-api to v41', 'recovered']);
    await trainAndDrain(acme);

    // Same data again → no improvement possible → registered, evaluated, REJECTED.
    await trainAndDrain(acme);
    let versions = await db.archModelVersion.findMany({ where: { organizationId: acme.organization.id }, orderBy: { version: 'asc' } });
    expect(versions.map((version) => version.status)).toEqual(['ACTIVE', 'REJECTED']);
    expect((await db.archModel.findUniqueOrThrow({ where: { organizationId: acme.organization.id } })).version).toBe(1);

    // New resolved incident → strictly more team data → promoted to v3.
    await resolvedIncident(acme, 'Login broken: certificate expired on auth gateway', ['users cannot log in, TLS handshake failing', 'renewed the certificate via letsencrypt', 'recovered']);
    await trainAndDrain(acme);
    versions = await db.archModelVersion.findMany({ where: { organizationId: acme.organization.id }, orderBy: { version: 'asc' } });
    expect(versions.map((version) => version.status)).toEqual(['SUPERSEDED', 'REJECTED', 'ACTIVE']);
    expect((await db.archModel.findUniqueOrThrow({ where: { organizationId: acme.organization.id } })).version).toBe(3);
  });

  it('rollback restores the previously active version and audits the switch', async () => {
    const acme = await setup();
    await resolvedIncident(acme, 'Webhooks failing: queue backlog on rabbitmq', ['queue depth 40k and climbing', 'Root cause: poison message retried forever', 'moved message to dead-letter queue']);
    await trainAndDrain(acme);
    await resolvedIncident(acme, 'CDN cache stampede after purge', ['origin load spiked 10x', 'enabled request collapsing', 'recovered']);
    await trainAndDrain(acme);

    const active = await db.archModel.findUniqueOrThrow({ where: { organizationId: acme.organization.id } });
    expect(active.version).toBe(2);

    const result = await rollbackModel({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(result).toMatchObject({ version: 1, previousVersion: 2, reason: 'rollback' });

    const statuses = await db.archModelVersion.findMany({ where: { organizationId: acme.organization.id }, orderBy: { version: 'asc' }, select: { version: true, status: true } });
    expect(statuses).toEqual([
      { version: 1, status: 'ACTIVE' },
      { version: 2, status: 'SUPERSEDED' },
    ]);
    expect((await db.archModel.findUniqueOrThrow({ where: { organizationId: acme.organization.id } })).version).toBe(1);
    // The runtime cache serves the rolled-back model.
    resetArchModelCache();
    const runtime = await getOrganizationModel(acme.organization.id);
    expect(runtime.teamDocuments).toBe(1);

    // The audit log shows which version served when.
    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: acme.organization.id, action: 'arch_model.activate' } });
    expect(audit.metadata).toMatchObject({ version: 1, fromVersion: 2, reason: 'rollback' });
  });

  it('any registry version can be activated manually; guards apply', async () => {
    const acme = await setup();
    const globex = await setup('Globex');
    await resolvedIncident(acme, 'Cron overlap locked the jobs table', ['two cron runs overlapped and deadlocked', 'killed the stale run and added a lock']);
    await trainAndDrain(acme);
    await resolvedIncident(acme, 'SMS provider outage', ['provider returned 503 for 20 minutes', 'failed over to the backup provider']);
    await trainAndDrain(acme);

    const [v1] = await db.archModelVersion.findMany({ where: { organizationId: acme.organization.id }, orderBy: { version: 'asc' } });

    // Cross-tenant version id → 404, never a leak.
    await expect(activateModelVersion({ organizationId: globex.organization.id, userId: globex.owner.id, versionId: v1!.id })).rejects.toMatchObject({ status: 404 });
    // VIEWER cannot activate.
    await expect(activateModelVersion({ organizationId: acme.organization.id, userId: acme.viewer.id, versionId: v1!.id })).rejects.toMatchObject({ status: 403 });
    // Already active → conflict.
    const current = await db.archModel.findUniqueOrThrow({ where: { organizationId: acme.organization.id } });
    await expect(activateModelVersion({ organizationId: acme.organization.id, userId: acme.owner.id, versionId: current.activeVersionId! })).rejects.toMatchObject({ status: 409 });

    // Owner rolls back to v1 explicitly.
    const result = await activateModelVersion({ organizationId: acme.organization.id, userId: acme.owner.id, versionId: v1!.id });
    expect(result.version).toBe(1);
    const status = await getModelStatus({ organizationId: acme.organization.id, userId: acme.viewer.id });
    expect(status.model.version).toBe(1);
    expect(status.versions[0]).toMatchObject({ status: 'SUPERSEDED', version: 2 });

    // Nothing to roll back to on a fresh workspace.
    await expect(rollbackModel({ organizationId: globex.organization.id, userId: globex.owner.id })).rejects.toMatchObject({ status: 400 });
  });

  it('duplicate enqueues fold into one open job', async () => {
    const acme = await setup();
    await resolvedIncident(acme, 'Redis eviction storm', ['cache hit rate collapsed', 'raised maxmemory and tuned TTLs']);
    const first = await trainModel({ organizationId: acme.organization.id, userId: acme.owner.id });
    const second = await trainModel({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(second.id).toBe(first.id);
    expect(await db.archModelJob.count({ where: { organizationId: acme.organization.id } })).toBe(1);
    await processTrainingJobs();
  });
});
