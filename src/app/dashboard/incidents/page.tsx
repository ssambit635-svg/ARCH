import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser, resolveOrganization } from '@/lib/session';
import { listIncidents } from '@/server/services/incident.service';
import { listProjects } from '@/server/services/project.service';
import { timeAgo } from '@/lib/format';
import { Card, EmptyState, PageHeader, Pagination, SeverityBadge, StatusBadge, Table } from '@/components/ui';
import { incidentListQuerySchema } from '@/lib/validation';

export const metadata: Metadata = { title: 'Incidents' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function IncidentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);
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

  const [{ items, total, totalPages, page }, projects] = await Promise.all([
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
  ]);

  const buildHref = (nextPage: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = first(value);
      if (single) next.set(key, single);
    }
    next.set('page', String(nextPage));
    return `/dashboard/incidents?${next.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Incidents"
        description={`${total} incident${total === 1 ? '' : 's'} matching the current filters.`}
        action={
          <Link className="rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-500" href="/dashboard/incidents/new">
            Declare incident
          </Link>
        }
      />

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3 px-5 py-4" method="get">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Search</span>
            <input
              name="q"
              defaultValue={query.q ?? ''}
              placeholder="Title or description"
              className="w-56 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Status</span>
            <select name="status" defaultValue={query.status ?? ''} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
              <option value="">Any</option>
              {['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Severity</span>
            <select name="severity" defaultValue={query.severity ?? ''} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
              <option value="">Any</option>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Project</span>
            <select name="projectId" defaultValue={query.projectId ?? ''} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm">
              <option value="">Any</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-300">
            <input type="checkbox" name="open" value="true" defaultChecked={query.open === true} className="size-4 rounded border-slate-700 bg-slate-950" />
            Open only
          </label>
          <button type="submit" className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm text-slate-200 hover:bg-slate-800">
            Apply filters
          </button>
          <Link className="pb-2 text-sm text-slate-400 hover:text-slate-200" href="/dashboard/incidents">
            Reset
          </Link>
        </form>
      </Card>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            title="No incidents match"
            description="Try clearing the filters, or declare a new incident to get started."
            action={
              <Link className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500" href="/dashboard/incidents/new">
                Declare incident
              </Link>
            }
          />
        ) : (
          <>
            <Table head={['Incident', 'Severity', 'Status', 'Project / service', 'Assigned', 'Updated']}>
              {items.map((incident) => (
                <tr key={incident.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-slate-100 hover:text-white" href={`/dashboard/incidents/${incident.id}`}>
                      {incident.title}
                    </Link>
                    <p className="text-xs text-slate-500">Started {timeAgo(incident.startedAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {incident.project.name}
                    {incident.service ? <span className="text-slate-500"> · {incident.service.name}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{incident.assignedTo?.name ?? incident.assignedTo?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{timeAgo(incident.updatedAt)}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </>
        )}
      </Card>
    </div>
  );
}
