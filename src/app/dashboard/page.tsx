import { WorkspaceRefresh } from '@/components/dashboard/workspace-refresh';
import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { serviceRepository } from '@/server/repositories/service.repository';
import { auditRepository } from '@/server/repositories/audit.repository';
import { organizationRepository } from '@/server/repositories/organization.repository';
import { projectRepository } from '@/server/repositories/project.repository';
import { statusPageRepository } from '@/server/repositories/statusPage.repository';
import { timeAgo, formatDateTime } from '@/lib/format';
import { workspaceHealth, statusPageDestination } from '@/lib/workspace-view';
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  ServiceStatusBadge,
} from '@/components/ui';
import { ButtonLink } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { IncidentCollection } from '@/components/incidents/incident-collection';
import {
  WorkspaceChecklist,
  WorkspaceHealthBanner,
  WorkspaceMetrics,
} from '@/components/dashboard/workspace-overview';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

const activityLabels: Record<string, string> = {
  'incident.create': 'opened an incident',
  'incident.comment': 'added a timeline update',
  'incident.status_change': 'updated an incident status',
  'incident.update': 'updated an incident',
  'incident.reopen': 'reopened an incident',
  'member.invite': 'invited a teammate',
  'statuspage.publish': 'published a status page',
  'statuspage.update': 'updated a status page',
  'statuspage.create': 'created a status page',
  'webhook.create': 'configured an alert webhook',
  'organization.create': 'created the workspace',
  'project.create': 'created a project',
  'service.create': 'added a service',
};

