import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listStatusPages } from '@/server/services/statusPage.service';
import { listServices } from '@/server/services/project.service';
import { roleHasPermission } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, ServiceStatusBadge } from '@/components/ui';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Input, Textarea } from '@/components/ui/form';
import { createStatusPageAction, publishStatusPageAction, updateStatusPageAction } from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'Status pages' };
export const dynamic = 'force-dynamic';

export default async function StatusPagesPage() {
  const { user, organization } = await requireDashboardContext();
  const canManage = roleHasPermission(organization.role, 'statuspage.manage');
  const canPublish = roleHasPermission(organization.role, 'statuspage.publish');

  const [pages, services] = await Promise.all([
    listStatusPages({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
  ]);

  return (
    <div>
      <PageHeader
        title="Status pages"
        description="Publish a page your customers can read. Unpublished pages return 404 — even to people who guess the slug."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {pages.length === 0 ? (
            <EmptyState title="No status pages yet" description="Create one, add the services you want to expose, then publish." />
          ) : (
            pages.map((page) => (
              <Card key={page.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      {page.name}
                      {page.isPublished ? <Badge tone="success">published</Badge> : <Badge tone="neutral">draft</Badge>}
                    </span>
                  }
                  description={
                    page.isPublished ? `Live at /status/${page.slug} · published ${timeAgo(page.publishedAt)}` : `Slug reserved: /status/${page.slug}`
                  }
                  action={
                    <a
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                      href={`/status/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open page ↗
                    </a>
                  }
                />
                <CardBody className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Components on this page</p>
                    {page.services.length === 0 ? (
                      <p className="text-sm text-amber-200">No services selected — the page will show “all operational” and nothing else.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {page.services.map((entry) => (
                          <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-200">
                              {entry.displayName ?? entry.service.name}
                              <span className="text-slate-500"> · {entry.service.project.name}</span>
                            </span>
                            <ServiceStatusBadge status={entry.service.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {canManage ? (
                    <div className="border-t border-slate-800 pt-4">
                      <ActionForm action={updateStatusPageAction} submitLabel="Save components" variant="secondary">
                        <input type="hidden" name="statusPageId" value={page.id} />
                        <fieldset className="space-y-2">
                          <legend className="mb-1 text-xs uppercase tracking-wide text-slate-500">Choose services</legend>
                          {services.length === 0 ? (
                            <p className="text-sm text-slate-400">No services exist yet.</p>
                          ) : (
                            services.map((service) => (
                              <label key={service.id} className="flex items-center gap-2 text-sm text-slate-300">
                                <input
                                  type="checkbox"
                                  name="serviceIds"
                                  value={service.id}
                                  defaultChecked={page.services.some((entry) => entry.serviceId === service.id)}
                                  className="size-4 rounded border-slate-700 bg-slate-950"
                                />
                                {service.project.name} / {service.name}
                              </label>
                            ))
                          )}
                        </fieldset>
                      </ActionForm>
                    </div>
                  ) : null}

                  {canPublish ? (
                    <div className="border-t border-slate-800 pt-4">
                      <ActionForm
                        action={publishStatusPageAction}
                        submitLabel={page.isPublished ? 'Unpublish' : 'Publish'}
                        variant={page.isPublished ? 'secondary' : 'primary'}
                      >
                        <input type="hidden" name="statusPageId" value={page.id} />
                        <input type="hidden" name="isPublished" value={page.isPublished ? 'false' : 'true'} />
                      </ActionForm>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          {canManage ? (
            <Card>
              <CardHeader title="New status page" description="ADMIN and OWNER only. Slugs are global and must be unique." />
              <CardBody>
                <ActionForm action={createStatusPageAction} submitLabel="Create page">
                  <Field label="Name" htmlFor="page-name">
                    <Input id="page-name" name="name" required placeholder="Acme status" />
                  </Field>
                  <Field label="Slug" htmlFor="page-slug" hint="Leave empty to derive it from the name.">
                    <Input id="page-slug" name="slug" placeholder="acme" />
                  </Field>
                  <Field label="Description" htmlFor="page-description">
                    <Textarea id="page-description" name="description" rows={2} placeholder="Current status of Acme services" />
                  </Field>
                  <fieldset className="space-y-2">
                    <legend className="mb-1 text-xs uppercase tracking-wide text-slate-500">Services</legend>
                    {services.map((service) => (
                      <label key={service.id} className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" name="serviceIds" value={service.id} className="size-4 rounded border-slate-700 bg-slate-950" />
                        {service.project.name} / {service.name}
                      </label>
                    ))}
                  </fieldset>
                </ActionForm>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Caching" />
            <CardBody className="text-sm text-slate-400">
              <p>
                Public pages are rendered statically and revalidated on every dashboard write, so a status change shows up immediately without
                hammering the database on every visitor.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
