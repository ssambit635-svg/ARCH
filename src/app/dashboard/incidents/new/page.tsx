import type { Metadata } from 'next';
import { requireUser, resolveOrganization } from '@/lib/session';
import { listProjects, listServices } from '@/server/services/project.service';
import { listMembers } from '@/server/services/organization.service';
import { Card, CardHeader, CardBody, PageHeader } from '@/components/ui';
import { NewIncidentForm } from '@/components/incidents/new-incident-form';
import { ChangeRiskPanel } from '@/components/incidents/change-risk';

export const metadata: Metadata = { title: 'Declare incident' };
export const dynamic = 'force-dynamic';

export default async function NewIncidentPage() {
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);

  const [projects, services, members] = await Promise.all([
    listProjects({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
    listMembers({ organizationId: organization.id, userId: user.id }),
  ]);

  const assignable = members.filter((member) => member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'RESPONDER');

  return (
    <div>
      <PageHeader
        title="Declare an incident"
        description="Opening an incident records the first timeline event, notifies the responders and updates the service status."
      />
      <Card className="mb-6 max-w-3xl">
        <CardHeader
          title="Recent change risk"
          description="Changes most likely to have caused this, ranked by ARCH from your own incident history."
        />
        <CardBody>
          <ChangeRiskPanel />
        </CardBody>
      </Card>
      <Card className="max-w-3xl">
        <CardHeader title="Incident details" description="Required: a title and a project." />
        <CardBody>
          {projects.length === 0 ? (
            <p className="text-sm text-amber-200">
              You need at least one project first — create one under Projects &amp; services.
            </p>
          ) : (
            <NewIncidentForm
              projects={projects.map((project) => ({ id: project.id, name: project.name }))}
              services={services.map((service) => ({ id: service.id, name: service.name, projectId: service.project.id }))}
              assignees={assignable.map((member) => ({ id: member.userId, label: member.user.name ?? member.user.email }))}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
