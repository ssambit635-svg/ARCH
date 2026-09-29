import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { serviceRepository } from '@/server/repositories/service.repository';
import { auditRepository } from '@/server/repositories/audit.repository';
import { organizationRepository } from '@/server/repositories/organization.repository';
import { timeAgo } from '@/lib/format';
import { AI_NAME } from '@/lib/brand';
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, ServiceStatusBadge, Table } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { ButtonLink } from '@/components/ui/button';
import { AiBadge, SparkIcon } from '@/components/ui/logo';
import { Sparkline } from '@/components/ui/sparkline';
import { Stat } from '@/components/ui/stat';
import { IncidentRow } from '@/components/incident/incident-row';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

function greeting(name: string | null): string {
  const hour = new Date().getHours();
  const part = hour < 5 ? 'Night shift' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name.split(' ')[0]}` : part;
}

function bucketByDay(dates: Date[], days = 14): number[] {
  const buckets = new Array<number>(days).fill(0);
  const now = Date.now();
  for (const date of dates) {
    const age = Math.floor((now - date.getTime()) / 86_400_000);
    if (age >= 0 && age < days) buckets[days - 1 - age]! += 1;
  }
  return buckets;
}

export default async function DashboardOverview() {
  const { user, organization } = await requireDashboardContext();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [open, critical, resolvedThisWeek, services, members, recentIncidents, recentAudit, sparkSource] = await Promise.all([
    incidentRepository.count(organization.id, { open: true }),
    incidentRepository.count(organization.id, { open: true, severity: 'CRITICAL' }),
    incidentRepository.count(organization.id, { status: 'RESOLVED', resolvedSince: sevenDaysAgo }),
    serviceRepository.list(organization.id),
    organizationRepository.countMembers(organization.id),
    incidentRepository.findRecent(organization.id, 6),
    auditRepository.list(organization.id, {}, { skip: 0, take: 7 }),
    incidentRepository.findRecent(organization.id, 40),
  ]);

  const impacted = services.filter((service) => service.status === 'DEGRADED' || service.status === 'OUTAGE');
  const openList = recentIncidents.filter((incident) => incident.status !== 'RESOLVED');
  const allClear = open === 0;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={`${organization.name} · ${today}`}
        title={greeting(user.name)}
        description={allClear ? 'All quiet. Here is the health of everything you own.' : `${open} incident${open === 1 ? '' : 's'} need${open === 1 ? 's' : ''} attention right now.`}
        action={
          <>
            <ButtonLink href={`/status/${organization.slug}`} prefetch={false} variant="secondary">
              View status page
            </ButtonLink>
            <ButtonLink href="/dashboard/incidents/new" variant="danger">
              + Declare incident
            </ButtonLink>
          </>
        }
      />

      {/* Hero status banner */}
      <div
        role="status"
        className={`relative mb-6 overflow-hidden rounded-2xl border p-5 sm:p-6 ${
          allClear
            ? 'border-state-ok/30 bg-state-ok/[0.06]'
            : 'border-state-down/30 bg-state-down/[0.06]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-xl ${allClear ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`} aria-hidden>
            {allClear ? '✓' : '!'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight text-white">
              {allClear ? 'All systems operational' : `${open} open incident${open === 1 ? '' : 's'} · ${impacted.length} service${impacted.length === 1 ? '' : 's'} impacted`}
            </p>
            <p className="mt-0.5 text-[13px] text-slate-400">
              {services.length} service{services.length === 1 ? '' : 's'} across the organization · {members} member{members === 1 ? '' : 's'} on call
            </p>
          </div>
          {!allClear && openList[0] ? (
            <ButtonLink href={`/dashboard/incidents/${openList[0].id}`} variant="secondary" size="sm">
              Jump to latest →
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Open incidents"
          value={open}
          tone={open > 0 ? 'danger' : 'success'}
          hint={open === 0 ? 'All clear — nothing burning' : critical > 0 ? `${critical} critical` : 'Unresolved right now'}
          spark={<Sparkline points={bucketByDay(sparkSource.filter((i) => i.status !== 'RESOLVED').map((i) => i.startedAt))} stroke={open > 0 ? '#fb7185' : '#34d399'} />}
        />
        <Stat
          label="Resolved · 7 days"
          value={resolvedThisWeek}
          tone="success"
          hint="Closed out this week"
          spark={<Sparkline points={bucketByDay(sparkSource.filter((i) => i.status === 'RESOLVED').map((i) => i.startedAt))} stroke="#34d399" />}
        />
        <Stat
          label="Services impacted"
          value={impacted.length}
          tone={impacted.length > 0 ? 'warning' : 'success'}
          hint={`${services.length} total · derived live`}
          spark={<Sparkline points={bucketByDay(sparkSource.map((i) => i.startedAt))} stroke="#818cf8" />}
        />
        <Stat label="Responders" value={members} tone="neutral" hint="Members in this org" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Open incidents */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title={openList.length > 0 ? 'Needs attention' : 'Recent incidents'}
              description={openList.length > 0 ? 'Open incidents, newest first.' : 'Newest first — click through for the full timeline.'}
              action={
                <Link className="text-[13px] font-medium text-signal-400 transition hover:text-signal-300" href="/dashboard/incidents">
                  All incidents →
                </Link>
              }
            />
            {(openList.length > 0 ? openList : recentIncidents).length === 0 ? (
              <CardBody>
                <EmptyState
                  title="No incidents yet"
                  description="When something breaks, declare an incident — or let a webhook do it for you."
                  action={<ButtonLink href="/dashboard/incidents/new" variant="primary">Declare incident</ButtonLink>}
                />
              </CardBody>
            ) : (
              <Table head={['Incident', 'Severity', 'Status', 'Service', 'Assignee', 'Updated']}>
                {(openList.length > 0 ? openList : recentIncidents).map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} />
                ))}
              </Table>
            )}
          </Card>

          {/* Activity */}
          <Card className="mt-6">
            <CardHeader
              title="Recent activity"
              description="Audit trail — ADMIN and above see the full log."
              action={
                <Link className="text-[13px] font-medium text-signal-400 transition hover:text-signal-300" href="/dashboard/audit">
                  Audit log →
                </Link>
              }
            />
            <CardBody className="space-y-1">
              {recentAudit.length === 0 ? (
                <p className="py-2 text-sm text-slate-400">Nothing recorded yet.</p>
              ) : (
                recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.03]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={entry.actor?.name} email={entry.actor?.email} size="xs" />
                      <span className="truncate text-[13px] text-slate-300">
                        <span className="font-medium text-slate-200">{entry.actor?.name ?? entry.actor?.email ?? 'system'}</span>{' '}
                        <span className="arch-mono text-xs text-slate-500">{entry.action}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{timeAgo(entry.createdAt)}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Service health"
              description="Live — derived from open incidents unless pinned."
              action={
                <Link className="text-[13px] font-medium text-signal-400 transition hover:text-signal-300" href="/dashboard/projects">
                  All →
                </Link>
              }
            />
            <CardBody className="space-y-1">
              {services.length === 0 ? (
                <p className="py-2 text-sm text-slate-400">
                  No services yet.{' '}
                  <Link className="text-signal-400 hover:text-signal-300" href="/dashboard/projects">
                    Add one
                  </Link>
                  .
                </p>
              ) : (
                services.slice(0, 8).map((service) => (
                  <Link
                    key={service.id}
                    href={`/dashboard/services/${service.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-200">{service.name}</span>
                      <span className="block truncate text-xs text-slate-500">{service.project.name}</span>
                    </span>
                    <ServiceStatusBadge status={service.status} />
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          {/* ARCH V1.1 */}
          <div className="relative overflow-hidden rounded-2xl border border-signal-500/25 bg-signal-500/[0.045] p-5">
            <div className="flex items-center justify-between">
              <AiBadge />
              <SparkIcon className="size-5 text-signal-400/70" />
            </div>
            <p className="mt-3 text-[15px] font-semibold tracking-tight text-white">Your on-call intelligence</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
              Triage, summaries, verified fixes and answers — generated on this server from your own incidents.
            </p>
            <div className="mt-4 flex gap-2">
              <ButtonLink href="/dashboard/model" variant="ai" size="sm">
                Open {AI_NAME}
              </ButtonLink>
              {openList[0] ? (
                <ButtonLink href={`/dashboard/incidents/${openList[0].id}`} variant="secondary" size="sm">
                  Ask about latest
                </ButtonLink>
              ) : null}
            </div>
          </div>

          <Card>
            <CardHeader title="Quick actions" />
            <CardBody className="grid grid-cols-2 gap-2">
              {[
                { label: 'New project', href: '/dashboard/projects' },
                { label: 'Invite member', href: '/dashboard/settings?tab=people' },
                { label: 'Add webhook', href: '/dashboard/settings?tab=integrations' },
                { label: 'Publish page', href: '/dashboard/status' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[13px] font-medium text-slate-300 transition hover:border-signal-500/40 hover:bg-signal-500/[0.08] hover:text-white"
                >
                  {action.label}
                </Link>
              ))}
            </CardBody>
          </Card>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
            <Badge tone="neutral">Every write is audited</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
