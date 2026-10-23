import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { listProjects, listServices } from '@/server/services/project.service';
import { listMembers } from '@/server/services/organization.service';
import { Alert, Card, CardHeader, CardBody, PageHeader, EmptyState } from '@/components/ui';
import { ButtonLink } from '@/components/ui/button';
import { NewIncidentForm } from '@/components/incidents/new-incident-form';
import { ChangeRiskPanel } from '@/components/incidents/change-risk';
import { createIncidentAction } from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'Declare incident' };
export const dynamic = 'force-dynamic';

export default async function NewIncidentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, organization } = await requireDashboardContext();
  if (!roleHasPermission(organization.role, 'incident.write'))
    return (
      <div className="workspace-new-incident">
        <PageHeader title="Declare an incident" />
        <Alert tone="info">
          Your role is view-only. An owner, admin, or responder can declare an incident for this
          workspace.
        </Alert>
        <ButtonLink className="mt-5" href="/dashboard/incidents" variant="secondary">
          Back to incidents
        </ButtonLink>
      </div>
    );

  const [projects, services, members, params] = await Promise.all([
    listProjects({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
    listMembers({ organizationId: organization.id, userId: user.id }),
    searchParams,
  ]);
  const selectedService =
    typeof params.serviceId === 'string'
      ? services.find((service) => service.id === params.serviceId)
      : undefined;
  const selectedProject =
    selectedService?.project.id ??
    (typeof params.projectId === 'string'
      ? projects.find((project) => project.id === params.projectId)?.id
      : undefined);
  const assignable = members.filter((member) => member.role !== 'VIEWER');
  const canManage = roleHasPermission(organization.role, 'project.manage');
  return (
    <div className="workspace-new-incident animate-rise">
      <Link href="/dashboard/incidents" className="workspace-filter-reset mb-5 inline-block">
        ← All incidents
      </Link>
      <PageHeader
        eyebrow="Start a response"
        title="Declare an incident"
        description="Capture the impact first. Your team can add context and refine the response as you go."
      />
      <Card>
        <CardHeader
          title="What’s happening?"
          description="A title and project are required. Severity starts at medium; choose the level that fits."
        />
        <CardBody>
          {projects.length === 0 ? (
            <EmptyState
              title="Create a project first"
              description={
                canManage
                  ? 'Incidents belong to a project. Create one, then come back to start your response.'
                  : 'Ask an owner or admin to create a project for your team. You can declare incidents once it is ready.'
              }
              action={
                canManage ? (
                  <ButtonLink href="/dashboard/projects">Create a project</ButtonLink>
                ) : undefined
              }
            />
          ) : (
            <NewIncidentForm
              projects={projects.map((project) => ({ id: project.id, name: project.name }))}
              services={services.map((service) => ({
                id: service.id,
                name: service.name,
                projectId: service.project.id,
              }))}
              assignees={assignable.map((member) => ({
                id: member.userId,
                label: member.user.name ?? member.user.email,
              }))}
              createAction={createIncidentAction}
              initialProjectId={selectedProject}
              initialServiceId={selectedService?.id}
            />
          )}
        </CardBody>
      </Card>
      {projects.length > 0 ? (
        <details className="workspace-disclosure mt-6">
          <summary>
            Review recent change risk{' '}
            <span className="workspace-muted text-xs">Optional context</span>
          </summary>
          <div className="workspace-disclosure-body">
            <p className="workspace-assistance-note">
              If enough change history is available, ARCH can suggest changes to investigate. This
              does not establish a cause.
            </p>
            <ChangeRiskPanel />
          </div>
        </details>
      ) : null}
    </div>
  );
}
