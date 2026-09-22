import { beforeEach, describe, expect, it } from 'vitest';
import { dispatchPendingNotifications } from '@/server/services/notification.service';
import { inviteMember } from '@/server/services/organization.service';
import { createIncident } from '@/server/services/incident.service';
import { addMember, createTenant, createTestUser, db, resetDatabase } from './helpers/db';
import type { EmailAdapter, EmailMessage } from '@/server/adapters/email';

/** A fake adapter lets us assert the outbox lifecycle without sending anything. */
/** A second member (RESPONDER) is who gets notified when the owner opens an incident. */
async function tenantWithResponder() {
  const tenant = await createTenant('Acme');
  const responder = await createTestUser('responder@acme.test', 'Responder');
  await addMember(tenant.organization.id, responder.id, 'RESPONDER');
  return { ...tenant, responder };
}

function fakeAdapter(behaviour: 'ok' | 'retryable' | 'permanent'): EmailAdapter & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    name: 'fake',
    sent,
    async send(message) {
      if (behaviour === 'ok') {
        sent.push(message);
        return;
      }
      const error = new Error('smtp exploded') as Error & { retryable?: boolean };
      error.retryable = behaviour === 'retryable';
      throw error;
    },
  };
}

describe('notification outbox', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('marks a notification SENT and records the recipient', async () => {
    const tenant = await tenantWithResponder();
    await createIncident({
      organizationId: tenant.organization.id,
      userId: tenant.owner.id,
      source: 'DASHBOARD',
      input: { title: 'Disk full', severity: 'HIGH', projectId: tenant.project.id },
    });

    const adapter = fakeAdapter('ok');
    const result = await dispatchPendingNotifications({ adapter });
    expect(result).toMatchObject({ processed: 1, sent: 1 });

    const notification = await db.notification.findFirstOrThrow();
    expect(notification.status).toBe('SENT');
    expect(notification.sentAt).not.toBeNull();
    expect(adapter.sent[0]?.to).toBe(tenant.responder.email);
    expect(adapter.sent[0]?.subject).toContain('Disk full');
  });

  it('retries a retryable failure and gives up after three attempts', async () => {
    const tenant = await tenantWithResponder();
    await createIncident({
      organizationId: tenant.organization.id,
      userId: tenant.owner.id,
      source: 'DASHBOARD',
      input: { title: 'Retry me', severity: 'LOW', projectId: tenant.project.id },
    });

    const adapter = fakeAdapter('retryable');
    expect(await dispatchPendingNotifications({ adapter })).toMatchObject({ retried: 1, failed: 0 });
    expect(await dispatchPendingNotifications({ adapter })).toMatchObject({ retried: 1, failed: 0 });
    expect(await dispatchPendingNotifications({ adapter })).toMatchObject({ retried: 0, failed: 1 });

    const notification = await db.notification.findFirstOrThrow();
    expect(notification.status).toBe('FAILED');
    expect(notification.attempts).toBe(3);
    expect(notification.lastError).toContain('smtp exploded');
  });

  it('fails fast on a permanent error', async () => {
    const tenant = await tenantWithResponder();
    await createIncident({
      organizationId: tenant.organization.id,
      userId: tenant.owner.id,
      source: 'DASHBOARD',
      input: { title: 'Permanent failure', severity: 'LOW', projectId: tenant.project.id },
    });

    const result = await dispatchPendingNotifications({ adapter: fakeAdapter('permanent') });
    expect(result).toMatchObject({ failed: 1, retried: 0 });
    expect((await db.notification.findFirstOrThrow()).status).toBe('FAILED');
  });

  it('queues an email when inviting somebody who already has an account', async () => {
    const tenant = await createTenant('Acme');
    await db.user.create({ data: { email: 'existing@acme.test', name: 'Existing' } });

    const result = await inviteMember({
      organizationId: tenant.organization.id,
      actorId: tenant.owner.id,
      email: 'existing@acme.test',
      role: 'RESPONDER',
    });

    expect(result.emailSent).toBe(true);
    expect(result.inviteUrl).toMatch(/^\/invite\//);

    const notification = await db.notification.findFirstOrThrow();
    expect(notification.reason).toBe('MEMBER_INVITED');
    expect(notification.body).toContain(result.inviteUrl);
  });

  it('records an invitation for an email without an account, without a notification row', async () => {
    const tenant = await createTenant('Acme');
    const result = await inviteMember({
      organizationId: tenant.organization.id,
      actorId: tenant.owner.id,
      email: 'newcomer@acme.test',
      role: 'VIEWER',
    });

    expect(result.emailSent).toBe(false);
    expect(await db.notification.count()).toBe(0);
    expect(await db.invitation.count({ where: { email: 'newcomer@acme.test' } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: 'member.invite' } })).toBe(1);
  });
});
