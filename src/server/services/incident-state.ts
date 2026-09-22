import { AppError } from '@/lib/errors';
import type { IncidentStatus } from '@/generated/prisma/client';

/**
 * Incident lifecycle — the one place that decides which status changes are legal.
 *
 *   INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED
 *
 * Forward moves may skip ahead (a fast fix goes straight to RESOLVED); backwards moves are not
 * allowed except as an explicit reopen from RESOLVED. Everything else is a 409, not a silent
 * write, because the timeline and audit trail must stay trustworthy.
 */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  INVESTIGATING: ['IDENTIFIED', 'MONITORING', 'RESOLVED'],
  IDENTIFIED: ['MONITORING', 'RESOLVED'],
  MONITORING: ['RESOLVED'],
  RESOLVED: ['INVESTIGATING'],
};

export const ACTIVE_STATUSES: readonly IncidentStatus[] = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING'];

export function allowedTransitions(from: IncidentStatus): readonly IncidentStatus[] {
  return INCIDENT_TRANSITIONS[from];
}

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}

export function isReopen(from: IncidentStatus, to: IncidentStatus): boolean {
  return from === 'RESOLVED' && to !== 'RESOLVED';
}

export function isTerminal(status: IncidentStatus): boolean {
  return status === 'RESOLVED';
}

export function assertTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (from === to) {
    throw AppError.conflict(`Incident is already ${to}.`);
  }
  if (!canTransition(from, to)) {
    throw AppError.conflict(
      `Illegal status transition ${from} → ${to}. Allowed from ${from}: ${allowedTransitions(from).join(', ')}.`,
      { from, to, allowed: allowedTransitions(from) },
    );
  }
}
