import { beforeEach, describe, expect, it } from 'vitest';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { statusPageRepository } from '@/server/repositories/statusPage.repository';
import { createTenant, createTestIncident, db, resetDatabase } from './helpers/db';

// These are real PostgreSQL reads: especially the severity enum order and tenant constraints.
describe('workspace response queue and public shortcut data', () => {
  beforeEach(resetDatabase);
  it('keeps older unresolved incidents ahead of recent resolved history, ordered by severity then age', async () => {
    const { organization, project } = await createTenant('Alpha');
    const base = { organizationId: organization.id, projectId: project.id };
    const low = await createTestIncident({ ...base, severity: 'LOW', title: 'Low' });
    const critical = await createTestIncident({ ...base, severity: 'CRITICAL', title: 'Critical' });
    const olderCritical = await createTestIncident({
      ...base,
      severity: 'CRITICAL',
      title: 'Older critical',
    });
    await db.incident.update({
      where: { id: olderCritical.id },
      data: { startedAt: new Date(Date.now() - 86_400_000) },
    });
    await db.incident.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        ...base,
        title: `Recent resolved ${index}`,
        severity: 'CRITICAL' as const,
        status: 'RESOLVED' as const,
        resolvedAt: new Date(),
      })),
    });
    const queue = await incidentRepository.findOpenForOverview(organization.id);
    expect(queue.map((incident) => incident.id)).toEqual([olderCritical.id, critical.id, low.id]);
    expect(queue.every((incident) => incident.status !== 'RESOLVED')).toBe(true);
  });
  it('never includes another organization’s open incidents in the response queue', async () => {
    const alpha = await createTenant('Alpha');
    const beta = await createTenant('Beta');
    await createTestIncident({
      organizationId: beta.organization.id,
      projectId: beta.project.id,
      title: 'Other tenant critical',
      severity: 'CRITICAL',
    });
    const own = await createTestIncident({
      organizationId: alpha.organization.id,
      projectId: alpha.project.id,
      title: 'Own low incident',
      severity: 'LOW',
    });
    expect(
      (await incidentRepository.findOpenForOverview(alpha.organization.id)).map(
        (incident) => incident.id,
      ),
    ).toEqual([own.id]);
    expect(await incidentRepository.findOpenForOverview(alpha.organization.id, 0)).toEqual([]);
  });
  it('counts unlinked project incidents and service incidents without crossing tenant boundaries', async () => {
    const alpha = await createTenant('Alpha');
    const beta = await createTenant('Beta');
    await createTestIncident({
      organizationId: alpha.organization.id,
      projectId: alpha.project.id,
    });
    await createTestIncident({
      organizationId: alpha.organization.id,
      projectId: alpha.project.id,
      serviceId: alpha.service.id,
    });
    await createTestIncident({
      organizationId: beta.organization.id,
      projectId: beta.project.id,
      serviceId: beta.service.id,
    });
    await db.incident.create({
      data: {
        organizationId: alpha.organization.id,
        projectId: alpha.project.id,
        serviceId: alpha.service.id,
        title: 'Resolved history',
        status: 'RESOLVED',
      },
    });
    const counts = await incidentRepository.countOpenByProjectAndService(alpha.organization.id);
    expect(counts).toHaveLength(2);
    expect(counts.every((row) => row.projectId === alpha.project.id)).toBe(true);
    expect(counts.find((row) => row.serviceId === null)?._count._all).toBe(1);
    expect(counts.find((row) => row.serviceId === alpha.service.id)?._count._all).toBe(1);
  });
  it('counts the past week by resolution date, not creation date or another tenant’s data', async () => {
    const alpha = await createTenant('Alpha');
    const beta = await createTenant('Beta');
    const now = new Date();
    const old = new Date(Date.now() - 30 * 86_400_000);
    await db.incident.createMany({
      data: [
        {
          organizationId: alpha.organization.id,
          projectId: alpha.project.id,
          title: 'Old incident resolved now',
          createdAt: old,
          status: 'RESOLVED',
          resolvedAt: now,
        },
        {
          organizationId: alpha.organization.id,
          projectId: alpha.project.id,
          title: 'Resolution outside window',
          status: 'RESOLVED',
          resolvedAt: old,
        },
        {
          organizationId: alpha.organization.id,
          projectId: alpha.project.id,
          title: 'Still unresolved',
        },
        {
          organizationId: beta.organization.id,
          projectId: beta.project.id,
          title: 'Other tenant',
          status: 'RESOLVED',
          resolvedAt: now,
        },
      ],
    });
    expect(
      await incidentRepository.count(alpha.organization.id, {
        status: 'RESOLVED',
        resolvedSince: new Date(Date.now() - 7 * 86_400_000),
      }),
    ).toBe(1);
  });
  it('selects a real published page in the current tenant rather than an org-matching draft or another tenant', async () => {
    const alpha = await createTenant('Alpha');
    const beta = await createTenant('Beta');
    await db.statusPage.create({
      data: {
        organizationId: alpha.organization.id,
        name: 'Draft matching org',
        slug: alpha.organization.slug,
      },
    });
    await db.statusPage.create({
      data: {
        organizationId: beta.organization.id,
        name: 'Other published',
        slug: 'beta-live',
        isPublished: true,
      },
    });
    await db.statusPage.create({
      data: {
        organizationId: alpha.organization.id,
        name: 'Customer status',
        slug: 'customer-facing-status',
        isPublished: true,
      },
    });
    expect(await statusPageRepository.firstPublished(alpha.organization.id)).toEqual({
      name: 'Customer status',
      slug: 'customer-facing-status',
    });
  });
  it('returns no public destination when a workspace has only drafts', async () => {
    const { organization } = await createTenant('Alpha');
    await db.statusPage.create({
      data: { organizationId: organization.id, name: 'Not yet public', slug: 'alpha-status' },
    });
    expect(await statusPageRepository.firstPublished(organization.id)).toBeNull();
  });
});
