import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser, resolveOrganization } from '@/lib/session';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { serviceRepository } from '@/server/repositories/service.repository';
import { auditRepository } from '@/server/repositories/audit.repository';
import { organizationRepository } from '@/server/repositories/organization.repository';
import { timeAgo } from '@/lib/format';
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, SeverityBadge, ServiceStatusBadge, StatusBadge, Table } from '@/components/ui';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

function StatCard({ label, value, hint, tone = 'neutral' }: { label: string; value: string | number; hint?: string; tone?: 'neutral' | 'danger' | 'success' }) {
  const tones = { neutral: 'text-white', danger: 'text-rose-300', success: 'text-emerald-300' } as const;
  return (
    <Card>
      <CardBody>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-2 text-3xl font-semibold ${tones[tone]}`}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

export default async function DashboardOverview() {
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [open, critical, resolvedThisWeek, services, members, recentIncidents, recentAudit] = await Promise.all([
    incidentRepository.count(organization.id, { open: true }),
    incidentRepository.count(organization.id, { open: true, severity: 'CRITICAL' }),
    incidentRepository.count(organization.id, { status: 'RESOLVED', resolvedSince: sevenDaysAgo }),
    serviceRepository.list(organization.id),
    organizationRepository.countMembers(organization.id),
    incidentRepository.findRecent(organization.id, 6),
    auditRepository.list(organization.id, {}, { skip: 0, take: 6 }),
  ]);

  const impacted = services.filter((service) => service.status === 'DEGRADED' || service.status === 'OUTAGE');

  return (
    <div>
      <PageHeader
        title={`${organization.name} — today`}
        description="Open incidents, live service health and the most recent changes across the organization."
        action={
          <Link className="rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-500" href="/dashboard/incidents/new">
            Declare incident
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open incidents" value={open} tone={open > 0 ? 'danger' : 'success'} hint={open === 0 ? 'All clear' : 'Unresolved right now'} />
        <StatCard label="Critical open" value={critical} tone={critical > 0 ? 'danger' : 'neutral'} hint="Severity CRITICAL" />
        <StatCard label="Resolved · 7 days" value={resolvedThisWeek} tone="success" hint="Closed out this week" />
        <StatCard label="Services impacted" value={impacted.length} tone={impacted.length > 0 ? 'danger' : 'success'} hint={`${services.length} services · ${members} members`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent incidents"
              description="Newest first. Click through for the full timeline."
              action={
                <Link className="text-sm text-indigo-400 hover:text-indigo-300" href="/dashboard/incidents">
                  All incidents
                </Link>
              }
            />
            {recentIncidents.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="No incidents yet"
                  description="When something breaks, declare an incident or let a webhook do it for you."
                  action={
                    <Link className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500" href="/dashboard/incidents/new">
                      Declare incident
                    </Link>
                  }
                />
              </CardBody>
            ) : (
              <Table head={['Incident', 'Severity', 'Status', 'Assigned', 'Updated']}>
                {recentIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-slate-100 hover:text-white" href={`/dashboard/incidents/${incident.id}`}>
                        {incident.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {incident.project.name}
                        {incident.service ? ` · ${incident.service.name}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{incident.assignedTo?.name ?? incident.assignedTo?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{timeAgo(incident.updatedAt)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Service health" description="Derived from open incidents unless pinned." />
            <CardBody className="space-y-2">
              {services.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No services yet.{' '}
                  <Link className="text-indigo-400 hover:text-indigo-300" href="/dashboard/projects">
                    Add one
                  </Link>
                  .
                </p>
              ) : (
                services.slice(0, 8).map((service) => (
                  <div key={service.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{service.name}</p>
                      <p className="truncate text-xs text-slate-500">{service.project.name}</p>
                    </div>
                    <ServiceStatusBadge status={service.status} />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent activity" description="Audit trail (ADMIN+ sees the full log)." />
            <CardBody className="space-y-2">
              {recentAudit.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing recorded yet.</p>
              ) : (
                recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="arch-mono text-xs text-slate-300">{entry.action}</span>
                    <span className="shrink-0 text-xs text-slate-500">{timeAgo(entry.createdAt)}</span>
                  </div>
                ))
              )}
              <div className="pt-2">
                <Badge tone="neutral">Every write is audited</Badge>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
