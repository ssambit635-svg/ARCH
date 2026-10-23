import Form from 'next/form';
import { PageSearchShortcut } from '@/components/ui/workspace-shortcut';
import { WorkspaceRefresh } from '@/components/dashboard/workspace-refresh';
import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { listIncidents } from '@/server/services/incident.service';
import { listProjects } from '@/server/services/project.service';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { Card, EmptyState, PageHeader, Pagination } from '@/components/ui';
import { ButtonLink } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented';
import { IncidentCollection } from '@/components/incidents/incident-collection';
import {
  incidentFilterHref,
  readIncidentFilters,
  type IncidentSearchParams,
} from '@/lib/incident-filters';

export const metadata: Metadata = { title: 'Incidents' };
export const dynamic = 'force-dynamic';
const STATUSES = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<IncidentSearchParams>;
}) {
  const { user, organization } = await requireDashboardContext();
  const { query, invalidFields } = readIncidentFilters(await searchParams);
  const canWrite = roleHasPermission(organization.role, 'incident.write');
  const canManage = roleHasPermission(organization.role, 'project.manage');
  const [{ items, total, totalPages, page }, projects, openCount, byStatus] = await Promise.all([
    listIncidents({
      organizationId: organization.id,
      userId: user.id,
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.q ? { q: query.q } : {}),
        ...(query.open ? { open: true } : {}),
      },
    }),
    listProjects({ organizationId: organization.id, userId: user.id }),
    incidentRepository.count(organization.id, { open: true }),
    incidentRepository.countByStatus(organization.id),
  ]);
  const hasFilters = Boolean(
    query.q || query.status || query.severity || query.projectId || query.open,
  );
  const unavailableProject = Boolean(
    query.projectId && !projects.some((project) => project.id === query.projectId),
  );
  const removableFilters = [
    ...(query.q ? [{ key: 'q', label: `Search: ${query.q}`, name: 'search' }] : []),
    ...(query.severity
      ? [
          {
            key: 'severity',
            label: `Severity: ${query.severity.charAt(0) + query.severity.slice(1).toLowerCase()}`,
            name: 'severity',
          },
        ]
      : []),
    ...(query.projectId
      ? [
          {
            key: 'projectId',
            label: `Project: ${projects.find((project) => project.id === query.projectId)?.name ?? 'Unavailable project'}`,
            name: 'project',
          },
        ]
      : []),
  ];
  const statusCount = (status: string) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const hrefWith = (overrides: Record<string, string | undefined>) =>
    incidentFilterHref(query, overrides);
  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Response"
        title="Incidents"
        description={`${total} ${hasFilters ? 'matching ' : ''}incident${total === 1 ? '' : 's'} · ${openCount} open in this workspace`}
        action={
          <>
            <WorkspaceRefresh refreshedAt={new Date().toISOString()} compact />
            {canWrite ? (
              <ButtonLink href="/dashboard/incidents/new">Declare incident</ButtonLink>
            ) : null}
          </>
        }
      />
      {invalidFields.length ? (
        <div className="workspace-inline-notice" role="status">
          Some filters in this link were invalid and have been ignored. Your other filters are still
          applied.{' '}
          <Link href="/dashboard/incidents" className="workspace-filter-reset">
            Clear all filters
          </Link>
        </div>
      ) : null}
      <div className="mb-4">
        <Form
          key={JSON.stringify(query)}
          className="workspace-filter-form workspace-filter-form--flat"
          action="/dashboard/incidents"
          aria-label="Filter incidents"
        >
          {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
          {query.open ? <input type="hidden" name="open" value="true" /> : null}
          <input type="hidden" name="pageSize" value={query.pageSize} />
          <label className="workspace-filter-search">
            <span className="workspace-filter-label-text">
              Search <PageSearchShortcut inputId="incident-query" />
            </span>
            <input
              id="incident-query"
              type="search"
              aria-label="Search incidents"
              name="q"
              defaultValue={query.q ?? ''}
              maxLength={200}
              placeholder="Search title or description…"
            />
          </label>
          <label>
            Severity
            <select name="severity" defaultValue={query.severity ?? ''}>
              <option value="">Any severity</option>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
                <option key={severity} value={severity}>
                  {severity.charAt(0) + severity.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project
            <select
              name="projectId"
              defaultValue={query.projectId ?? ''}
              aria-invalid={unavailableProject || undefined}
              aria-describedby={unavailableProject ? 'incident-project-unavailable' : undefined}
            >
              <option value="">All projects</option>
              {unavailableProject ? (
                <option value={query.projectId}>Unavailable project</option>
              ) : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div className="workspace-filter-actions">
            <button
              type="submit"
              className="workspace-button workspace-button--secondary px-4 text-sm"
            >
              Apply filters
            </button>
            {hasFilters ? (
              <Link className="workspace-filter-reset" href="/dashboard/incidents">
                Clear
              </Link>
            ) : null}
          </div>
          {unavailableProject ? (
            <p
              id="incident-project-unavailable"
              className="workspace-filter-unavailable"
              role="status"
            >
              The linked project is unavailable in this workspace. Choose a project or clear that
              filter.
            </p>
          ) : null}
        </Form>
      </div>
      {removableFilters.length ? (
        <div className="workspace-active-filters" role="group" aria-label="Active incident filters">
          {removableFilters.map((filter) => (
            <Link
              key={filter.key}
              href={hrefWith({ [filter.key]: undefined })}
              className="workspace-filter-chip"
              aria-label={`Clear ${filter.name} filter: ${filter.label}`}
              title={filter.label}
            >
              <span>{filter.label}</span>
              <span aria-hidden="true">×</span>
            </Link>
          ))}
        </div>
      ) : null}
      <Card>
        <div className="workspace-incident-list-toolbar">
          <SegmentedControl
            options={[
              {
                label: 'Open',
                href: hrefWith({ open: 'true', status: undefined }),
                active: query.open === true && !query.status,
                count: openCount,
              },
              ...STATUSES.map((status) => ({
                label: status.charAt(0) + status.slice(1).toLowerCase(),
                href: hrefWith({ status, open: undefined }),
                active: query.status === status,
                count: statusCount(status),
              })),
              {
                label: 'All',
                href: hrefWith({ open: undefined, status: undefined }),
                active: !query.open && !query.status,
              },
            ]}
          />
        </div>

        {items.length ? (
          <>
            <IncidentCollection incidents={items} />
            <Pagination
              page={page}
              totalPages={totalPages}
              buildHref={(nextPage) => incidentFilterHref(query, { page: nextPage })}
            />
          </>
        ) : (
          <div className="p-5">
            <EmptyState
              title={hasFilters ? 'No incidents match these filters' : 'No incidents yet'}
              description={
                hasFilters
                  ? 'Try a broader search, another lifecycle view, or clear the filters.'
                  : projects.length
                    ? 'Your team’s incident history will appear here when an incident is declared or a configured alert arrives.'
                    : 'A project gives incidents a home. Ask an owner or admin to create one, or create it below if you have access.'
              }
              action={
                hasFilters ? (
                  <ButtonLink href="/dashboard/incidents" variant="secondary">
                    Clear filters
                  </ButtonLink>
                ) : canWrite && projects.length ? (
                  <ButtonLink href="/dashboard/incidents/new">Declare incident</ButtonLink>
                ) : canManage && !projects.length ? (
                  <ButtonLink href="/dashboard/projects">Create a project</ButtonLink>
                ) : undefined
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}
