import { beforeEach, describe, expect, it } from 'vitest';
import { getProject, listServices, updateService } from '@/server/services/project.service';
import { createStatusPage, getPublicStatusPage, getStatusPage, setStatusPagePublished, updateStatusPage } from '@/server/services/statusPage.service';
import {
  acceptInvitation,
  changeMemberRole,
  getOrganization,
  inviteMember,
  listInvitations,
  listMembers,
  removeMember,
} from '@/server/services/organization.service';
import { auditActionSummary, listAuditLogs } from '@/server/services/audit.service';
import { createEndpoint, listDeliveries } from '@/server/services/webhook.service';
import { addMember, createTenant, createTestUser, db, resetDatabase } from './helpers/db';

/**
 * Tenant isolation: two organizations, one shared database.
 *
 * The rule under test (AGENTS.md §5): a resource that belongs to another organization must look
 * exactly like a resource that does not exist — 404, never 403, so ids cannot be probed.
 */
describe('tenant isolation', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('never returns another organization’s project or services', async () => {
    const acme = await createTenant('Acme');
    const globex = await createTenant('Globex');

    await expect(getProject({ organizationId: acme.organization.id, userId: acme.owner.id, projectId: globex.project.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    const acmeServices = await listServices({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(acmeServices.map((service) => service.id)).not.toContain(globex.service.id);

    await expect(
      updateService({ organizationId: acme.organization.id, userId: acme.owner.id, serviceId: globex.service.id, status: 'OUTAGE' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuses to attach another organization’s service to a status page', async () => {
    const acme = await createTenant('Acme');
    const globex = await createTenant('Globex');

    await expect(
      createStatusPage({
        organizationId: acme.organization.id,
        userId: acme.owner.id,
        name: 'Acme status',
        slug: 'acme-status',
        serviceIds: [globex.service.id],
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('serves published pages to anyone and unpublished pages to nobody', async () => {
    const acme = await createTenant('Acme');
    const page = await createStatusPage({
      organizationId: acme.organization.id,
      userId: acme.owner.id,
      name: 'Acme status',
      slug: 'acme-public',
      serviceIds: [acme.service.id],
    });

    // Draft: invisible on the public path.
    expect(await getPublicStatusPage('acme-public')).toBeNull();

    await setStatusPagePublished({ organizationId: acme.organization.id, userId: acme.owner.id, statusPageId: page.id, isPublished: true });
    const published = await getPublicStatusPage('acme-public');
    expect(published?.page.slug).toBe('acme-public');
    expect(published?.components.map((component) => component.id)).toEqual([acme.service.id]);

    // Another tenant cannot manage it, and cannot see it in their own dashboard list.
    const globex = await createTenant('Globex');
    await expect(getStatusPage({ organizationId: globex.organization.id, userId: globex.owner.id, statusPageId: page.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      updateStatusPage({ organizationId: globex.organization.id, userId: globex.owner.id, statusPageId: page.id, name: 'Hijacked' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('keeps membership, invitation and audit reads inside the organization', async () => {
    const acme = await createTenant('Acme');
    const globex = await createTenant('Globex');

    // Not a member of Globex at all -> the organization does not exist as far as Acme's owner is
    // concerned (404, never 403).
    await expect(listMembers({ organizationId: globex.organization.id, userId: acme.owner.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(listInvitations({ organizationId: globex.organization.id, userId: acme.owner.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(getOrganization({ organizationId: globex.organization.id, userId: acme.owner.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });

    // INVITE a teammate in Acme, then confirm Globex sees none of it.
    await db.user.create({ data: { email: 'new@acme.test' } });
    await inviteMember({ organizationId: acme.organization.id, actorId: acme.owner.id, email: 'new@acme.test', role: 'RESPONDER' });
    const acmeInvitations = await listInvitations({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(acmeInvitations).toHaveLength(1);
    expect(await db.invitation.count({ where: { organizationId: globex.organization.id } })).toBe(0);

    // Audit log: RESPONDER/VIEWER cannot read it at all; cross-tenant reads are refused.
    const responder = await createTestUser('responder@acme.test', 'Responder');
    await addMember(acme.organization.id, responder.id, 'RESPONDER');
    await expect(listAuditLogs({ organizationId: acme.organization.id, userId: responder.id, filters: {}, page: 1, pageSize: 10 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(auditActionSummary({ organizationId: globex.organization.id, userId: acme.owner.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // Member of the organization, but the role is too low -> 403 (the tenant itself is visible).
    await expect(listAuditLogs({ organizationId: acme.organization.id, userId: responder.id, filters: {}, page: 1, pageSize: 10 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    const acmeAudit = await listAuditLogs({ organizationId: acme.organization.id, userId: acme.owner.id, filters: {}, page: 1, pageSize: 10 });
    expect(acmeAudit.items.every((entry) => entry.organizationId === acme.organization.id)).toBe(true);
  });

  it('protects the last owner and validates invitation acceptance', async () => {
    const acme = await createTenant('Acme');
    const globex = await createTenant('Globex');

    // The only OWNER cannot be demoted or removed.
    await expect(changeMemberRole({ organizationId: acme.organization.id, actorId: acme.owner.id, targetUserId: acme.owner.id, role: 'ADMIN' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(removeMember({ organizationId: acme.organization.id, actorId: acme.owner.id, targetUserId: acme.owner.id })).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    // An invitation can only be accepted by the person it was sent to.
    const invitedUser = await createTestUser('invited@acme.test', 'Invited');
    const outsider = await createTestUser('outsider@globex.test', 'Outsider');
    const invite = await inviteMember({ organizationId: acme.organization.id, actorId: acme.owner.id, email: 'invited@acme.test', role: 'VIEWER' });
    const token = invite.inviteUrl.replace('/invite/', '');

    await expect(acceptInvitation({ token, userId: outsider.id, userEmail: outsider.email })).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const accepted = await acceptInvitation({ token, userId: invitedUser.id, userEmail: invitedUser.email });
    expect(accepted.organizationId).toBe(acme.organization.id);
    expect(await db.membership.count({ where: { organizationId: acme.organization.id, userId: invitedUser.id } })).toBe(1);
    // Invitations are single-use.
    await expect(acceptInvitation({ token, userId: invitedUser.id, userEmail: invitedUser.email })).rejects.toMatchObject({ code: 'CONFLICT' });

    // Globex remains untouched by any of this.
    expect(await db.membership.count({ where: { organizationId: globex.organization.id } })).toBe(1);
  });

  it('scopes webhook endpoints and their delivery logs to the owning organization', async () => {
    const acme = await createTenant('Acme');
    const globex = await createTenant('Globex');

    await expect(
      createEndpoint({ organizationId: acme.organization.id, userId: acme.owner.id, provider: 'grafana', projectId: globex.project.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const created = await createEndpoint({
      organizationId: acme.organization.id,
      userId: acme.owner.id,
      provider: 'grafana',
      projectId: acme.project.id,
      serviceId: acme.service.id,
    });

    await expect(
      listDeliveries({ organizationId: globex.organization.id, userId: globex.owner.id, endpointId: created.endpoint.id, page: 1, pageSize: 10 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
