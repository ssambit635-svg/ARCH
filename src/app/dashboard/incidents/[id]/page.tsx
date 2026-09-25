import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser, resolveOrganization } from '@/lib/session';
import { getIncident } from '@/server/services/incident.service';
import { listMembers } from '@/server/services/organization.service';
import { listServices } from '@/server/services/project.service';
import { isAppError } from '@/lib/errors';
import { formatDateTime, formatDuration, timeAgo } from '@/lib/format';
import { Card, CardBody, CardHeader, DefinitionList, PageHeader, SeverityBadge, StatusBadge } from '@/components/ui';
import { IncidentTimeline } from '@/components/incidents/timeline';
import {
  IncidentAssigneeForm,
  IncidentCommentForm,
  IncidentSeverityForm,
  IncidentStatusActions,
} from '@/components/incidents/incident-actions';
import { updateIncidentAction } from '@/app/dashboard/actions';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Select } from '@/components/ui/form';
import { CopilotPanel, type CopilotSuggestionView } from '@/components/incidents/copilot-panel';
import { listSuggestions } from '@/server/services/copilot.service';
import { copilotConfig } from '@/server/ai/provider';
import { suggestionTimelineText } from '@/server/ai/schemas';
import { roleHasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Incident ${id.slice(0, 8)}` };
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);

  const incident = await getIncident({ organizationId: organization.id, userId: user.id, incidentId: id }).catch((error: unknown) => {
    if (isAppError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  });

  if (!incident) notFound();

  const [members, services, suggestions] = await Promise.all([
    listMembers({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
    listSuggestions({ organizationId: organization.id, userId: user.id, incidentId: incident.id }),
  ]);

  const memberName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const member = members.find((candidate) => candidate.userId === userId);
    return member ? (member.user.name ?? member.user.email) : 'a former member';
  };

  const copilotSuggestions: CopilotSuggestionView[] = suggestions.map((suggestion) => ({
    id: suggestion.id,
    type: suggestion.type,
    status: suggestion.status,
    output: suggestion.output,
    draftText: suggestionTimelineText(suggestion.type, suggestion.output),
    model: suggestion.model,
    provider: suggestion.provider,
    promptTokens: suggestion.promptTokens,
    completionTokens: suggestion.completionTokens,
    createdBy: suggestion.createdBy?.name ?? suggestion.createdBy?.email ?? 'a former member',
    createdAgo: timeAgo(suggestion.createdAt),
    createdAt: suggestion.createdAt.toISOString(),
    reviewedBy: suggestion.reviewedBy?.name ?? suggestion.reviewedBy?.email ?? null,
    reviewedAgo: suggestion.reviewedAt ? timeAgo(suggestion.reviewedAt) : null,
    ...(suggestion.type === 'TRIAGE'
      ? {
          triage: {
            currentSeverity: incident.severity,
            suggestedAssignee: memberName((suggestion.output as { assigneeId?: string }).assigneeId),
            currentAssignee: memberName(incident.assignedToId),
          },
        }
      : {}),
  }));

  const assignable = members
    .filter((member) => member.role !== 'VIEWER')
    .map((member) => ({ id: member.userId, label: `${member.user.name ?? member.user.email} · ${member.role}` }));

  return (
    <div>
      <PageHeader
        title={incident.title}
        description={`${incident.project.name}${incident.service ? ` · ${incident.service.name}` : ''} · opened ${timeAgo(incident.startedAt)} by ${
          incident.createdBy?.name ?? incident.createdBy?.email ?? incident.source.toLowerCase()
        }`}
        action={
          <Link className="text-sm text-slate-400 hover:text-slate-200" href="/dashboard/incidents">
            ← All incidents
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
        <span className="text-xs text-slate-500">
          source: <span className="arch-mono">{incident.source}</span>
        </span>
        {incident.resolvedAt ? (
          <span className="text-xs text-emerald-300">resolved {timeAgo(incident.resolvedAt)}</span>
        ) : (
          <span className="text-xs text-amber-300">open for {formatDuration(incident.startedAt)}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Timeline" description="Every comment, status change and assignment, in order." />
            <IncidentTimeline events={incident.events} />
          </Card>

          <CopilotPanel
            incidentId={incident.id}
            canGenerate={roleHasPermission(organization.role, 'copilot.generate')}
            canReview={roleHasPermission(organization.role, 'copilot.review')}
            config={copilotConfig()}
            suggestions={copilotSuggestions}
          />

          <Card>
            <CardHeader title="Add an update" description="Updates notify the responders and land in the audit trail." />
            <CardBody>
              <IncidentCommentForm incidentId={incident.id} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: 'Incident id', value: <span className="arch-mono text-xs">{incident.id}</span> },
                  { label: 'Project', value: incident.project.name },
                  { label: 'Service', value: incident.service?.name ?? '—' },
                  { label: 'Assignee', value: incident.assignedTo?.name ?? incident.assignedTo?.email ?? 'Nobody yet' },
                  { label: 'Started', value: formatDateTime(incident.startedAt) },
                  { label: 'Resolved', value: incident.resolvedAt ? formatDateTime(incident.resolvedAt) : '—' },
                  { label: 'Duration', value: formatDuration(incident.startedAt, incident.resolvedAt) },
                  { label: 'Last update', value: formatDateTime(incident.updatedAt) },
                ]}
              />
              {incident.description ? (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{incident.description}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Move the incident" description="Transitions follow the incident state machine." />
            <CardBody>
              <IncidentStatusActions incidentId={incident.id} status={incident.status} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Triage" />
            <CardBody className="space-y-5">
              <IncidentAssigneeForm incidentId={incident.id} assignedToId={incident.assignedToId} assignees={assignable} />
              <IncidentSeverityForm incidentId={incident.id} severity={incident.severity} />
              <ActionForm action={updateIncidentAction} submitLabel="Link service" variant="secondary">
                <input type="hidden" name="incidentId" value={incident.id} />
                <Field label="Service" htmlFor="serviceId">
                  <Select id="serviceId" name="serviceId" defaultValue={incident.serviceId ?? ''}>
                    <option value="">— none —</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.project.name} / {service.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
