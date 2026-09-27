import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listProjects, listServices } from '@/server/services/project.service';
import { listMembers } from '@/server/services/organization.service';
import { Alert, Card, CardHeader, CardBody, PageHeader } from '@/components/ui';
import { NewIncidentForm } from '@/components/incidents/new-incident-form';
import { ChangeRiskPanel } from '@/components/incidents/change-risk';

export const metadata: Metadata = { title: 'Declare incident' };
export const dynamic = 'force-dynamic';

export default async function NewIncidentPage() {
  const { user, organization } = await requireDashboardContext();

  const [projects, services, members] = await Promise.all([
    listProjects({ organizationId: organization.id, userId: user.id }),
    listServices({ organizationId: organization.id, userId: user.id }),
    listMembers({ organizationId: organization.id, userId: user.id }),
  ]);

  const assignable = members.filter((member) => member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'RESPONDER');

  return (
    <div className="animate-rise mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Respond"
        title="Declare an incident"
        description="Opening an incident records the first timeline event, notifies the responders and updates the service status."
        action={
          <Link href="/dashboard/incidents" className="text-sm font-medium text-slate-400 transition hover:text-slate-200">
            ← Back to list
          </Link>
        }
      />
      <Card className="mb-6">
        <CardHeader
          title="Recent change risk"
          description="Changes most likely to have caused this, ranked by ARCH from your own incident history."
        />
        <CardBody>
          <ChangeRiskPanel />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Incident details" description="Required: a title and a project. Everything else can follow." />
        <CardBody>
          {projects.length === 0 ? (
            <Alert tone="warning">
              You need at least one project first —{' '}
              <Link href="/dashboard/projects" className="font-medium underline underline-offset-2">
                create one under Projects & services
              </Link>
              .
            </Alert>
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
