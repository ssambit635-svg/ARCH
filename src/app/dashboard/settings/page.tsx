import {
  WebhookCreateForm,
  WebhookEndpointActions,
  WebhookEndpointUrl,
} from '@/components/dashboard/webhook-forms';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listInvitations, listMembers } from '@/server/services/organization.service';
import { listEndpoints, listDeliveries } from '@/server/services/webhook.service';
import { listProjects, listServices } from '@/server/services/project.service';
import { roleHasPermission } from '@/lib/permissions';
import { formatDateTime, timeAgo } from '@/lib/format';
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  DefinitionList,
  PageHeader,
  Table,
} from '@/components/ui';
import { Tabs } from '@/components/ui/tabs';
import { ActionForm } from '@/components/dashboard/action-form';
import { ApiTokenManager } from '@/components/dashboard/api-token-manager';
import { InviteModal } from '@/components/organization/invite-modal';
import { MemberTable } from '@/components/organization/member-table';
import { PermissionGate } from '@/components/permission/permission-gate';
import { db } from '@/lib/db';
import { oauthLinkAction } from '@/app/(auth)/actions';
import { enabledOAuthProviders } from '@/lib/oauth-server';
import { OAUTH_PROVIDERS, isOAuthProviderId } from '@/lib/oauth';
import { listAuthEvents } from '@/server/services/auth-event.service';
import { Field, Input } from '@/components/ui/form';
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  rotateWebhookSecretAction,
  toggleWebhookEndpointAction,
  updateOrganizationAction,
  revokeInvitationAction,
} from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'people', label: 'People' },
  { id: 'integrations', label: 'Webhooks' },
  { id: 'tokens', label: 'API tokens' },
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, organization } = await requireDashboardContext();
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab = TABS.some((t) => t.id === rawTab)
    ? (rawTab as (typeof TABS)[number]['id'])
    : 'general';

  const canManageMembers = roleHasPermission(organization.role, 'member.manage');
  const canManageWebhooks = roleHasPermission(organization.role, 'webhook.manage');
  const canEditOrganization = roleHasPermission(organization.role, 'org.settings');
  const canReadWebhooks = roleHasPermission(organization.role, 'webhook.read');
  const oauthProviders = enabledOAuthProviders();
  const linkedAccounts =
    tab === 'general' && oauthProviders.length > 0
      ? await db.account.findMany({
          where: { userId: user.id, provider: { in: oauthProviders } },
          select: { id: true, provider: true },
        })
      : [];
  const linkedProviders = new Set(linkedAccounts.map((account) => account.provider));
  const recentSignIns = tab === 'general' ? await listAuthEvents(user.id, 5) : [];

  const [members, invitations, endpoints, projects, services] = await Promise.all([
    tab === 'people'
      ? listMembers({ organizationId: organization.id, userId: user.id })
      : Promise.resolve([]),
    tab === 'people'
      ? listInvitations({ organizationId: organization.id, userId: user.id })
      : Promise.resolve([]),
    tab === 'integrations' && canReadWebhooks
      ? listEndpoints({ organizationId: organization.id, userId: user.id })
      : Promise.resolve([]),
    tab === 'integrations' && canManageWebhooks
      ? listProjects({ organizationId: organization.id, userId: user.id })
      : Promise.resolve([]),
    tab === 'integrations' && canManageWebhooks
      ? listServices({ organizationId: organization.id, userId: user.id })
      : Promise.resolve([]),
  ]);

  const deliveriesByEndpoint = await Promise.all(
    endpoints.slice(0, 5).map(async (endpoint) => ({
      endpointId: endpoint.id,
      deliveries: canManageWebhooks
        ? await listDeliveries({
            organizationId: organization.id,
            userId: user.id,
            endpointId: endpoint.id,
            page: 1,
            pageSize: 5,
          })
        : null,
    })),
  );

  const tokens =
    tab === 'tokens' && canManageWebhooks
      ? await db.apiToken.findMany({
          where: { organizationId: organization.id, revokedAt: null },
          select: {
            id: true,
            name: true,
            prefix: true,
            scopes: true,
            createdAt: true,
            lastUsedAt: true,
          },
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
      />

      <div className="workspace-settings-layout">
        <aside className="workspace-settings-navigation" aria-label="Settings navigation">
          <Tabs
            variant="sidebar"
            label="Settings sections"
            tabs={TABS.map((t) => ({
              ...t,
              href: `/dashboard/settings?tab=${t.id}`,
              active: tab === t.id,
            }))}
          />
        </aside>
        <div className="workspace-settings-content">
          {tab === 'general' ? (
            <div className="workspace-settings-grid">
              <Card>
                <CardHeader
                  title="Organization"
                  description={`Slug: ${organization.slug} · your role: ${organization.role}`}
                />
                <CardBody>
                  {canEditOrganization ? (
                    <ActionForm action={updateOrganizationAction} submitLabel="Save organization">
                      <Field label="Name" htmlFor="org-name">
                        <Input
                          id="org-name"
                          name="name"
                          defaultValue={organization.name}
                          required
                          maxLength={80}
                        />
                      </Field>
                    </ActionForm>
                  ) : (
                    <Alert tone="info">Only an OWNER can change organization settings.</Alert>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Sign-in methods"
                  description="Connect a provider so you can sign in without typing a password. The separate GitHub token on Repositories is for creating pull requests."
                />
                <CardBody className="space-y-3 text-sm text-slate-300">
                  {oauthProviders.length === 0 ? (
                    <p>
                      No provider sign-in is enabled on this instance. Add AUTH_GOOGLE_ID and
                      AUTH_GOOGLE_SECRET, or AUTH_GITHUB_ID and AUTH_GITHUB_SECRET, to the server
                      environment to turn one on.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {oauthProviders.map((provider) => {
                        const name = OAUTH_PROVIDERS[provider].name;
                        const linked = linkedProviders.has(provider);
                        return (
                          <li
                            key={provider}
                            className="flex flex-wrap items-center justify-between gap-3"
                          >
                            <span className="flex items-center gap-2">
                              {linked ? (
                                <span className="grid size-6 place-items-center rounded-full bg-emerald-500/15 text-xs text-emerald-300">
                                  ✓
                                </span>
                              ) : null}
                              {linked
                                ? `${name} account linked. You can use “Continue with ${name}” on the sign-in page.`
                                : `${name} is not connected to your account yet.`}
                            </span>
                            {!linked ? (
                              <form action={oauthLinkAction}>
                                <input type="hidden" name="provider" value={provider} />
                                <input
                                  type="hidden"
                                  name="callbackUrl"
                                  value="/dashboard/settings"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                                >
                                  Link {name} account
                                </button>
                              </form>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="text-xs text-slate-400">
                    A provider is only connected after you sign in with your password. A matching
                    email address on its own never links an account.
                  </p>
                </CardBody>
              </Card>

              {recentSignIns.length > 0 ? (
                <Card>
                  <CardHeader
                    title="Recent sign-ins"
                    description="The last few authentication events recorded for your account."
                  />
                  <CardBody>
                    <ul className="space-y-2 text-xs text-slate-400">
                      {recentSignIns.map((event) => {
                        const providerName = isOAuthProviderId(event.provider)
                          ? OAUTH_PROVIDERS[event.provider].name
                          : event.provider;
                        return (
                          <li
                            key={event.id}
                            className="flex flex-wrap items-center justify-between gap-2"
                          >
                            <span className="text-slate-300">
                              {event.event === 'oauth_link'
                                ? `Linked ${providerName}`
                                : `Signed in with ${providerName}`}
                            </span>
                            <span>
                              {formatDateTime(event.createdAt)} · {event.ip ?? 'unknown address'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardBody>
                </Card>
              ) : null}
            </div>
          ) : null}

          {tab === 'people' ? (
            <div className="space-y-6">
              <Card>
                <CardHeader
                  title="Members"
                  description={`${members.length} member${members.length === 1 ? '' : 's'} · manage who can respond, view, and administer this workspace.`}
                  action={canManageMembers ? <InviteModal triggerLabel="Invite" /> : undefined}
                />
                <MemberTable
                  members={members}
                  currentUserId={user.id}
                  canManage={canManageMembers}
                />
              </Card>

              <Card>
                <CardHeader
                  title="Invitations"
                  description="Existing account holders receive an invitation email; otherwise, a one-time link is shown. You can revoke pending invitations."
                />
                <CardBody>
                  {invitations.length === 0 ? (
                    <p className="py-2 text-sm text-slate-400">No invitations yet.</p>
                  ) : (
                    <Table
                      head={
                        canManageMembers
                          ? ['Email', 'Role', 'Status', 'Expires', 'Invited', 'Actions']
                          : ['Email', 'Role', 'Status', 'Expires', 'Invited']
                      }
                    >
                      {invitations.map((invitation) => (
                        <tr key={invitation.id} className="link-row hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-slate-200 first:pl-5">
                            {invitation.email}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{invitation.role}</td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                invitation.status === 'ACCEPTED'
                                  ? 'success'
                                  : invitation.status === 'PENDING'
                                    ? 'neutral'
                                    : 'danger'
                              }
                            >
                              {invitation.status}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            <time dateTime={invitation.expiresAt.toISOString()}>
                              {formatDateTime(invitation.expiresAt)}
                            </time>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            {timeAgo(invitation.createdAt)}
                          </td>
                          {canManageMembers ? (
                            <td className="px-4 py-3 last:pr-5">
                              {invitation.status === 'PENDING' ? (
                                <ActionForm
                                  action={revokeInvitationAction}
                                  submitLabel="Revoke"
                                  variant="danger"
                                  inline
                                  quiet
                                  confirm={`Revoke the pending invitation for ${invitation.email}? Its link will stop working immediately.`}
                                >
                                  <input type="hidden" name="invitationId" value={invitation.id} />
                                </ActionForm>
                              ) : (
                                <span className="text-xs text-slate-600">—</span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </Table>
                  )}
                </CardBody>
              </Card>
            </div>
          ) : null}

          {tab === 'integrations' ? (
            <div className="workspace-settings-webhooks">
              <div className="min-w-0 space-y-5">
                {!canReadWebhooks ? (
                  <Alert tone="info">
                    Your role cannot view webhook endpoints. Ask an owner or admin for access.
                  </Alert>
                ) : endpoints.length === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="py-2 text-sm text-slate-400">
                        No endpoints configured. Create one to let Grafana, Sentry or GitHub open
                        incidents for you.
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  endpoints.map((endpoint) => {
                    const deliveries = deliveriesByEndpoint.find(
                      (entry) => entry.endpointId === endpoint.id,
                    )?.deliveries;
                    return (
                      <Card key={endpoint.id}>
                        <CardBody className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                                <span className="arch-mono">{endpoint.provider}</span>
                                {endpoint.isActive ? (
                                  <Badge tone="success">active</Badge>
                                ) : (
                                  <Badge tone="danger">disabled</Badge>
                                )}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {endpoint.description ?? 'No description'} ·{' '}
                                {endpoint._count.deliveries} deliveries · last{' '}
                                {timeAgo(endpoint.lastDeliveryAt)}
                              </p>
                            </div>
                            {canManageWebhooks ? (
                              <WebhookEndpointActions
                                actions={{
                                  toggle: toggleWebhookEndpointAction,
                                  rotate: rotateWebhookSecretAction,
                                  remove: deleteWebhookEndpointAction,
                                }}
                                endpointId={endpoint.id}
                                isActive={endpoint.isActive}
                                provider={endpoint.provider}
                              />
                            ) : null}
                          </div>

                          <DefinitionList
                            items={[
                              {
                                label: 'Endpoint URL',
                                value: (
                                  <WebhookEndpointUrl
                                    provider={endpoint.provider}
                                    externalId={endpoint.externalId}
                                  />
                                ),
                              },
                              {
                                label: 'Routes to',
                                value: `${endpoint.project.name}${endpoint.service ? ` / ${endpoint.service.name}` : ''}`,
                              },
                              {
                                label: 'Signature header',
                                value: (
                                  <span className="arch-mono text-xs">
                                    x-arch-signature: t=&lt;unix&gt;,v1=&lt;hmac&gt;
                                  </span>
                                ),
                              },
                            ]}
                          />

                          {deliveries && deliveries.items.length > 0 ? (
                            <div className="border-t border-white/[0.06] pt-3">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Recent deliveries
                              </p>
                              <Table head={['Result', 'HTTP', 'Incident', 'When']}>
                                {deliveries.items.map((delivery) => (
                                  <tr key={delivery.id}>
                                    <td className="px-4 py-2 first:pl-5">
                                      <Badge
                                        tone={
                                          delivery.status === 'ACCEPTED'
                                            ? 'success'
                                            : delivery.status === 'DUPLICATE'
                                              ? 'neutral'
                                              : 'danger'
                                        }
                                      >
                                        {delivery.status}
                                      </Badge>
                                    </td>
                                    <td className="arch-mono px-4 py-2 text-xs text-slate-300">
                                      {delivery.httpStatus}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-400">
                                      {delivery.incidentId ? (
                                        <span className="arch-mono">
                                          {delivery.incidentId.slice(0, 8)}
                                        </span>
                                      ) : (
                                        (delivery.error ?? '—')
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-400 last:pr-5">
                                      {timeAgo(delivery.receivedAt)}
                                    </td>
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

              <div className="min-w-0">
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
                    <CardHeader
                      title="New endpoint"
                      description="POST signed JSON — valid payloads open incidents."
                    />
                    <CardBody>
                      <WebhookCreateForm
                        action={createWebhookEndpointAction}
                        key={organization.id}
                        projects={projects.map((project) => ({
                          id: project.id,
                          name: project.name,
                        }))}
                        services={services.map((service) => ({
                          id: service.id,
                          name: service.name,
                          projectId: service.projectId,
                        }))}
                      />
                    </CardBody>
                  </Card>
                </PermissionGate>
              </div>
            </div>
          ) : null}

          {tab === 'tokens' ? (
            <PermissionGate
              permission="webhook.manage"
              fallback={<Alert tone="info">ADMIN or OWNER is required to manage API tokens.</Alert>}
            >
              <Card>
                <CardHeader
                  title="API tokens"
                  description="Organization-scoped credentials for the public API and CLI clients."
                />
                <CardBody>
                  <ApiTokenManager
                    key={organization.id}
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
      </div>
    </div>
  );
}
