import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { getIncident } from '@/server/services/incident.service';
import { listMembers } from '@/server/services/organization.service';
import { listServices } from '@/server/services/project.service';
import { isAppError } from '@/lib/errors';
import { formatDateTime, formatDuration, timeAgo } from '@/lib/format';
import { Card, CardBody, CardHeader, DefinitionList, SeverityBadge } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { IncidentTimeline } from '@/components/incidents/timeline';
import { IncidentAssigneeForm, IncidentSeverityForm } from '@/components/incidents/incident-actions';
import { IncidentStateDropdown } from '@/components/incident/state-dropdown';
import { CommentBox } from '@/components/incident/comment-box';
import { updateIncidentAction } from '@/app/dashboard/actions';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Select } from '@/components/ui/form';
import { CopilotPanel, type CopilotSuggestionView } from '@/components/incidents/copilot-panel';
import { VerifiedFixPanel, type VerificationView, type RepoConnectionView } from '@/components/incidents/verified-fix-panel';
import { SimilarIncidentsPanel } from '@/components/incidents/similar-incidents';
import { CorrelationPanel } from '@/components/incidents/correlation';
import { AskArchPanel } from '@/components/incidents/ask-arch';
import { listSuggestions } from '@/server/services/copilot.service';
import { listVerifications } from '@/server/services/verifiedFix.service';
import { listRepoConnections } from '@/server/services/repo.service';
import { copilotConfig } from '@/server/ai/provider';
import { suggestionTimelineText } from '@/server/ai/schemas';
import { roleHasPermission } from '@/lib/permissions';
import { getIncidentBlastRadius } from '@/server/services/v6.service';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Incident ${id.slice(0, 8)}` };
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, organization } = await requireDashboardContext();

  const incident = await getIncident({ organizationId: organization.id, userId: user.id, incidentId: id }).catch((error: unknown) => {
    if (isAppError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  });

  if (!incident) notFound();

  const [members, services, suggestions, verifications, repoConnections, blastRadius] = await Promise.all([
    listMembers({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
    listSuggestions({ organizationId: organization.id, userId: user.id, incidentId: incident.id }),
    listVerifications({ organizationId: organization.id, userId: user.id, incidentId: incident.id }).catch(() => []),
    listRepoConnections({ organizationId: organization.id, userId: user.id }).catch(() => []),
    getIncidentBlastRadius({ organizationId: organization.id, userId: user.id, incidentId: incident.id }).catch(() => ({ affectedServices: [], relatedChanges: [], relatedIncidents: [] })),
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

  const verificationViews: VerificationView[] = verifications.map((v) => ({
    id: v.id,
    status: v.status as VerificationView['status'],
    patch: v.patch,
    commitSha: v.commitSha,
    testCommand: v.testCommand,
    testOutput: v.testOutput,
    evidence: v.evidence as VerificationView['evidence'],
    durationMs: v.durationMs,
    createdAt: v.createdAt.toISOString(),
    createdAgo: timeAgo(v.createdAt),
    repoConnection: v.repoConnection ? { id: v.repoConnection.id, fullName: v.repoConnection.fullName, pinnedCommitSha: v.repoConnection.pinnedCommitSha } : null,
    pullRequest: v.pullRequest ? { id: v.pullRequest.id, externalUrl: v.pullRequest.externalUrl, branch: v.pullRequest.branch, status: v.pullRequest.status } : null,
    suggestion: { id: v.suggestionId, type: 'CODE_FIX' },
    reproductionTest: v.reproductionTest ?? null,
    reproduction: v.reproduction as VerificationView['reproduction'],
  }));

  const repoConnectionViews: RepoConnectionView[] = repoConnections.map((rc) => ({
    id: rc.id,
    fullName: rc.fullName,
    owner: rc.owner,
    repo: rc.repo,
    defaultBranch: rc.defaultBranch,
    pinnedCommitSha: rc.pinnedCommitSha,
    isActive: rc.isActive,
  }));

  const canWrite = roleHasPermission(organization.role, 'incident.write');
  const open = incident.status !== 'RESOLVED';

  return (
    <div className="animate-rise">
      {/* Workspace header */}
      <div className="mb-6">
        <Link href="/dashboard/incidents" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-200">
          ← All incidents
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-[28px] sm:leading-tight">{incident.title}</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {incident.project.name}
              {incident.service ? (
                <>
                  {' · '}
                  <Link href={`/dashboard/services/${incident.service.id}`} className="text-indigo-400 transition hover:text-indigo-300 hover:underline">
                    {incident.service.name}
                  </Link>
                </>
              ) : null}
              {' · '}opened {timeAgo(incident.startedAt)} by {incident.createdBy?.name ?? incident.createdBy?.email ?? incident.source.toLowerCase()}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <SeverityBadge severity={incident.severity} />
            <IncidentStateDropdown incidentId={incident.id} status={incident.status} canWrite={canWrite} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="arch-mono">source: {incident.source}</span>
          {incident.resolvedAt ? (
            <span className="font-medium text-emerald-300">✓ resolved {timeAgo(incident.resolvedAt)}</span>
          ) : (
            <span className="font-medium text-amber-300">● open for {formatDuration(incident.startedAt)}</span>
          )}
          {incident.assignedTo ? (
            <span className="flex items-center gap-1.5">
              <Avatar name={incident.assignedTo.name} email={incident.assignedTo.email} size="xs" />
              <span className="text-slate-400">{incident.assignedTo.name ?? incident.assignedTo.email}</span>
            </span>
          ) : (
            <span className="text-slate-500">Unassigned</span>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 xl:col-span-2">
          {blastRadius.affectedServices.length > 0 ? (
            <Card className="!border-rose-500/20">
              <CardHeader title="Blast radius" description={`${blastRadius.affectedServices.length} service(s) in the dependency chain`} />
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {blastRadius.affectedServices.map((service) => (
                    <Link
                      key={service.id}
                      href={`/dashboard/services/${service.id}`}
                      className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-200 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/20"
                    >
                      {service.name} · {service.status}
                    </Link>
                  ))}
                </div>
                {blastRadius.relatedChanges.length > 0 ? (
                  <div className="mt-4 border-t border-white/[0.06] pt-3 text-sm text-slate-300">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Recent changes before incident</p>
                    {blastRadius.relatedChanges.slice(0, 5).map((change) => (
                      <p key={change.id} className="py-1 text-[13px]">
                        {change.title} <span className="text-xs text-slate-500">({change.type})</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">No matching deployment changes found in the previous 7 days.</p>
                )}
              </CardBody>
            </Card>
          ) : null}

          <CorrelationPanel incidentId={incident.id} />
          <SimilarIncidentsPanel incidentId={incident.id} initialTitle={incident.title} />

          <Card>
            <CardHeader title="Response timeline" description="Every comment, status change and assignment, in order." />
            <IncidentTimeline events={incident.events} />
          </Card>

          {canWrite && open ? (
            <Card>
              <CardHeader title="Add an update" description="Updates notify the responders and land in the audit trail." />
              <CardBody>
                <CommentBox incidentId={incident.id} />
              </CardBody>
            </Card>
          ) : null}

          <CopilotPanel
            incidentId={incident.id}
            canGenerate={roleHasPermission(organization.role, 'copilot.generate')}
            canReview={roleHasPermission(organization.role, 'copilot.review')}
            config={copilotConfig()}
            suggestions={copilotSuggestions}
          />

          <VerifiedFixPanel
            incidentId={incident.id}
            canGenerate={roleHasPermission(organization.role, 'copilot.generate')}
            canApprove={roleHasPermission(organization.role, 'copilot.review')}
            repoConnections={repoConnectionViews}
            verifications={verificationViews}
          />
        </div>

        {/* Right rail */}
        <div className="space-y-6 xl:sticky xl:top-[68px]">
          <AskArchPanel incidentId={incident.id} />

          <Card>
            <CardHeader title="Triage" description="Severity, owner and service linkage." />
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

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: 'Incident id', value: <span className="arch-mono text-xs">{incident.id.slice(0, 8)}</span> },
                  { label: 'Project', value: incident.project.name },
                  { label: 'Service', value: incident.service?.name ?? '—' },
                  { label: 'Started', value: formatDateTime(incident.startedAt) },
                  { label: 'Resolved', value: incident.resolvedAt ? formatDateTime(incident.resolvedAt) : '—' },
                  { label: 'Duration', value: formatDuration(incident.startedAt, incident.resolvedAt) },
                  { label: 'Last update', value: formatDateTime(incident.updatedAt) },
                ]}
              />
              {incident.description ? (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Description</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">{incident.description}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
