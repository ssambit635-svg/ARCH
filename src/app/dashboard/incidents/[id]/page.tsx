import { CopyIncidentLink } from '@/components/incidents/copy-incident-link';
import { WorkspaceRefresh } from '@/components/dashboard/workspace-refresh';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { getIncident } from '@/server/services/incident.service';
import { listMembers } from '@/server/services/organization.service';
import { listServices } from '@/server/services/project.service';
import { isAppError } from '@/lib/errors';
import { formatDateTime, formatDuration, timeAgo } from '@/lib/format';
import {
  Card,
  CardBody,
  CardHeader,
  DefinitionList,
  SeverityBadge,
  ServiceStatusBadge,
} from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { IncidentTimeline } from '@/components/incidents/timeline';
import {
  IncidentAssigneeForm,
  IncidentSeverityForm,
} from '@/components/incidents/incident-actions';
import { IncidentStateDropdown } from '@/components/incident/state-dropdown';
import { CommentBox } from '@/components/incident/comment-box';
import { updateIncidentAction } from '@/app/dashboard/actions';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Select } from '@/components/ui/form';
import { CopilotPanel, type CopilotSuggestionView } from '@/components/incidents/copilot-panel';
import {
  VerifiedFixPanel,
  type VerificationView,
  type RepoConnectionView,
} from '@/components/incidents/verified-fix-panel';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Incident ${id.slice(0, 8)}` };
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, organization } = await requireDashboardContext();

  const incident = await getIncident({
    organizationId: organization.id,
    userId: user.id,
    incidentId: id,
  }).catch((error: unknown) => {
    if (isAppError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  });

  if (!incident) notFound();

  const [members, services, suggestions, verifications, repoConnections, blastRadius] =
    await Promise.all([
      listMembers({ organizationId: organization.id, userId: user.id }),
      listServices({ organizationId: organization.id, userId: user.id }),
      listSuggestions({
        organizationId: organization.id,
        userId: user.id,
        incidentId: incident.id,
      }),
      listVerifications({
        organizationId: organization.id,
        userId: user.id,
        incidentId: incident.id,
      }).catch(() => []),
      listRepoConnections({ organizationId: organization.id, userId: user.id }).catch(() => []),
      getIncidentBlastRadius({
        organizationId: organization.id,
        userId: user.id,
        incidentId: incident.id,
      }).catch(() => ({ affectedServices: [], relatedChanges: [], relatedIncidents: [] })),
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
            suggestedAssignee: memberName(
              (suggestion.output as { assigneeId?: string }).assigneeId,
            ),
            currentAssignee: memberName(incident.assignedToId),
          },
        }
      : {}),
  }));

  const assignable = members
    .filter((member) => member.role !== 'VIEWER')
    .map((member) => ({
      id: member.userId,
      label: `${member.user.name ?? member.user.email} · ${member.role}`,
    }));

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
    repoConnection: v.repoConnection
      ? {
          id: v.repoConnection.id,
          fullName: v.repoConnection.fullName,
          pinnedCommitSha: v.repoConnection.pinnedCommitSha,
        }
      : null,
    pullRequest: v.pullRequest
      ? {
          id: v.pullRequest.id,
          externalUrl: v.pullRequest.externalUrl,
          branch: v.pullRequest.branch,
          status: v.pullRequest.status,
        }
      : null,
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
  const pendingDrafts = copilotSuggestions.filter(
    (suggestion) => suggestion.status === 'PENDING',
  ).length;
  const memberNames = Object.fromEntries(
    members.map((member) => [member.userId, member.user.name ?? member.user.email]),
  );

  return (
    <div className="animate-rise">
      <div className="workspace-incident-breadcrumb-row">
        <Link href="/dashboard/incidents" className="workspace-filter-reset">
          ← All incidents
        </Link>
        <div className="workspace-incident-utilities">
          <WorkspaceRefresh refreshedAt={new Date().toISOString()} compact />
          <CopyIncidentLink incidentId={incident.id} />
        </div>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div className="workspace-incident-title-block min-w-0 flex-1">
          <p className="arch-page-eyebrow">
            {incident.project.name}
            {incident.service ? ` / ${incident.service.name}` : ''}
          </p>
          <h1>{incident.title}</h1>
          <p className="mt-3 text-[13px] text-slate-400">
            Opened {timeAgo(incident.startedAt)} by{' '}
            {incident.createdBy?.name ?? incident.createdBy?.email ?? incident.source.toLowerCase()}
            {' · '}
            {incident.resolvedAt
              ? `Resolved after ${formatDuration(incident.startedAt, incident.resolvedAt)}`
              : `Open for ${formatDuration(incident.startedAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeverityBadge severity={incident.severity} />
          <IncidentStateDropdown
            incidentId={incident.id}
            status={incident.status}
            canWrite={canWrite}
          />
        </div>
      </div>
      <nav className="workspace-jump-links" aria-label="Incident sections">
        <a href="#incident-timeline">Response timeline</a>
        <a href="#incident-context">Related context</a>
        <a href="#incident-assistance">
          Assistance{pendingDrafts ? ` · ${pendingDrafts} to review` : ''}
        </a>
      </nav>
      <div className="workspace-incident-layout">
        <div className="workspace-incident-main">
          {incident.description ? (
            <Card className="workspace-incident-summary">
              <CardHeader title="Impact & observations" />
              <CardBody>
                <p className="workspace-incident-description">{incident.description}</p>
              </CardBody>
            </Card>
          ) : null}
          <section
            id="incident-timeline"
            className="workspace-anchor"
            aria-label="Response timeline"
          >
            <Card>
              <CardHeader
                title="Response timeline"
                description="Your team’s updates, decisions, and status changes, oldest first."
                action={
                  canWrite ? (
                    <a href="#incident-update" className="workspace-filter-reset">
                      Add an update
                    </a>
                  ) : undefined
                }
              />
              <IncidentTimeline events={incident.events} memberNames={memberNames} />
            </Card>
          </section>
          {canWrite ? (
            <section
              id="incident-update"
              className="workspace-anchor"
              aria-label="Add a timeline update"
            >
              <Card>
                <CardHeader
                  title={
                    incident.status === 'RESOLVED'
                      ? 'Add a follow-up'
                      : 'Keep your team in the loop'
                  }
                  description="Updates are recorded on the timeline and may appear on a linked public status page. Keep them customer-safe."
                />
                <CardBody>
                  <CommentBox incidentId={incident.id} />
                </CardBody>
              </Card>
            </section>
          ) : (
            <p className="workspace-inline-notice">
              You have view-only access. A responder, admin, or owner can update this incident.
            </p>
          )}
          <details id="incident-context" className="workspace-disclosure workspace-anchor">
            <summary>Related services & incident history</summary>
            <div className="workspace-disclosure-body">
              {blastRadius.affectedServices.length ? (
                <Card>
                  <CardHeader
                    title="Related services"
                    description="Services in the dependency chain. Their recorded statuses do not establish the cause of this incident."
                  />
                  <CardBody>
                    <div className="grid gap-2">
                      {blastRadius.affectedServices.map((service) => (
                        <Link
                          key={service.id}
                          href={`/dashboard/services/${service.id}`}
                          className="workspace-service-item"
                        >
                          <strong>{service.name}</strong>
                          <ServiceStatusBadge status={service.status} />
                        </Link>
                      ))}
                    </div>
                    {blastRadius.relatedChanges.length ? (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <h3 className="text-sm font-medium text-slate-200">
                          Recent changes before this incident
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Context to investigate, not proof of causation.
                        </p>
                        {blastRadius.relatedChanges.slice(0, 5).map((change) => (
                          <p key={change.id} className="mt-3 text-[13px] text-slate-300">
                            {change.title}{' '}
                            <span className="text-xs text-slate-500">
                              ({change.type.toLowerCase()})
                            </span>
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              ) : (
                <p className="workspace-assistance-note">
                  No related services are configured for this incident.
                </p>
              )}
              <CorrelationPanel incidentId={incident.id} />
              <SimilarIncidentsPanel incidentId={incident.id} initialTitle={incident.title} />
            </div>
          </details>
          <details
            id="incident-assistance"
            className="workspace-disclosure workspace-anchor"
            open={pendingDrafts > 0}
          >
            <summary>
              Drafts & response assistance
              {pendingDrafts ? ` · ${pendingDrafts} awaiting review` : ''}
            </summary>
            <div className="workspace-disclosure-body">
              <p className="workspace-assistance-note">
                ARCH can help draft a summary, triage, or customer update. Check the evidence and
                approve a draft before it changes the incident.
              </p>
              <CopilotPanel
                incidentId={incident.id}
                canGenerate={roleHasPermission(organization.role, 'copilot.generate')}
                canReview={roleHasPermission(organization.role, 'copilot.review')}
                config={copilotConfig()}
                suggestions={copilotSuggestions}
              />
            </div>
          </details>
          <details className="workspace-disclosure">
            <summary>Verified code fixes & pull requests</summary>
            <div className="workspace-disclosure-body">
              <p className="workspace-assistance-note">
                Optional advanced workflow. A connected repository, sandbox verification, and a
                person’s approval are required before opening a pull request. ARCH never merges or
                deploys it.
              </p>
              <VerifiedFixPanel
                incidentId={incident.id}
                canGenerate={roleHasPermission(organization.role, 'fix.verify')}
                canApprove={roleHasPermission(organization.role, 'fix.approve')}
                repoConnections={repoConnectionViews}
                verifications={verificationViews}
              />
            </div>
          </details>
        </div>
        <aside className="workspace-incident-rail" aria-label="Incident ownership and details">
          <Card>
            <CardHeader
              title={canWrite ? 'Coordinate the response' : 'Response details'}
              description={
                canWrite
                  ? 'Keep ownership, severity, and the affected service current.'
                  : 'Your access is read-only.'
              }
            />
            <CardBody className="space-y-5">
              {canWrite ? (
                <>
                  <IncidentAssigneeForm
                    incidentId={incident.id}
                    assignedToId={incident.assignedToId}
                    assignees={assignable}
                  />
                  <IncidentSeverityForm incidentId={incident.id} severity={incident.severity} />
                  <ActionForm
                    action={updateIncidentAction}
                    submitLabel="Update service"
                    pendingLabel="Updating…"
                    variant="secondary"
                  >
                    <input type="hidden" name="incidentId" value={incident.id} />
                    <Field
                      label="Affected service"
                      htmlFor="serviceId"
                      hint={`Services in ${incident.project.name}.`}
                    >
                      <Select
                        id="serviceId"
                        name="serviceId"
                        defaultValue={incident.serviceId ?? ''}
                      >
                        <option value="">No service linked</option>
                        {services
                          .filter((service) => service.project.id === incident.projectId)
                          .map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                      </Select>
                    </Field>
                  </ActionForm>
                </>
              ) : (
                <DefinitionList
                  items={[
                    {
                      label: 'Assigned to',
                      value:
                        incident.assignedTo?.name ?? incident.assignedTo?.email ?? 'Unassigned',
                    },
                    {
                      label: 'Severity',
                      value: incident.severity.charAt(0) + incident.severity.slice(1).toLowerCase(),
                    },
                    { label: 'Service', value: incident.service?.name ?? 'No service linked' },
                  ]}
                />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Incident record" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: 'Project', value: incident.project.name },
                  { label: 'Source', value: incident.source.toLowerCase() },
                  { label: 'Started', value: formatDateTime(incident.startedAt) },
                  {
                    label: 'Resolved',
                    value: incident.resolvedAt
                      ? formatDateTime(incident.resolvedAt)
                      : 'Not resolved',
                  },
                  {
                    label: 'Duration at load',
                    value: formatDuration(incident.startedAt, incident.resolvedAt),
                  },
                  { label: 'Last update', value: formatDateTime(incident.updatedAt) },
                ]}
              />
            </CardBody>
          </Card>
          <details className="workspace-disclosure">
            <summary>Ask ARCH about this incident</summary>
            <div className="workspace-disclosure-body">
              <AskArchPanel incidentId={incident.id} />
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
