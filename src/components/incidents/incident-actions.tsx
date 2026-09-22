'use client';

import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Select, Textarea } from '@/components/ui/form';
import { commentOnIncidentAction, updateIncidentAction } from '@/app/dashboard/actions';
import type { IncidentSeverity, IncidentStatus } from '@/generated/prisma/client';

const nextSteps: Record<IncidentStatus, { to: IncidentStatus; label: string }[]> = {
  INVESTIGATING: [
    { to: 'IDENTIFIED', label: 'Mark identified' },
    { to: 'MONITORING', label: 'Mark monitoring' },
    { to: 'RESOLVED', label: 'Resolve' },
  ],
  IDENTIFIED: [
    { to: 'MONITORING', label: 'Mark monitoring' },
    { to: 'RESOLVED', label: 'Resolve' },
  ],
  MONITORING: [{ to: 'RESOLVED', label: 'Resolve' }],
  RESOLVED: [{ to: 'INVESTIGATING', label: 'Reopen' }],
};

/**
 * Status transitions offered here mirror the state machine, but the server is the authority:
 * an illegal transition attempted from a stale tab still comes back as a 409 with a message.
 */
export function IncidentStatusActions({ incidentId, status }: { incidentId: string; status: IncidentStatus }) {
  return (
    <div className="space-y-3">
      {nextSteps[status].map((step) => (
        <ActionForm
          key={step.to}
          action={updateIncidentAction}
          submitLabel={step.label}
          variant={step.to === 'RESOLVED' ? 'primary' : 'secondary'}
          pendingLabel="Updating…"
        >
          <input type="hidden" name="incidentId" value={incidentId} />
          <input type="hidden" name="status" value={step.to} />
          <Field label="Note (optional)" htmlFor={`message-${step.to}`}>
            <Textarea id={`message-${step.to}`} name="message" rows={2} placeholder="What changed for customers?" />
          </Field>
        </ActionForm>
      ))}
    </div>
  );
}

export function IncidentSeverityForm({ incidentId, severity }: { incidentId: string; severity: IncidentSeverity }) {
  return (
    <ActionForm action={updateIncidentAction} submitLabel="Update severity" variant="secondary">
      <input type="hidden" name="incidentId" value={incidentId} />
      <Field label="Severity" htmlFor="severity">
        <Select id="severity" name="severity" defaultValue={severity}>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}

export function IncidentAssigneeForm({
  incidentId,
  assignedToId,
  assignees,
}: {
  incidentId: string;
  assignedToId: string | null;
  assignees: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={updateIncidentAction} submitLabel="Reassign" variant="secondary">
      <input type="hidden" name="incidentId" value={incidentId} />
      <Field label="Assignee" htmlFor="assignedToId">
        <Select id="assignedToId" name="assignedToId" defaultValue={assignedToId ?? ''}>
          <option value="">— nobody —</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.label}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}

export function IncidentCommentForm({ incidentId }: { incidentId: string }) {
  return (
    <ActionForm action={commentOnIncidentAction} submitLabel="Post comment" pendingLabel="Posting…">
      <input type="hidden" name="incidentId" value={incidentId} />
      <Field label="Add to the timeline" htmlFor="body">
        <Textarea id="body" name="body" rows={3} required placeholder="Status update for the responders and the audit trail…" />
      </Field>
    </ActionForm>
  );
}
