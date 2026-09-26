import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listProjects, listServices } from '@/server/services/project.service';
import { roleHasPermission } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, ServiceStatusBadge } from '@/components/ui';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Input, Select } from '@/components/ui/form';
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

  return (
    <div>
      <PageHeader
        title="Projects & services"
        description="Projects group services. A service's status is derived from its open incidents unless you pin it manually."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" description="Create your first project — incidents, services and status pages hang off it." />
          ) : (
            projects.map((project) => {
              const projectServices = services.filter((service) => service.project.id === project.id);
              return (
                <Card key={project.id}>
                  <CardHeader
                    title={project.name}
                    description={`${project._count.services} service${project._count.services === 1 ? '' : 's'} · ${project._count.incidents} incident${
                      project._count.incidents === 1 ? '' : 's'
                    } · slug ${project.slug}`}
                  />
                  <CardBody className="space-y-4">
                    {projectServices.length === 0 ? (
                      <p className="text-sm text-slate-400">No services in this project yet.</p>
                    ) : (
                      projectServices.map((service) => (
                        <div key={service.id} className="rounded-lg border border-slate-800 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-100">{service.name}</p>
                              <p className="text-xs text-slate-500">
                                {service.autoStatus ? 'status derived from incidents' : 'status pinned manually'} · updated {timeAgo(service.updatedAt)}
                              </p>
                            </div>
                            <ServiceStatusBadge status={service.status} />
                          </div>

                          {canManage ? (
                            <div className="mt-3 flex flex-wrap items-end gap-3">
                              <ActionForm action={updateServiceStatusAction} submitLabel="Set status" variant="secondary" inline>
                                <input type="hidden" name="serviceId" value={service.id} />
                                <Select name="status" defaultValue={service.status} className="w-40">
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
                              >
                                <input type="hidden" name="serviceId" value={service.id} />
                                <input type="hidden" name="autoStatus" value={service.autoStatus ? 'false' : 'true'} />
                              </ActionForm>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}

                    {canManage ? (
                      <div className="border-t border-slate-800 pt-4">
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Add a service</p>
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
                    ) : null}
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          {canManage ? (
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
          ) : (
            <Card>
              <CardHeader title="Read-only role" description={`Your role (${organization.role}) can view projects but not change them.`} />
            </Card>
          )}

          <Card>
            <CardHeader title="How status is computed" />
            <CardBody className="space-y-2 text-sm text-slate-400">
              <p>• any open CRITICAL or HIGH incident → OUTAGE</p>
              <p>• any other open incident → DEGRADED</p>
              <p>• no open incidents → OPERATIONAL</p>
              <p className="pt-2 text-xs text-slate-500">Pin a status manually to hold a maintenance window open.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