export default async function DashboardOverview() {
  const { user, organization } = await requireDashboardContext();
  const canWrite = roleHasPermission(organization.role, 'incident.write');
  const canManageProjects = roleHasPermission(organization.role, 'project.manage');
  const canReadAudit = roleHasPermission(organization.role, 'audit.read');
  const canPublish = roleHasPermission(organization.role, 'statuspage.manage');
  const [
    open,
    critical,
    resolvedThisWeek,
    services,
    members,
    openQueue,
    recentIncidents,
    recentAudit,
    projects,
    publishedPage,
  ] = await Promise.all([
    incidentRepository.count(organization.id, { open: true }),
    incidentRepository.count(organization.id, { open: true, severity: 'CRITICAL' }),
    incidentRepository.count(organization.id, {
      status: 'RESOLVED',
      resolvedSince: new Date(Date.now() - 7 * 86_400_000),
    }),
    serviceRepository.list(organization.id),
    organizationRepository.countMembers(organization.id),
    incidentRepository.findOpenForOverview(organization.id),
    incidentRepository.findRecent(organization.id, 5),
    canReadAudit
      ? auditRepository.list(organization.id, {}, { skip: 0, take: 5 })
      : Promise.resolve([]),
    projectRepository.count(organization.id),
    statusPageRepository.firstPublished(organization.id),
  ]);
  const impacted = services.filter(
    (service) => service.status === 'DEGRADED' || service.status === 'OUTAGE',
  );
  const health = workspaceHealth(open, services);
  const status = statusPageDestination(publishedPage);
  const needsSetup = projects === 0 || services.length === 0;
  const quickActions = [
    ...(canManageProjects
      ? [{ label: 'Manage projects & services', href: '/dashboard/projects' }]
      : []),
    ...(roleHasPermission(organization.role, 'member.manage')
      ? [{ label: 'Invite your team', href: '/dashboard/settings?tab=people' }]
      : []),
    ...(roleHasPermission(organization.role, 'webhook.manage')
      ? [{ label: 'Connect alert webhooks', href: '/dashboard/settings?tab=integrations' }]
      : []),
    ...(canPublish ? [{ label: 'Manage status pages', href: '/dashboard/status' }] : []),
  ];
  const queue = open > 0 ? openQueue : recentIncidents;

  return (
    <div className="animate-rise workspace-overview">
      <PageHeader
        eyebrow={organization.name}
        title={projects === 0 ? 'Set up your workspace' : 'Response overview'}
        description={
          projects === 0
            ? 'A few small steps to give your team a shared place to respond.'
            : 'Your incident queue, service health, and recent activity.'
        }
        action={
          <>
            <WorkspaceRefresh refreshedAt={new Date().toISOString()} compact />
            <ButtonLink
              href={status.href}
              prefetch={false}
              variant="secondary"
              target={status.public ? '_blank' : undefined}
              rel={status.public ? 'noopener noreferrer' : undefined}
            >
              {status.public ? (
                <>
                  <span className="workspace-overview-public-verb">View </span>public status
                </>
              ) : (
                'Status pages'
              )}{' '}
              <span aria-hidden="true">↗</span>
            </ButtonLink>
          </>
        }
      />
      <WorkspaceHealthBanner
        health={health}
        priorityHref={openQueue[0] ? `/dashboard/incidents/${openQueue[0].id}` : undefined}
      />
      <div className="workspace-overview-grid">
        <div className="workspace-overview-main">
          {needsSetup ? (
            <Card>
              <CardHeader
                title="Start with your services"
                description={
                  canManageProjects
                    ? 'Create a project, then add the services your team looks after.'
                    : 'An owner or admin can finish the workspace setup.'
                }
              />
              <CardBody>
                <WorkspaceChecklist
                  steps={[
                    {
                      title: 'Create your first project',
                      description: 'Group related services and their incident history.',
                      complete: projects > 0,
                      ...(canManageProjects
                        ? { href: '/dashboard/projects', action: 'Create project' }
                        : {}),
                    },
                    {
                      title: 'Add a service',
                      description: 'Track the status of an API, website, or another system.',
                      complete: services.length > 0,
                      ...(canManageProjects
                        ? { href: '/dashboard/projects', action: 'Add a service' }
                        : {}),
                    },
                    {
                      title: 'Publish a status page · optional',
                      description:
                        'Choose what your customers can see. Nothing is public until you publish.',
                      complete: Boolean(publishedPage),
                      ...(canPublish ? { href: '/dashboard/status', action: 'Set up a page' } : {}),
                    },
                  ]}
                />
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader
              title={open > 0 ? 'Response queue' : 'Recent incidents'}
              description={
                open > 0
                  ? 'Open incidents, ordered by severity and then age.'
                  : 'Your most recently created incidents.'
              }
              action={
                <Link
                  className="workspace-filter-reset"
                  href={open > 0 ? '/dashboard/incidents?open=true' : '/dashboard/incidents'}
                >
                  View all <span aria-hidden="true">→</span>
                </Link>
              }
            />
            {queue.length ? (
              <IncidentCollection incidents={queue} compact />
            ) : (
              <CardBody>
                <EmptyState
                  title="No incidents yet"
                  description={
                    projects === 0
                      ? 'Create a project first. Then your team can declare an incident here or receive one from a configured alert.'
                      : 'Your team’s incident history will appear here. Declare an incident when there is something to investigate.'
                  }
                  action={
                    canWrite && projects > 0 ? (
                      <ButtonLink href="/dashboard/incidents/new">Declare incident</ButtonLink>
                    ) : canManageProjects && projects === 0 ? (
                      <ButtonLink href="/dashboard/projects">Create a project</ButtonLink>
                    ) : undefined
                  }
                />
              </CardBody>
            )}
          </Card>
          <WorkspaceMetrics
            metrics={[
              {
                label: 'Open incidents',
                value: open,
                hint: critical
                  ? `${critical} critical · review first`
                  : 'Unresolved in this workspace',
                ...(open > 0 ? { tone: 'danger' as const } : {}),
                href: '/dashboard/incidents?open=true',
              },
              {
                label: 'Services impacted',
                value: impacted.length,
                hint: `Of ${services.length} configured services`,
                ...(impacted.length > 0 ? { tone: 'warning' as const } : {}),
                href: '/dashboard/projects',
              },
              {
                label: 'Resolved · 7 days',
                value: resolvedThisWeek,
                hint: 'Resolved in the past 7 days',
                href: '/dashboard/incidents?status=RESOLVED',
              },
              {
                label: 'Team members',
                value: members,
                hint: 'People in this workspace',
                href: '/dashboard/settings?tab=people',
              },
            ]}
          />
          {canReadAudit ? (
            <Card>
              <CardHeader
                title="Recent workspace activity"
                description="The latest recorded changes. Full details are in the audit log."
                action={
                  <Link className="workspace-filter-reset" href="/dashboard/audit">
                    Audit log <span aria-hidden="true">→</span>
                  </Link>
                }
              />
              <CardBody>
                {recentAudit.length ? (
                  <ul className="workspace-activity">
                    {recentAudit.map((entry) => (
                      <li key={entry.id}>
                        <Avatar name={entry.actor?.name} email={entry.actor?.email} size="xs" />
                        <div>
                          <p>
                            <strong>{entry.actor?.name ?? entry.actor?.email ?? 'System'}</strong>{' '}
                            {activityLabels[entry.action] ?? entry.action.replace(/[._]/g, ' ')}
                          </p>
                          <time
                            dateTime={entry.createdAt.toISOString()}
                            title={formatDateTime(entry.createdAt)}
                          >
                            {timeAgo(entry.createdAt)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="workspace-assistance-note">No activity recorded yet.</p>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>
        <div className="workspace-overview-rail">
          <Card>
            <CardHeader
              title="Service health"
              description="Recorded statuses, derived from incidents unless pinned manually."
              action={
                <Link className="workspace-filter-reset" href="/dashboard/projects">
                  View all
                </Link>
              }
            />
            <CardBody>
              {services.length ? (
                [...services]
                  .sort(
                    (a, b) =>
                      Number(b.status === 'OUTAGE' || b.status === 'DEGRADED') -
                      Number(a.status === 'OUTAGE' || a.status === 'DEGRADED'),
                  )
                  .slice(0, 8)
                  .map((service) => (
                    <Link
                      key={service.id}
                      href={`/dashboard/services/${service.id}`}
                      className="workspace-service-item"
                    >
                      <span>
                        <strong>{service.name}</strong>
                        <small>{service.project.name}</small>
                      </span>
                      <ServiceStatusBadge status={service.status} />
                    </Link>
                  ))
              ) : (
                <p className="workspace-assistance-note">
                  No services configured.{' '}
                  {canManageProjects ? (
                    <Link href="/dashboard/projects" className="workspace-filter-reset">
                      Add your first service
                    </Link>
                  ) : (
                    'Ask an owner or admin to add a service.'
                  )}
                </p>
              )}
            </CardBody>
          </Card>
          {quickActions.length ? (
            <Card>
              <CardHeader title="Workspace shortcuts" />
              <CardBody className="workspace-quick-links">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    {action.label}
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="Need more context?" />
            <CardBody>
              <p className="workspace-assistance-note">
                Ask about an incident, look up a runbook, or draft an update. Suggestions can be
                wrong; your team reviews them before acting.
              </p>
              <Link href="/dashboard/chat" className="workspace-filter-reset mt-4 inline-block">
                Ask ARCH <span aria-hidden="true">→</span>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
