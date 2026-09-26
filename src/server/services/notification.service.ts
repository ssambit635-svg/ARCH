import { env } from '@/lib/env';
import { db, type DbClient } from '@/lib/db';
import { getEmailAdapter, isRetryableEmailError, type EmailAdapter } from '../adapters/email';
import { notificationRepository, type NewNotification } from '../repositories/notification.repository';
import type { Incident, IncidentSeverity, IncidentStatus } from '@/generated/prisma/client';

/**
 * Notifications are transactional: the row is written in the same transaction as the incident
 * change, and a worker process drains PENDING rows. Nothing is sent from a request handler, so a
 * failed send can never fail a user's write, and a crash cannot lose the intent to notify.
 */

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  INVESTIGATING: 'Investigating',
  IDENTIFIED: 'Identified',
  MONITORING: 'Monitoring',
  RESOLVED: 'Resolved',
};

export type IncidentEmailContext = {
  organizationName: string;
  projectName: string;
  serviceName?: string | null;
  incident: Pick<Incident, 'id' | 'title' | 'severity' | 'status' | 'description' | 'startedAt'>;
  actorLabel: string;
  assigneeId?: string | null;
  change?: { from: IncidentStatus; to: IncidentStatus } | null;
  message?: string | null;
};

export type IncidentNotificationReason = 'INCIDENT_CREATED' | 'INCIDENT_STATUS_CHANGED' | 'INCIDENT_COMMENT' | 'INCIDENT_ASSIGNED';

function incidentUrl(incidentId: string): string {
  return `${env.APP_URL.replace(/\/$/, '')}/dashboard/incidents/${incidentId}`;
}

function incidentSummary(context: IncidentEmailContext): string {
  const lines = [
    `Incident: ${context.incident.title}`,
    `Severity: ${SEVERITY_LABEL[context.incident.severity]}`,
    `Status:   ${STATUS_LABEL[context.incident.status]}`,
    `Project:  ${context.projectName}${context.serviceName ? ` / ${context.serviceName}` : ''}`,
    `Started:  ${context.incident.startedAt.toISOString()}`,
  ];
  if (context.incident.description) lines.push('', context.incident.description);
  return lines.join('\n');
}

export function renderIncidentCreated(context: IncidentEmailContext): { subject: string; body: string } {
  return {
    subject: `[${SEVERITY_LABEL[context.incident.severity]}] ${context.incident.title} — ${context.organizationName}`,
    body: [
      'A new incident was created.',
      '',
      incidentSummary(context),
      '',
      `Reported by: ${context.actorLabel}`,
      `Open in ARCH: ${incidentUrl(context.incident.id)}`,
      '',
      '— ARCH, sent because you are a responder in this organization.',
    ].join('\n'),
  };
}

export function renderIncidentChanged(context: IncidentEmailContext): { subject: string; body: string } {
  const transition = context.change ? `${context.change.from} → ${context.change.to}` : STATUS_LABEL[context.incident.status];
  return {
    subject: `[${STATUS_LABEL[context.incident.status]}] ${context.incident.title} — ${context.organizationName}`,
    body: [
      `Incident updated by ${context.actorLabel}: ${transition}`,
      ...(context.message ? ['', `Comment: ${context.message}`] : []),
      '',
      incidentSummary(context),
      '',
      `Open in ARCH: ${incidentUrl(context.incident.id)}`,
    ].join('\n'),
  };
}

export function renderIncidentAssigned(context: IncidentEmailContext, recipientId: string): { subject: string; body: string } {
  const you = Boolean(context.assigneeId && recipientId === context.assigneeId);
  return {
    subject: `${you ? '[Assigned to you]' : '[Assignment]'} ${context.incident.title} — ${context.organizationName}`,
    body: [
      you ? `${context.actorLabel} assigned this incident to you.` : `${context.actorLabel} changed who owns this incident.`,
      '',
      incidentSummary(context),
      '',
      `Open in ARCH: ${incidentUrl(context.incident.id)}`,
    ].join('\n'),
  };
}

