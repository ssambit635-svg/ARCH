import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listDependencyGraph } from '@/server/services/v6.service';
import { PageHeader, Card, CardBody, CardHeader, Badge } from '@/components/ui';
import { DependencyManager } from '@/components/dashboard/v6-manager';

export const metadata: Metadata = { title: 'Blast radius' };
export const dynamic = 'force-dynamic';

export default async function DependenciesPage() {
  const { user, organization: org } = await requireDashboardContext();
  const data = await listDependencyGraph({ organizationId: org.id, userId: user.id });

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Reliability"
        title="Blast radius & changes"
        description="Map service dependencies, and see recent deployments next to the incidents they may have caused."
      />

      <DependencyManager
        services={data.services.map((s) => ({ id: s.id, name: s.name, project: s.project.name }))}
        dependencies={data.dependencies.map((d) => ({ id: d.id, from: d.fromService.name, to: d.toService.name }))}
      />

      <Card>
        <CardHeader title="Recent changes" description="Last 14 days — changes are automatically correlated by service." />
        <CardBody className="space-y-1">
          {data.recentChanges.length ? (
            data.recentChanges.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 transition hover:bg-white/[0.03]">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Badge tone="accent">{c.type}</Badge>
                  <span className="truncate text-sm text-slate-200">{c.title}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {c.serviceId ? (data.services.find((s) => s.id === c.serviceId)?.name ?? 'Service') : 'Project-wide'} ·{' '}
                  {c.occurredAt.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="py-2 text-sm text-slate-400">No changes recorded yet — record deploys via the API to power correlation.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
