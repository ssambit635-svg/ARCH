import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listInvitations, listMembers } from '@/server/services/organization.service';
import { listEndpoints, listDeliveries } from '@/server/services/webhook.service';
import { listProjects, listServices } from '@/server/services/project.service';
import { roleHasPermission } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Alert, Badge, Card, CardBody, CardHeader, DefinitionList, PageHeader, Table } from '@/components/ui';
import { Tabs } from '@/components/ui/tabs';
import { ActionForm } from '@/components/dashboard/action-form';
import { ApiTokenManager } from '@/components/dashboard/api-token-manager';
import { InviteModal } from '@/components/organization/invite-modal';
import { MemberTable } from '@/components/organization/member-table';
import { PermissionGate } from '@/components/permission/permission-gate';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { githubLoginAction } from '@/app/(auth)/actions';
import { Field, Input, Select } from '@/components/ui/form';
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  rotateWebhookSecretAction,
  toggleWebhookEndpointAction,
  updateOrganizationAction,
} from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'people', label: 'People' },
  { id: 'integrations', label: 'Webhooks' },
  { id: 'tokens', label: 'API tokens' },
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, organization } = await requireDashboardContext();
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab = TABS.some((t) => t.id === rawTab) ? (rawTab as (typeof TABS)[number]['id']) : 'general';

  const canManageMembers = roleHasPermission(organization.role, 'member.manage');
  const canManageWebhooks = roleHasPermission(organization.role, 'webhook.manage');
  const canEditOrganization = roleHasPermission(organization.role, 'org.settings');
  const githubEnabled = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
  const githubLinked = githubEnabled
    ? await db.account.findFirst({ where: { userId: user.id, provider: 'github' }, select: { id: true } })
    : null;

  const [members, invitations, endpoints, projects, services] = await Promise.all([
    listMembers({ organizationId: organization.id, userId: user.id }),
    listInvitations({ organizationId: organization.id, userId: user.id }).catch(() => []),
    listEndpoints({ organizationId: organization.id, userId: user.id }).catch(() => []),
    listProjects({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
  ]);

  const deliveriesByEndpoint = await Promise.all(
    endpoints.slice(0, 5).map(async (endpoint) => ({
      endpointId: endpoint.id,
      deliveries: canManageWebhooks
        ? await listDeliveries({ organizationId: organization.id, userId: user.id, endpointId: endpoint.id, page: 1, pageSize: 5 }).catch(() => null)
        : null,
    })),
  );

  const tokens = canManageWebhooks
    ? await db.apiToken.findMany({
        where: { organizationId: organization.id, revokedAt: null },
        select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    : [];

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Organization profile, people, and the integrations that open incidents for you."
        action={tab === 'people' && canManageMembers ? <InviteModal /> : undefined}
      />

      <div className="mb-6">
        <Tabs
          tabs={TABS.map((t) => ({
            ...t,
            href: `/dashboard/settings?tab=${t.id}`,
            active: tab === t.id,
            count: t.id === 'people' ? members.length : undefined,
          }))}
        />
      </div>

      {tab === 'general' ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Organization" description={`Slug: ${organization.slug} · your role: ${organization.role}`} />
            <CardBody>
              {canEditOrganization ? (
                <ActionForm action={updateOrganizationAction} submitLabel="Save organization">
                  <Field label="Name" htmlFor="org-name">
                    <Input id="org-name" name="name" defaultValue={organization.name} required maxLength={80} />
                  </Field>
                </ActionForm>
              ) : (
                <Alert tone="info">Only an OWNER can change organization settings.</Alert>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sign-in methods" description="GitHub OAuth is for logging in; the separate GitHub token on Repositories is for creating pull requests." />
            <CardBody className="space-y-3 text-sm text-slate-300">
              {!githubEnabled ? (
                <p>GitHub sign-in is off. Add AUTH_GITHUB_ID and AUTH_GITHUB_SECRET to the server environment to enable it.</p>
              ) : githubLinked ? (
                <p className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-emerald-500/15 text-xs text-emerald-300">✓</span>
                  GitHub account linked. You can use Continue with GitHub on the sign-in page.
                </p>
              ) : (
                <>
                  <p>Already using an email/password account? Link GitHub while signed in; we never link an account just because the email matches.</p>
                  <form action={githubLoginAction}>
                    <input type="hidden" name="callbackUrl" value="/dashboard/settings" />
                    <button type="submit" className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]">
                      Link GitHub account
                    </button>
                  </form>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'people' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Members"
              description={`${members.length} member${members.length === 1 ? '' : 's'} · roles are enforced server-side on every request.`}
              action={canManageMembers ? <InviteModal triggerLabel="Invite" /> : undefined}
            />
            <MemberTable members={members} currentUserId={user.id} canManage={canManageMembers} />
          </Card>

          <Card>
            <CardHeader
              title="Invitations"
              description="Invite by email. People who already have an ARCH account get an email; for everyone else the invite link is shown once."
            />
            <CardBody>
              {invitations.length === 0 ? (
                <p className="py-2 text-sm text-slate-400">No invitations yet.</p>
              ) : (
                <Table head={['Email', 'Role', 'Status', 'Expires', 'Invited']}>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="link-row hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-200 first:pl-5">{invitation.email}</td>
                      <td className="px-4 py-3 text-slate-300">{invitation.role}</td>
                      <td className="px-4 py-3">
                        <Badge tone={invitation.status === 'ACCEPTED' ? 'success' : invitation.status === 'PENDING' ? 'neutral' : 'danger'}>
                          {invitation.status}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{timeAgo(invitation.expiresAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400 last:pr-5">{timeAgo(invitation.createdAt)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'integrations' ? (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {endpoints.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="py-2 text-sm text-slate-400">No endpoints configured. Create one to let Grafana, Sentry or GitHub open incidents for you.</p>
                </CardBody>
              </Card>
            ) : (
              endpoints.map((endpoint) => {
                const deliveries = deliveriesByEndpoint.find((entry) => entry.endpointId === endpoint.id)?.deliveries;
                return (
                  <Card key={endpoint.id}>
                    <CardBody className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                            <span className="arch-mono">{endpoint.provider}</span>
                            {endpoint.isActive ? <Badge tone="success">active</Badge> : <Badge tone="danger">disabled</Badge>}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {endpoint.description ?? 'No description'} · {endpoint._count.deliveries} deliveries · last {timeAgo(endpoint.lastDeliveryAt)}
                          </p>
                        </div>
                        {canManageWebhooks ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionForm action={toggleWebhookEndpointAction} submitLabel={endpoint.isActive ? 'Disable' : 'Enable'} variant="secondary" inline quiet>
                              <input type="hidden" name="endpointId" value={endpoint.id} />
                              <input type="hidden" name="isActive" value={endpoint.isActive ? 'false' : 'true'} />
                            </ActionForm>
                            <ActionForm action={rotateWebhookSecretAction} submitLabel="Rotate secret" variant="secondary" inline quiet>
                              <input type="hidden" name="endpointId" value={endpoint.id} />
                            </ActionForm>
                            <ActionForm action={deleteWebhookEndpointAction} submitLabel="Delete" variant="danger" inline quiet>
                              <input type="hidden" name="endpointId" value={endpoint.id} />
                            </ActionForm>
                          </div>
                        ) : null}
                      </div>

                      <DefinitionList
                        items={[
                          { label: 'Endpoint URL', value: <span className="arch-mono break-all text-xs text-slate-300">/api/webhooks/{endpoint.provider}?endpoint={endpoint.externalId}</span> },
                          { label: 'Routes to', value: `${endpoint.project.name}${endpoint.service ? ` / ${endpoint.service.name}` : ''}` },
                          { label: 'Signature header', value: <span className="arch-mono text-xs">x-arch-signature: t=&lt;unix&gt;,v1=&lt;hmac&gt;</span> },
                        ]}
                      />

                      {deliveries && deliveries.items.length > 0 ? (
                        <div className="border-t border-white/[0.06] pt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Recent deliveries</p>
                          <Table head={['Result', 'HTTP', 'Incident', 'When']}>
                            {deliveries.items.map((delivery) => (
                              <tr key={delivery.id}>
                                <td className="px-4 py-2 first:pl-5">
                                  <Badge tone={delivery.status === 'ACCEPTED' ? 'success' : delivery.status === 'DUPLICATE' ? 'neutral' : 'danger'}>
                                    {delivery.status}
                                  </Badge>
                                </td>
                                <td className="arch-mono px-4 py-2 text-xs text-slate-300">{delivery.httpStatus}</td>
                                <td className="px-4 py-2 text-xs text-slate-400">
                                  {delivery.incidentId ? <span className="arch-mono">{delivery.incidentId.slice(0, 8)}</span> : (delivery.error ?? '—')}
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-400 last:pr-5">{timeAgo(delivery.receivedAt)}</td>
                              </tr>
                            ))}
                          </Table>
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                );
              })
            )}
          </div>

          <div className="lg:sticky lg:top-[68px]">
            <PermissionGate
              permission="webhook.manage"
              fallback={
                <Card>
                  <CardBody>
                    <Alert tone="info">ADMIN or OWNER is required to manage webhooks.</Alert>
                  </CardBody>
                </Card>
              }
            >
              <Card>
                <CardHeader title="New endpoint" description="POST signed JSON — valid payloads open incidents." />
                <CardBody>
                  <ActionForm action={createWebhookEndpointAction} submitLabel="Create endpoint">
                    <Field label="Provider name" htmlFor="webhook-provider" hint="github, sentry, grafana or anything you like.">
                      <Input id="webhook-provider" name="provider" required placeholder="grafana" />
                    </Field>
                    <Field label="Project" htmlFor="webhook-project">
                      <Select id="webhook-project" name="projectId" required defaultValue={projects[0]?.id ?? ''}>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Default service" htmlFor="webhook-service" hint="Optional — overrides where incidents land.">
                      <Select id="webhook-service" name="serviceId" defaultValue="">
                        <option value="">— none —</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.project.name} / {service.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Description" htmlFor="webhook-description">
                      <Input id="webhook-description" name="description" placeholder="Grafana alerting → payments" />
                    </Field>
                  </ActionForm>
                </CardBody>
              </Card>
            </PermissionGate>
          </div>
        </div>
      ) : null}

      {tab === 'tokens' ? (
        <PermissionGate
          permission="webhook.manage"
          fallback={
            <Alert tone="info">ADMIN or OWNER is required to manage API tokens.</Alert>
          }
        >
          <Card>
            <CardHeader title="API tokens" description="Organization-scoped credentials for the public API and CLI clients." />
            <CardBody>
              <ApiTokenManager
                organizationId={organization.id}
                initialTokens={tokens.map((token) => ({
                  ...token,
                  scopes: token.scopes as string[],
                  createdAt: token.createdAt.toISOString(),
                  lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
                }))}
              />
            </CardBody>
          </Card>
        </PermissionGate>
      ) : null}
    </div>
  );
}
