import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listIncidents } from '@/server/services/incident.service';
import { listProjects } from '@/server/services/project.service';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { Card, EmptyState, PageHeader, Pagination, Table } from '@/components/ui';
import { ButtonLink } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented';
import { IncidentRow } from '@/components/incident/incident-row';
import { incidentListQuerySchema } from '@/lib/validation';

export const metadata: Metadata = { title: 'Incidents' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUSES = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;

export default async function IncidentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, organization } = await requireDashboardContext();
  const params = await searchParams;

  const query = incidentListQuerySchema.parse({
    page: first(params.page),
    pageSize: first(params.pageSize),
    status: first(params.status),
    severity: first(params.severity),
    projectId: first(params.projectId),
    q: first(params.q),
    open: first(params.open),
  });

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
        ...(query.open !== undefined ? { open: query.open } : {}),
      },
    }),
    listProjects({ organizationId: organization.id, userId: user.id }),
    incidentRepository.count(organization.id, { open: true }),
    incidentRepository.countByStatus(organization.id),
  ]);

  const statusCount = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0;

  const hrefWith = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = first(value);
      if (single && key !== 'page') next.set(key, single);
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const queryString = next.toString();
    return `/dashboard/incidents${queryString ? `?${queryString}` : ''}`;
  };

  const buildHref = (nextPage: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = first(value);
      if (single) next.set(key, single);
    }
    next.set('page', String(nextPage));
    return `/dashboard/incidents?${next.toString()}`;
  };

  const hasFilters = Boolean(query.q ?? query.status ?? query.severity ?? query.projectId ?? query.open);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Respond"
        title="Incidents"
        description={
          openCount > 0
            ? `${openCount} open · ${total} matching the current filters`
            : `${total} incident${total === 1 ? '' : 's'} in history — nothing open`
        }
        action={<ButtonLink href="/dashboard/incidents/new" variant="danger">+ Declare incident</ButtonLink>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl
          options={[
            { label: 'Open', href: hrefWith({ open: 'true', status: undefined }), active: query.open === true && !query.status, count: openCount },
            ...STATUSES.map((status) => ({
              label: status.charAt(0) + status.slice(1).toLowerCase(),
              href: hrefWith({ status, open: undefined }),
              active: query.status === status,
              count: statusCount(status),
            })),
            { label: 'All', href: hrefWith({ open: undefined, status: undefined }), active: !query.open && !query.status, count: null },
          ]}
        />
      </div>

      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3 px-5 py-4" method="get">
          {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
          {query.open ? <input type="hidden" name="open" value="true" /> : null}
          <label className="min-w-52 flex-1 text-sm">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Search</span>
            <input
              name="q"
              defaultValue={query.q ?? ''}
              placeholder="Title or description…"
              className="w-full rounded-xl border border-white/10 bg-abyss-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Severity</span>
            <select name="severity" defaultValue={query.severity ?? ''} className="rounded-xl border border-white/10 bg-abyss-950/70 px-3 py-2 text-sm text-slate-200">
              <option value="">Any</option>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Project</span>
            <select name="projectId" defaultValue={query.projectId ?? ''} className="rounded-xl border border-white/10 bg-abyss-950/70 px-3 py-2 text-sm text-slate-200">
              <option value="">Any</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]">
            Apply
          </button>
          {hasFilters ? (
            <Link className="pb-2 text-sm text-slate-500 transition hover:text-slate-200" href="/dashboard/incidents">
              Reset
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No incidents match"
              description="Try clearing the filters — or declare a new incident to get started."
              action={<ButtonLink href="/dashboard/incidents/new" variant="primary">Declare incident</ButtonLink>}
            />
          </div>
        ) : (
          <>
            <Table head={['Incident', 'Severity', 'Status', 'Service', 'Assignee', 'Updated']}>
              {items.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))}
            </Table>
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </>
        )}
      </Card>
    </div>
  );
}
