import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { serviceRepository } from '@/server/repositories/service.repository';
import { listIncidents } from '@/server/services/incident.service';
import { formatDateTime, timeAgo } from '@/lib/format';
import { Badge, Card, CardBody, CardHeader, DefinitionList, EmptyState, ServiceStatusBadge, Table } from '@/components/ui';
import { ButtonLink } from '@/components/ui/button';
import { Stat } from '@/components/ui/stat';
import { ActionForm } from '@/components/dashboard/action-form';
import { Select } from '@/components/ui/form';
import { PermissionGate } from '@/components/permission/permission-gate';
import { IncidentRow } from '@/components/incident/incident-row';
import { setServiceAutoStatusAction, updateServiceStatusAction } from '@/app/dashboard/actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: 'Service' };
}

const serviceStatuses = ['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'MAINTENANCE'] as const;

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, organization } = await requireDashboardContext();

  const service = await serviceRepository.findById(organization.id, id);
  if (!service) notFound();

  const [openFeed, history] = await Promise.all([
    listIncidents({ organizationId: organization.id, userId: user.id, page: 1, pageSize: 10, filters: { serviceId: service.id, open: true } }),
    listIncidents({ organizationId: organization.id, userId: user.id, page: 1, pageSize: 10, filters: { serviceId: service.id } }),
  ]);

  const historyOnly = history.items.filter((incident) => incident.status === 'RESOLVED');

  return (
    <div className="animate-rise">
      <Link href="/dashboard/projects" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-200">
        ← Projects & services
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-lg font-bold text-indigo-200 ring-1 ring-inset ring-indigo-500/30">
            {service.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-white">{service.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {service.project.name} · slug <span className="arch-mono text-xs">{service.slug}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <ServiceStatusBadge status={service.status} />
          <ButtonLink href={`/dashboard/incidents/new`} variant="danger" size="sm">
            + Declare incident
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Live status"
          value={service.status.charAt(0) + service.status.slice(1).toLowerCase()}
          tone={service.status === 'OPERATIONAL' ? 'success' : service.status === 'MAINTENANCE' ? 'info' : 'danger'}
          hint={service.autoStatus ? 'Derived from open incidents' : 'Pinned manually'}
        />
        <Stat label="Open incidents" value={openFeed.total} tone={openFeed.total > 0 ? 'danger' : 'success'} hint="Attached to this service" />
        <Stat label="Total incidents" value={history.total} tone="neutral" hint="All time on this service" />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Live incidents feed"
              description={openFeed.total > 0 ? 'Unresolved incidents on this service, newest first.' : 'Nothing burning on this service right now.'}
              action={openFeed.total > 0 ? <Badge tone="danger">{openFeed.total} open</Badge> : <Badge tone="success">Clear</Badge>}
            />
            {openFeed.items.length === 0 ? (
              <CardBody>
                <EmptyState title="No open incidents" description="This service is clear. New incidents attached here will appear live." />
              </CardBody>
            ) : (
              <Table head={['Incident', 'Severity', 'Status', 'Service', 'Assignee', 'Updated']}>
                {openFeed.items.map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} showProject={false} />
                ))}
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="History" description="Recently resolved incidents on this service." />
            {historyOnly.length === 0 ? (
              <CardBody>
                <p className="py-2 text-sm text-slate-400">No resolved incidents yet.</p>
              </CardBody>
            ) : (
              <Table head={['Incident', 'Severity', 'Status', 'Service', 'Assignee', 'Updated']}>
                {historyOnly.slice(0, 8).map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} showProject={false} />
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-[68px]">
          <PermissionGate permission="project.manage" fallback={null}>
            <Card>
              <CardHeader title="Control status" description={service.autoStatus ? 'Override the derived status, or pin it.' : 'Currently pinned — release to re-derive.'} />
              <CardBody className="space-y-3">
                <ActionForm action={updateServiceStatusAction} submitLabel="Set status" variant="secondary" quiet>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <Select name="status" defaultValue={service.status} aria-label="Service status">
                    {serviceStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </ActionForm>
                <ActionForm
                  action={setServiceAutoStatusAction}
                  submitLabel={service.autoStatus ? 'Pin manually' : 'Derive from incidents'}
                  variant="secondary"
                  quiet
                >
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="autoStatus" value={service.autoStatus ? 'false' : 'true'} />
                </ActionForm>
              </CardBody>
            </Card>
          </PermissionGate>

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: 'Project', value: service.project.name },
                  { label: 'Slug', value: <span className="arch-mono text-xs">{service.slug}</span> },
                  { label: 'Mode', value: service.autoStatus ? 'Derived from incidents' : 'Pinned manually' },
                  { label: 'Created', value: formatDateTime(service.createdAt) },
                  { label: 'Updated', value: `${timeAgo(service.updatedAt)}` },
                ]}
              />
              {service.description ? (
                <p className="mt-4 border-t border-white/[0.06] pt-4 text-[13px] leading-relaxed text-slate-300">{service.description}</p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
