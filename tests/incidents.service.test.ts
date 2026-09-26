import { beforeEach, describe, expect, it } from 'vitest';
import { addIncidentComment, createIncident, getIncident, listIncidents, updateIncident } from '@/server/services/incident.service';
import { addMember, createTenant, createTestService, createTestUser, db, resetDatabase } from './helpers/db';
import { AppError } from '@/lib/errors';

/**
 * Incident service behaviour: permissions, the state machine as it is enforced in the database,
 * the audit trail, the notification outbox and derived service status.
 */
describe('incident service', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function tenantWithResponder(role: 'ADMIN' | 'RESPONDER' | 'VIEWER' = 'RESPONDER') {
    const tenant = await createTenant('Acme');
    const responder = await createTestUser(`${role.toLowerCase()}@acme.test`, role);
    await addMember(tenant.organization.id, responder.id, role);
    return { ...tenant, responder };
  }

  it('creates an incident with a CREATED event, an audit row and notifications for the other responders', async () => {
    const { organization, project, service, owner, responder } = await tenantWithResponder();

    const incident = await createIncident({
      organizationId: organization.id,
      userId: responder.id,
      source: 'DASHBOARD',
      input: {
        title: 'Checkout latency',
        description: 'p99 above 4s',
        severity: 'CRITICAL',
        projectId: project.id,
        serviceId: service.id,
      },
    });

    expect(incident?.title).toBe('Checkout latency');
    expect(incident?.events).toHaveLength(1);
    expect(incident?.events[0]?.type).toBe('CREATED');

    const audits = await db.auditLog.findMany({ where: { organizationId: organization.id, action: 'incident.create' } });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.actorId).toBe(responder.id);

    // The responder who opened it is not emailed about their own action; the owner is.
    const notifications = await db.notification.findMany({ where: { organizationId: organization.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.recipientId).toBe(owner.id);
    expect(notifications[0]?.reason).toBe('INCIDENT_CREATED');
    expect(notifications[0]?.status).toBe('PENDING');

    // A CRITICAL incident immediately degrades the service.
    const refreshed = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(refreshed.status).toBe('OUTAGE');
  });

  it('refuses writes from a VIEWER', async () => {
    const { organization, project, viewer } = await (async () => {
      const tenant = await createTenant('Acme');
      const viewer = await createTestUser('viewer@acme.test', 'Viewer');
      await addMember(tenant.organization.id, viewer.id, 'VIEWER');
      return { ...tenant, viewer };
    })();

    await expect(
      createIncident({
        organizationId: organization.id,
        userId: viewer.id,
        source: 'DASHBOARD',
        input: { title: 'Nope', severity: 'LOW', projectId: project.id },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns 404 (not 403) when the project belongs to another organization', async () => {
    const acme = await createTenant('Acme');
    const globex = await createTenant('Globex');

    await expect(
      createIncident({
        organizationId: acme.organization.id,
        userId: acme.owner.id,
        source: 'DASHBOARD',
        input: { title: 'Cross tenant', severity: 'LOW', projectId: globex.project.id },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    // A service from another tenant is also invisible.
    await expect(
      createIncident({
        organizationId: acme.organization.id,
        userId: acme.owner.id,
        source: 'DASHBOARD',
        input: { title: 'Cross tenant service', severity: 'LOW', projectId: acme.project.id, serviceId: globex.service.id },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('walks the state machine, recording an event and audit row per transition', async () => {
    const { organization, project, owner } = await createTenant('Acme');
    const incident = await createIncident({
      organizationId: organization.id,
      userId: owner.id,
      source: 'DASHBOARD',
      input: { title: 'Slow queries', severity: 'MEDIUM', projectId: project.id },
    });

    const identified = await updateIncident({
      organizationId: organization.id,
      userId: owner.id,
      incidentId: incident!.id,
      input: { status: 'IDENTIFIED', message: 'Index missing' },
    });
    expect(identified?.status).toBe('IDENTIFIED');

    const monitoring = await updateIncident({
      organizationId: organization.id,
      userId: owner.id,
      incidentId: incident!.id,
      input: { status: 'MONITORING' },
    });
    expect(monitoring?.status).toBe('MONITORING');

    const resolved = await updateIncident({
      organizationId: organization.id,
      userId: owner.id,
      incidentId: incident!.id,
      input: { status: 'RESOLVED', message: 'Index added' },
    });
    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.resolvedAt).not.toBeNull();

    const reopen = await updateIncident({
      organizationId: organization.id,
      userId: owner.id,
      incidentId: incident!.id,
      input: { status: 'INVESTIGATING', message: 'Error rate came back' },
    });
    expect(reopen?.status).toBe('INVESTIGATING');
    expect(reopen?.resolvedAt).toBeNull();

    const statusEvents = await db.incidentEvent.findMany({ where: { incidentId: incident!.id, type: 'STATUS_CHANGED' } });
    expect(statusEvents).toHaveLength(4);
    expect(await db.auditLog.count({ where: { entityId: incident!.id, action: 'incident.reopen' } })).toBe(1);
  });

  it('rejects an illegal transition with 409 and leaves the incident untouched', async () => {
    const { organization, project, owner } = await createTenant('Acme');
    const incident = await createIncident({
      organizationId: organization.id,
      userId: owner.id,
      source: 'DASHBOARD',
      input: { title: 'Illegal move', severity: 'LOW', projectId: project.id },
    });

    await updateIncident({ organizationId: organization.id, userId: owner.id, incidentId: incident!.id, input: { status: 'IDENTIFIED' } });

    await expect(
      updateIncident({ organizationId: organization.id, userId: owner.id, incidentId: incident!.id, input: { status: 'INVESTIGATING' } }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const unchanged = await db.incident.findUniqueOrThrow({ where: { id: incident!.id } });
    expect(unchanged.status).toBe('IDENTIFIED');
    expect(await db.incidentEvent.count({ where: { incidentId: incident!.id, type: 'STATUS_CHANGED' } })).toBe(1);
  });

  it('recomputes the service status as incidents open and resolve', async () => {
    const { organization, project, service, owner } = await createTenant('Acme');

    const low = await createIncident({
      organizationId: organization.id,
      userId: owner.id,
      source: 'DASHBOARD',
      input: { title: 'Slow dashboard', severity: 'LOW', projectId: project.id, serviceId: service.id },
    });
    expect((await db.service.findUniqueOrThrow({ where: { id: service.id } })).status).toBe('DEGRADED');

    await updateIncident({ organizationId: organization.id, userId: owner.id, incidentId: low!.id, input: { status: 'RESOLVED' } });
    expect((await db.service.findUniqueOrThrow({ where: { id: service.id } })).status).toBe('OPERATIONAL');
  });

  it('respects a manually pinned service status', async () => {
    const { organization, project, service, owner } = await createTenant('Acme');
    await db.service.update({ where: { id: service.id }, data: { status: 'MAINTENANCE', autoStatus: false } });

    await createIncident({
      organizationId: organization.id,
      userId: owner.id,
      source: 'DASHBOARD',
      input: { title: 'Still maintenance', severity: 'CRITICAL', projectId: project.id, serviceId: service.id },
    });

    expect((await db.service.findUniqueOrThrow({ where: { id: service.id } })).status).toBe('MAINTENANCE');
  });

  it('assigns, comments and filters incidents', async () => {
    const { organization, project, owner, responder } = await tenantWithResponder('RESPONDER');

    const incident = await createIncident({
      organizationId: organization.id,
      userId: owner.id,
      source: 'DASHBOARD',
      input: { title: 'Needs an owner', severity: 'HIGH', projectId: project.id },
    });

    const assigned = await updateIncident({
      organizationId: organization.id,
      userId: owner.id,
      incidentId: incident!.id,
      input: { assignedToId: responder.id },
    });
    expect(assigned?.assignedToId).toBe(responder.id);
    expect(await db.incidentEvent.count({ where: { incidentId: incident!.id, type: 'ASSIGNED' } })).toBe(1);
    const assignmentMail = await db.notification.findFirst({ where: { incidentId: incident!.id, reason: 'INCIDENT_ASSIGNED' } });
    expect(assignmentMail?.recipientId).toBe(responder.id);
    expect(assignmentMail?.subject).toContain('Assigned to you');

    const commented = await addIncidentComment({
      organizationId: organization.id,
      userId: responder.id,
      incidentId: incident!.id,
      body: 'Looking into it now.',
    });
    expect(commented?.events.filter((event) => event.type === 'COMMENT')).toHaveLength(1);

    const page = await listIncidents({ organizationId: organization.id, userId: responder.id, page: 1, pageSize: 10, filters: { open: true } });
    expect(page.total).toBe(1);
    expect(page.items[0]?.id).toBe(incident!.id);

    const empty = await listIncidents({ organizationId: organization.id, userId: responder.id, page: 1, pageSize: 10, filters: { status: 'RESOLVED' } });
    expect(empty.total).toBe(0);
  });

  it('hides incidents from other organizations (404, never 403)', async () => {
    const acme = await createTenant('Acme');
    const globex = await createTenant('Globex');
    const incident = await createIncident({
      organizationId: globex.organization.id,
      userId: globex.owner.id,
      source: 'DASHBOARD',
      input: { title: 'Globex only', severity: 'LOW', projectId: globex.project.id },
    });

    await expect(getIncident({ organizationId: acme.organization.id, userId: acme.owner.id, incidentId: incident!.id })).rejects.toBeInstanceOf(AppError);
    await expect(
      updateIncident({ organizationId: acme.organization.id, userId: acme.owner.id, incidentId: incident!.id, input: { status: 'RESOLVED' } }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects a service that does not belong to the chosen project', async () => {
    const { organization, project, owner } = await createTenant('Acme');
    const otherService = await createTestService(project.id, 'Other service');
    const secondProject = await db.project.create({
      data: { organizationId: organization.id, name: 'Second', slug: 'second' },
    });

    await expect(
      createIncident({
        organizationId: organization.id,
        userId: owner.id,
        source: 'DASHBOARD',
        input: { title: 'Wrong service', severity: 'LOW', projectId: secondProject.id, serviceId: otherService.id },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
