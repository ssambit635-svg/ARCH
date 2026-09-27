import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listProjects, listServices } from '@/server/services/project.service';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { roleHasPermission } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, ServiceStatusBadge } from '@/components/ui';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Input, Select } from '@/components/ui/form';
import { PermissionGate } from '@/components/permission/permission-gate';
import { createProjectAction, createServiceAction, setServiceAutoStatusAction, updateServiceStatusAction } from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'Projects & services' };
export const dynamic = 'force-dynamic';

const serviceStatuses = ['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'MAINTENANCE'] as const;

export default async function ProjectsPage() {
  const { user, organization } = await requireDashboardContext();
  const canManage = roleHasPermission(organization.role, 'project.manage');

  const [projects, services] = await Promise.all([
    listProjects({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
  ]);

  const openByService = new Map<string, number>();
  await Promise.all(
    services.map(async (service) => {
      openByService.set(service.id, await incidentRepository.count(organization.id, { serviceId: service.id, open: true }));
    }),
  );

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Respond"
        title="Projects & services"
        description="Projects group services. A service's status is derived from its open incidents unless you pin it manually."
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" description="Create your first project — incidents, services and status pages hang off it." />
          ) : (
            projects.map((project) => {
              const projectServices = services.filter((service) => service.project.id === project.id);
              const projectOpen = projectServices.reduce((sum, service) => sum + (openByService.get(service.id) ?? 0), 0);
              return (
                <Card key={project.id}>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-sm font-bold text-indigo-200 ring-1 ring-inset ring-indigo-500/30">
                          {project.name.slice(0, 1).toUpperCase()}
                        </span>
                        {project.name}
                      </span>
                    }
                    description={`${project._count.services} service${project._count.services === 1 ? '' : 's'} · ${project._count.incidents} incident${
                      project._count.incidents === 1 ? '' : 's'
                    } · slug ${project.slug}`}
                    action={
                      projectOpen > 0 ? (
                        <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-inset ring-rose-500/30">
                          {projectOpen} open
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                          Healthy
                        </span>
                      )
                    }
                  />
                  <CardBody className="space-y-3">
                    {projectServices.length === 0 ? (
                      <p className="py-2 text-sm text-slate-400">No services in this project yet.</p>
                    ) : (
                      projectServices.map((service) => {
                        const openCount = openByService.get(service.id) ?? 0;
                        return (
                          <div key={service.id} className="group rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5 transition hover:border-white/[0.14]">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <Link href={`/dashboard/services/${service.id}`} className="text-sm font-semibold text-slate-100 hover:text-white hover:underline hover:decoration-indigo-400/60 hover:underline-offset-4">
                                  {service.name}
                                </Link>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {service.autoStatus ? 'status derived from incidents' : 'status pinned manually'} · updated {timeAgo(service.updatedAt)}
                                  {openCount > 0 ? <span className="font-medium text-rose-300"> · {openCount} open incident{openCount === 1 ? '' : 's'}</span> : null}
                                </p>
                              </div>
                              <ServiceStatusBadge status={service.status} />
                            </div>

                            {canManage ? (
                              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/[0.05] pt-3">
                                <ActionForm action={updateServiceStatusAction} submitLabel="Set status" variant="secondary" inline quiet>
                                  <input type="hidden" name="serviceId" value={service.id} />
                                  <Select name="status" defaultValue={service.status} className="w-40 !py-1.5 text-[13px]" aria-label={`Status for ${service.name}`}>
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
                                  inline
                                  quiet
                                >
                                  <input type="hidden" name="serviceId" value={service.id} />
                                  <input type="hidden" name="autoStatus" value={service.autoStatus ? 'false' : 'true'} />
                                </ActionForm>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}

                    <PermissionGate permission="project.manage">
                      <div className="border-t border-white/[0.06] pt-4">
                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Add a service</p>
                        <ActionForm action={createServiceAction} submitLabel="Add service" variant="secondary">
                          <input type="hidden" name="projectId" value={project.id} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Name" htmlFor={`service-name-${project.id}`}>
                              <Input id={`service-name-${project.id}`} name="name" required placeholder="API gateway" />
                            </Field>
                            <Field label="Initial status" htmlFor={`service-status-${project.id}`}>
                              <Select id={`service-status-${project.id}`} name="status" defaultValue="OPERATIONAL">
                                {serviceStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                          </div>
                        </ActionForm>
                      </div>
                    </PermissionGate>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-[68px]">
          <PermissionGate
            permission="project.manage"
            fallback={
              <Card>
                <CardHeader title="Read-only role" description={`Your role (${organization.role}) can view projects but not change them.`} />
              </Card>
            }
          >
            <Card>
              <CardHeader title="New project" description="ADMIN and OWNER only." />
              <CardBody>
                <ActionForm action={createProjectAction} submitLabel="Create project">
                  <Field label="Name" htmlFor="project-name">
                    <Input id="project-name" name="name" required placeholder="Payments platform" />
                  </Field>
                  <Field label="Description" htmlFor="project-description" hint="Optional.">
                    <Input id="project-description" name="description" placeholder="Owned by the payments team" />
                  </Field>
                </ActionForm>
              </CardBody>
            </Card>
          </PermissionGate>

          <Card>
            <CardHeader title="How status is computed" />
            <CardBody className="space-y-2.5 text-[13px] leading-relaxed text-slate-400">
              <p className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-400" />any open CRITICAL or HIGH incident → OUTAGE</p>
              <p className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />any other open incident → DEGRADED</p>
              <p className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />no open incidents → OPERATIONAL</p>
              <p className="border-t border-white/[0.06] pt-2.5 text-xs text-slate-500">Pin a status manually to hold a maintenance window open.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
