import Link from 'next/link';
import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listSloStatus } from '@/server/services/v6.service';
import { serviceRepository } from '@/server/repositories/service.repository';
import { PageHeader, Card, CardBody, CardHeader, Badge, EmptyState } from '@/components/ui';
import { SloManager } from '@/components/dashboard/v6-manager';

export const metadata: Metadata = { title: 'SLOs' };
export const dynamic = 'force-dynamic';

export default async function SlosPage() {
  const { user, organization: org } = await requireDashboardContext();
  const [slos, services] = await Promise.all([
    listSloStatus({ organizationId: org.id, userId: user.id }),
    serviceRepository.list(org.id),
  ]);

  const burning = slos.filter((s) => s.alert).length;

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Reliability"
        title="SLO & error budgets"
        description={
          slos.length === 0
            ? 'Set reliability goals and catch budget-burning services before they become incidents.'
            : `${slos.length} SLO${slos.length === 1 ? '' : 's'} tracked${burning > 0 ? ` · ${burning} burning` : ' · all healthy'}`
        }
      />

      <SloManager
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        slos={slos.map((s) => ({
          id: s.id,
          serviceId: s.serviceId,
          service: s.service.name,
          targetPercent: s.targetPercent,
          windowDays: s.windowDays,
          burnAlertPercent: s.burnAlertPercent,
        }))}
      />

      {slos.length === 0 ? (
        <EmptyState title="No SLOs configured" description="Add one above to start tracking reliability against a target." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {slos.map((s) => (
            <Card key={s.id} className={s.alert ? '!border-rose-500/25' : ''}>
              <CardHeader
                title={
                  <Link href={`/dashboard/services/${s.serviceId}`} className="hover:text-white hover:underline hover:decoration-indigo-400/60 hover:underline-offset-4">
                    {s.service.name}
                  </Link>
                }
                description={`${s.service.project.name} · ${s.windowDays}-day window`}
                action={s.alert ? <Badge tone="danger">Budget burning</Badge> : <Badge tone="success">Healthy</Badge>}
              />
              <CardBody>
                <div className="flex items-end justify-between">
                  <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-white">{s.actualPercent}%</span>
                  <span className="text-[13px] text-slate-400">target {s.targetPercent}%</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={`h-2 rounded-full transition-all ${s.alert ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                    style={{ width: `${Math.min(100, Math.max(2, s.burnPercent))}%` }}
                  />
                </div>
                <p className="mt-2.5 text-xs tabular-nums text-slate-500">
                  {s.downtimeMinutes}m downtime · {s.errorBudgetPercent}% budget remaining · {s.burnPercent}% consumed
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
