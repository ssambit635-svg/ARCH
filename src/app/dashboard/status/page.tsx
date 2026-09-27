import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listStatusPages } from '@/server/services/statusPage.service';
import { listServices } from '@/server/services/project.service';
import { roleHasPermission } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, ServiceStatusBadge } from '@/components/ui';
import { ActionForm } from '@/components/dashboard/action-form';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/form';
import { PermissionGate } from '@/components/permission/permission-gate';
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
    <div className="animate-rise">
      <PageHeader
        eyebrow="Respond"
        title="Status pages"
        description="Publish a page your customers can read. Unpublished pages return 404 — even to people who guess the slug."
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {pages.length === 0 ? (
            <EmptyState title="No status pages yet" description="Create one, add the services you want to expose, then publish." />
          ) : (
            pages.map((page) => (
              <Card key={page.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2.5">
                      {page.name}
                      {page.isPublished ? <Badge tone="success">● published</Badge> : <Badge tone="neutral">draft</Badge>}
                    </span>
                  }
                  description={
                    page.isPublished ? (
                      <>
                        Live at <span className="arch-mono text-xs text-slate-300">/status/{page.slug}</span> · published {timeAgo(page.publishedAt)}
                      </>
                    ) : (
                      <>
                        Slug reserved: <span className="arch-mono text-xs text-slate-300">/status/{page.slug}</span>
                      </>
                    )
                  }
                  action={
                    <a
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-indigo-400 transition hover:text-indigo-300"
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
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Components on this page</p>
                    {page.services.length === 0 ? (
                      <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5 text-[13px] text-amber-200">
                        No services selected — the page will show “all operational” and nothing else.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {page.services.map((entry) => (
                          <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.03]">
                            <Link href={`/dashboard/services/${entry.serviceId}`} className="min-w-0 text-sm text-slate-200 hover:text-white hover:underline">
                              {entry.displayName ?? entry.service.name}
                              <span className="text-slate-500"> · {entry.service.project.name}</span>
                            </Link>
                            <ServiceStatusBadge status={entry.service.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {canManage ? (
                    <div className="border-t border-white/[0.06] pt-4">
                      <ActionForm action={updateStatusPageAction} submitLabel="Save components" variant="secondary">
                        <input type="hidden" name="statusPageId" value={page.id} />
                        <fieldset>
                          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Choose services</legend>
                          {services.length === 0 ? (
                            <p className="text-sm text-slate-400">No services exist yet.</p>
                          ) : (
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {services.map((service) => (
                                <label key={service.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-2 text-[13px] text-slate-300 transition hover:border-white/15">
                                  <Checkbox
                                    name="serviceIds"
                                    value={service.id}
                                    defaultChecked={page.services.some((entry) => entry.serviceId === service.id)}
                                    aria-label={`${service.project.name} / ${service.name}`}
                                  />
                                  <span className="truncate">
                                    {service.name} <span className="text-slate-500">· {service.project.name}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </fieldset>
                      </ActionForm>
                    </div>
                  ) : null}

                  {canPublish ? (
                    <div className="border-t border-white/[0.06] pt-4">
                      <ActionForm
                        action={publishStatusPageAction}
                        submitLabel={page.isPublished ? 'Unpublish' : 'Publish page'}
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

        <div className="space-y-6 lg:sticky lg:top-[68px]">
          <PermissionGate permission="statuspage.manage">
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
                  {services.length > 0 ? (
                    <fieldset>
                      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Services</legend>
                      <div className="grid gap-1.5">
                        {services.map((service) => (
                          <label key={service.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-2 text-[13px] text-slate-300 transition hover:border-white/15">
                            <Checkbox name="serviceIds" value={service.id} aria-label={`${service.project.name} / ${service.name}`} />
                            <span className="truncate">
                              {service.name} <span className="text-slate-500">· {service.project.name}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                </ActionForm>
              </CardBody>
            </Card>
          </PermissionGate>

          <Card>
            <CardHeader title="How publishing works" />
            <CardBody className="space-y-2 text-[13px] leading-relaxed text-slate-400">
              <p>Public pages render statically and revalidate on every dashboard write — a status change shows up immediately.</p>
              <p className="text-xs text-slate-500">Drafts 404 for everyone, including logged-in viewers outside the org.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
