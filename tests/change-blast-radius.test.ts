import { beforeEach, describe, expect, it } from 'vitest';
import { createChange, createDependency, getChangeBlastRadius } from '@/server/services/v6.service';
import { createTestService, createTenant, db, resetDatabase } from './helpers/db';
import { AppError } from '@/lib/errors';

/**
 * V7 — change-aware blast radius: a deploy/commit on one service, the dependency map, and the
 * honest answer to "yeh service affect hoga?" — ordered by graph distance.
 */

async function setupGraph() {
  const tenant = await createTenant('Acme');
  // payments depends on ledger depends on postgres-proxy: change on postgres-proxy should fan out.
  const ledger = await createTestService(tenant.project.id, 'Ledger');
  const payments = await createTestService(tenant.project.id, 'Payments');
  await createDependency({ organizationId: tenant.organization.id, userId: tenant.owner.id, fromServiceId: ledger.id, toServiceId: tenant.service.id });
  await createDependency({ organizationId: tenant.organization.id, userId: tenant.owner.id, fromServiceId: payments.id, toServiceId: ledger.id });
  return { ...tenant, ledger, payments };
}

describe('change-aware blast radius', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('names every downstream service, ordered by distance from the change', async () => {
    const t = await setupGraph();
    const change = await createChange({
      organizationId: t.organization.id,
      userId: t.owner.id,
      serviceId: t.service.id,
      title: 'Bump pool size to 20',
      type: 'CONFIG',
    });

    const blast = await getChangeBlastRadius({ organizationId: t.organization.id, userId: t.owner.id, changeId: change.id });

    expect(blast.rootService?.id).toBe(t.service.id);
    expect(blast.affectedServices.map((s) => s.id)).toEqual([t.service.id, t.ledger.id, t.payments.id]);
    expect(blast.affectedServices.map((s) => s.distance)).toEqual([0, 1, 2]);
    expect(blast.note).toMatch(/downstream/i);
  });

  it('stays contained when nothing depends on the changed service', async () => {
    const t = await setupGraph();
    const change = await createChange({
      organizationId: t.organization.id,
      userId: t.owner.id,
      serviceId: t.payments.id,
      title: 'Deploy payments v42',
      type: 'DEPLOYMENT',
    });

    const blast = await getChangeBlastRadius({ organizationId: t.organization.id, userId: t.owner.id, changeId: change.id });
    expect(blast.affectedServices.map((s) => s.id)).toEqual([t.payments.id]);
    expect(blast.note).toMatch(/contained/i);
  });

  it('includes recent incidents on the affected set', async () => {
    const t = await setupGraph();
    const change = await createChange({
      organizationId: t.organization.id,
      userId: t.owner.id,
      serviceId: t.service.id,
      title: 'Schema migration 042',
      type: 'DEPLOYMENT',
    });
    await db.incident.create({
      data: {
        organizationId: t.organization.id,
        projectId: t.project.id,
        serviceId: t.ledger.id,
        title: 'Ledger writes failing',
        severity: 'HIGH',
        status: 'INVESTIGATING',
      },
    });

    const blast = await getChangeBlastRadius({ organizationId: t.organization.id, userId: t.owner.id, changeId: change.id });
    expect(blast.recentIncidents.some((incident) => incident.title === 'Ledger writes failing')).toBe(true);
  });

  it('says so honestly when a change is not linked to a service', async () => {
    const t = await setupGraph();
    const change = await createChange({
      organizationId: t.organization.id,
      userId: t.owner.id,
      title: 'Global flag toggle',
      type: 'CONFIG',
    });

    const blast = await getChangeBlastRadius({ organizationId: t.organization.id, userId: t.owner.id, changeId: change.id });
    expect(blast.affectedServices).toHaveLength(0);
    expect(blast.note).toMatch(/not linked to a service/i);
  });

  it('is tenant-scoped: another org cannot read a change blast radius', async () => {
    const t = await setupGraph();
    const change = await createChange({
      organizationId: t.organization.id,
      userId: t.owner.id,
      serviceId: t.service.id,
      title: 'Internal deploy',
      type: 'DEPLOYMENT',
    });
    const other = await createTenant('Globex');

    await expect(
      getChangeBlastRadius({ organizationId: other.organization.id, userId: other.owner.id, changeId: change.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' } satisfies Partial<AppError>);
  });
});