export function renderInvitation(context: {
  organizationName: string;
  invitedByLabel: string;
  role: string;
  token: string;
  expiresAt: Date;
}): { subject: string; body: string } {
  const link = `${env.APP_URL.replace(/\/$/, '')}/invite/${context.token}`;
  return {
    subject: `You have been invited to ${context.organizationName} on ARCH`,
    body: [
      `${context.invitedByLabel} invited you to join ${context.organizationName} as ${context.role}.`,
      '',
      `Accept the invitation: ${link}`,
      `This link expires on ${context.expiresAt.toISOString()}.`,
      '',
      'If you were not expecting this, you can ignore this email.',
    ].join('\n'),
  };
}

function renderForReason(reason: IncidentNotificationReason, context: IncidentEmailContext, recipientId: string): { subject: string; body: string } {
  if (reason === 'INCIDENT_CREATED') return renderIncidentCreated(context);
  if (reason === 'INCIDENT_ASSIGNED') return renderIncidentAssigned(context, recipientId);
  return renderIncidentChanged(context);
}

export function buildIncidentNotifications(
  context: IncidentEmailContext,
  recipientIds: string[],
  reason: IncidentNotificationReason,
  organizationId: string,
): NewNotification[] {
  if (recipientIds.length === 0) return [];
  return recipientIds.map((recipientId) => {
    const template = renderForReason(reason, context, recipientId);
    return {
      organizationId,
      incidentId: context.incident.id,
      recipientId,
      reason,
      subject: template.subject,
      body: template.body,
    };
  });
}

export function renderInvitationAccepted(context: { organizationName: string; acceptedByLabel: string; role: string }): { subject: string; body: string } {
  return {
    subject: `${context.acceptedByLabel} joined ${context.organizationName} on ARCH`,
    body: [
      `${context.acceptedByLabel} accepted the invitation and joined ${context.organizationName} as ${context.role}.`,
      '',
      `Open the organization: ${env.APP_URL.replace(/\/$/, '')}/dashboard/settings`,
    ].join('\n'),
  };
}

export async function enqueueInvitationAcceptedNotification(
  data: { organizationId: string; recipientId: string; subject: string; body: string },
  client: DbClient = db,
) {
  await notificationRepository.enqueueMany(
    [{ organizationId: data.organizationId, recipientId: data.recipientId, reason: 'INVITATION_ACCEPTED', subject: data.subject, body: data.body }],
    client,
  );
}

export async function enqueueInvitationNotification(
  data: { organizationId: string; recipientId: string; subject: string; body: string },
  client: DbClient = db,
) {
  await notificationRepository.enqueueMany(
    [{ organizationId: data.organizationId, recipientId: data.recipientId, reason: 'MEMBER_INVITED', subject: data.subject, body: data.body }],
    client,
  );
}

export type DispatchResult = { processed: number; sent: number; retried: number; failed: number };

/**
 * Drain the outbox. Called by the worker process (`npm run worker`) — never by a request handler.
 * A failure retries up to 3 attempts, then the row is marked FAILED so operators can see it.
 */
export async function dispatchPendingNotifications(options: { limit?: number; adapter?: EmailAdapter } = {}): Promise<DispatchResult> {
  const adapter = options.adapter ?? getEmailAdapter();
  const pending = await notificationRepository.listPending(options.limit ?? 20);
  const result: DispatchResult = { processed: 0, sent: 0, retried: 0, failed: 0 };

  for (const notification of pending) {
    result.processed += 1;
    try {
      await adapter.send({ to: notification.recipient.email, subject: notification.subject, body: notification.body });
      await notificationRepository.markSent(notification.id);
      result.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attemptsAfterThis = notification.attempts + 1;
      const retryable = isRetryableEmailError(error) && attemptsAfterThis < 3;
      await notificationRepository.markFailed(notification.id, message, { retryable });
      if (retryable) result.retried += 1;
      else result.failed += 1;
      console.warn(`[notifications] delivery failed (${adapter.name}) attempt=${attemptsAfterThis} retry=${retryable}: ${message}`);
    }
  }

  return result;
}
