import type { Metadata } from 'next';
import { requireUser, resolveOrganization } from '@/lib/session';
import { listInvitations, listMembers } from '@/server/services/organization.service';
import { listEndpoints, listDeliveries } from '@/server/services/webhook.service';
import { listProjects, listServices } from '@/server/services/project.service';
import { roleHasPermission, ROLES } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Alert, Badge, Card, CardBody, CardHeader, DefinitionList, PageHeader, Table } from '@/components/ui';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Input, Select } from '@/components/ui/form';
import {
  changeMemberRoleAction,
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  inviteMemberAction,
  removeMemberAction,
  rotateWebhookSecretAction,
  toggleWebhookEndpointAction,
  updateOrganizationAction,
} from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);

  const canManageMembers = roleHasPermission(organization.role, 'member.manage');
  const canManageWebhooks = roleHasPermission(organization.role, 'webhook.manage');
  const canEditOrganization = roleHasPermission(organization.role, 'org.settings');

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

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Organization profile, people, and the integrations that open incidents for you." />

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
        <CardHeader title="Members" description={`${members.length} member${members.length === 1 ? '' : 's'} · roles are enforced server-side on every request.`} />
        <Table head={['Member', 'Role', 'Joined', canManageMembers ? 'Actions' : '']}>
          {members.map((member) => (
            <tr key={member.userId}>
              <td className="px-4 py-3">
                <p className="text-sm text-slate-100">{member.user.name ?? '—'}</p>
                <p className="text-xs text-slate-500">{member.user.email}</p>
              </td>
              <td className="px-4 py-3">
                <Badge tone={member.role === 'OWNER' ? 'accent' : 'neutral'}>{member.role}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-400">{timeAgo(member.createdAt)}</td>
              <td className="px-4 py-3">
                {canManageMembers ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <ActionForm action={changeMemberRoleAction} submitLabel="Change role" variant="secondary" inline>
                      <input type="hidden" name="userId" value={member.userId} />
                      <Select name="role" defaultValue={member.role} className="w-36">
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </Select>
                    </ActionForm>
                    {member.userId !== user.id ? (
                      <ActionForm action={removeMemberAction} submitLabel="Remove" variant="danger" inline>
                        <input type="hidden" name="userId" value={member.userId} />
                      </ActionForm>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card>
        <CardHeader
          title="Invitations"
          description="Invite by email. People who already have an ARCH account get an email; for everyone else the invite link is shown here once."
        />
        <CardBody className="space-y-5">
          {canManageMembers ? (
            <ActionForm action={inviteMemberAction} submitLabel="Send invitation">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Email" htmlFor="invite-email">
                  <Input id="invite-email" name="email" type="email" required placeholder="teammate@company.com" />
                </Field>
                <Field label="Role" htmlFor="invite-role">
                  <Select id="invite-role" name="role" defaultValue="RESPONDER">
                    <option value="ADMIN">ADMIN — manage everything except ownership</option>
                    <option value="RESPONDER">RESPONDER — run incidents</option>
                    <option value="VIEWER">VIEWER — read-only</option>
                  </Select>
                </Field>
              </div>
            </ActionForm>
          ) : (
            <Alert tone="info">ADMIN or OWNER is required to invite people.</Alert>
          )}

          {invitations.length === 0 ? (
            <p className="text-sm text-slate-400">No invitations yet.</p>
          ) : (
            <Table head={['Email', 'Role', 'Status', 'Expires', 'Invited']}>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="px-4 py-3 text-slate-200">{invitation.email}</td>
                  <td className="px-4 py-3 text-slate-300">{invitation.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={invitation.status === 'ACCEPTED' ? 'success' : invitation.status === 'PENDING' ? 'neutral' : 'danger'}>
                      {invitation.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{timeAgo(invitation.expiresAt)}</td>
                  <td className="px-4 py-3 text-slate-400">{timeAgo(invitation.createdAt)}</td>
                </tr>
              ))}
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Webhook endpoints"
          description="POST a JSON body signed with the endpoint secret. Valid payloads open incidents; everything is logged."
        />
        <CardBody className="space-y-6">
          {!canManageWebhooks ? (
            <Alert tone="info">ADMIN or OWNER is required to manage webhooks.</Alert>
          ) : (
            <ActionForm action={createWebhookEndpointAction} submitLabel="Create endpoint">
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            </ActionForm>
          )}

          {endpoints.length === 0 ? (
            <p className="text-sm text-slate-400">No endpoints configured.</p>
          ) : (
            endpoints.map((endpoint) => {
              const deliveries = deliveriesByEndpoint.find((entry) => entry.endpointId === endpoint.id)?.deliveries;
              return (
                <div key={endpoint.id} className="rounded-lg border border-slate-800 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        <span className="arch-mono">{endpoint.provider}</span>
                        {endpoint.isActive ? <Badge tone="success">active</Badge> : <Badge tone="danger">disabled</Badge>}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {endpoint.description ?? 'No description'} · {endpoint._count.deliveries} deliveries · last{' '}
                        {timeAgo(endpoint.lastDeliveryAt)}
                      </p>
                    </div>
                    {canManageWebhooks ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionForm action={toggleWebhookEndpointAction} submitLabel={endpoint.isActive ? 'Disable' : 'Enable'} variant="secondary" inline>
                          <input type="hidden" name="endpointId" value={endpoint.id} />
                          <input type="hidden" name="isActive" value={endpoint.isActive ? 'false' : 'true'} />
                        </ActionForm>
                        <ActionForm action={rotateWebhookSecretAction} submitLabel="Rotate secret" variant="secondary" inline>
                          <input type="hidden" name="endpointId" value={endpoint.id} />
                        </ActionForm>
                        <ActionForm action={deleteWebhookEndpointAction} submitLabel="Delete" variant="danger" inline>
                          <input type="hidden" name="endpointId" value={endpoint.id} />
                        </ActionForm>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <DefinitionList
                      items={[
                        {
                          label: 'Endpoint URL',
                          value: (
                            <span className="arch-mono break-all text-xs text-slate-300">
                              /api/webhooks/{endpoint.provider}?endpoint={endpoint.externalId}
                            </span>
                          ),
                        },
                        { label: 'Routes to', value: `${endpoint.project.name}${endpoint.service ? ` / ${endpoint.service.name}` : ''}` },
                        {
                          label: 'Signature header',
                          value: <span className="arch-mono text-xs">x-arch-signature: t=&lt;unix&gt;,v1=&lt;hmac&gt;</span>,
                        },
                      ]}
                    />
                  </div>

                  {deliveries && deliveries.items.length > 0 ? (
                    <div className="mt-4 border-t border-slate-800 pt-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Recent deliveries</p>
                      <Table head={['Result', 'HTTP', 'Incident', 'When']}>
                        {deliveries.items.map((delivery) => (
                          <tr key={delivery.id}>
                            <td className="px-4 py-2">
                              <Badge
                                tone={
                                  delivery.status === 'ACCEPTED' ? 'success' : delivery.status === 'DUPLICATE' ? 'neutral' : 'danger'
                                }
                              >
                                {delivery.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 arch-mono text-xs text-slate-300">{delivery.httpStatus}</td>
                            <td className="px-4 py-2 text-xs text-slate-400">
                              {delivery.incidentId ? <span className="arch-mono">{delivery.incidentId.slice(0, 8)}</span> : (delivery.error ?? '—')}
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-400">{timeAgo(delivery.receivedAt)}</td>
                          </tr>
                        ))}
                      </Table>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}
