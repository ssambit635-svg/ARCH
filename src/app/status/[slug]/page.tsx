import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicStatusPage } from '@/server/services/statusPage.service';
import { formatDateTime, timeAgo } from '@/lib/format';
import { LogoMark } from '@/components/ui/logo';
import { PublicServiceBadge } from '@/components/statuspage/service-badge';
import { UptimeBars } from '@/components/statuspage/status-timeline';
import { PublicIncidentList } from '@/components/statuspage/public-incident-list';
import type { IncidentSeverity, ServiceStatus } from '@/generated/prisma/client';

/**
 * Public status page — no session, no organization context, cached.
 *
 * The lookup itself requires `isPublished: true`, so an unpublished (or unknown, or someone
 * else's) slug is indistinguishable from a 404, which is exactly the intent.
 */
export const revalidate = 30;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicStatusPage(slug);
  if (!page) return { title: 'Status page not found' };
  return {
    title: `${page.page.name} — status`,
    description: page.page.description ?? `Current status of ${page.organization.name} services.`,
    robots: { index: true, follow: true },
  };
}

const banner: Record<ServiceStatus, { label: string; ring: string; glow: string; text: string; dot: string }> = {
  OPERATIONAL: {
    label: 'All systems operational',
    ring: 'border-emerald-500/25',
    glow: 'from-emerald-500/[0.12]',
    text: 'text-emerald-200',
    dot: 'bg-emerald-400',
  },
  MAINTENANCE: {
    label: 'Scheduled maintenance in progress',
    ring: 'border-sky-500/25',
    glow: 'from-sky-500/[0.12]',
    text: 'text-sky-200',
    dot: 'bg-sky-400',
  },
  DEGRADED: {
    label: 'Partially degraded service',
    ring: 'border-amber-500/25',
    glow: 'from-amber-500/[0.12]',
    text: 'text-amber-200',
    dot: 'bg-amber-400',
  },
  OUTAGE: {
    label: 'Major outage in progress',
    ring: 'border-rose-500/25',
    glow: 'from-rose-500/[0.14]',
    text: 'text-rose-200',
    dot: 'bg-rose-400',
  },
};

type DayState = 'up' | 'degraded' | 'outage' | 'maintenance' | 'none';

/** Day-granularity history: any incident overlapping a day marks it, worst severity wins. */
function buildUptime(
  incidents: { severity: IncidentSeverity; startedAt: Date; resolvedAt: Date | null }[],
  days = 90,
): { bars: { date: string; state: DayState }[]; percent: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bars: { date: string; state: DayState }[] = [];

  for (let ago = days - 1; ago >= 0; ago -= 1) {
    const start = new Date(today.getTime() - ago * 86_400_000);
    const end = new Date(start.getTime() + 86_400_000);
    let state: DayState = 'up';
    for (const incident of incidents) {
      const incidentEnd = incident.resolvedAt ?? new Date();
      if (incident.startedAt < end && incidentEnd >= start) {
        state = incident.severity === 'CRITICAL' || incident.severity === 'HIGH' ? 'outage' : 'degraded';
        if (state === 'outage') break;
      }
    }
    bars.push({ date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), state });
  }

  const upDays = bars.filter((bar) => bar.state === 'up').length;
  return { bars, percent: ((upDays / days) * 100).toFixed(1) };
}

export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicStatusPage(slug);
  if (!page) notFound();

  const overall = banner[page.overallStatus];
  const uptime = buildUptime([
    ...page.activeIncidents.map((i) => ({ severity: i.severity, startedAt: i.startedAt, resolvedAt: i.resolvedAt })),
    ...page.history.map((i) => ({ severity: i.severity, startedAt: i.startedAt, resolvedAt: i.resolvedAt })),
  ]);

  return (
    <div className="relative min-h-screen">
      <div className="arch-backdrop pointer-events-none fixed inset-0" aria-hidden />

      <main className="relative mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-slate-500">{page.organization.name}</p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">{page.page.name}</h1>
            {page.page.description ? <p className="mt-1.5 text-sm text-slate-400">{page.page.description}</p> : null}
          </div>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-white/15 hover:text-slate-200"
          >
            <LogoMark size={18} />
            Powered by ARCH
          </Link>
        </header>

        <div className={`overflow-hidden rounded-2xl border bg-gradient-to-r via-abyss-850 to-abyss-850 p-5 sm:p-6 ${overall.ring} ${overall.glow}`} role="status">
          <p className={`flex items-center gap-2.5 text-lg font-semibold tracking-tight ${overall.text}`}>
            <span className={`size-2.5 rounded-full ${overall.dot} ${page.overallStatus === 'OPERATIONAL' ? '' : 'animate-pulse-dot'}`} aria-hidden />
            {overall.label}
          </p>
          <p className="mt-1 text-xs tabular-nums text-slate-500">
            Updated {timeAgo(page.generatedAt)} · {formatDateTime(page.generatedAt)}
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-white/[0.07] bg-abyss-850/80 p-5" aria-label="90-day uptime">
          <UptimeBars days={uptime.bars} uptimePercent={`${uptime.percent}%`} />
        </section>

        <section className="mt-8" aria-labelledby="components">
          <h2 id="components" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Components
          </h2>
          {page.components.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-5 py-4 text-sm text-slate-400">
              No components are published on this page yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.07] bg-abyss-850/80">
              {page.components.map((component) => (
                <li key={component.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{component.name}</p>
                    {component.description ? <p className="mt-0.5 truncate text-xs text-slate-500">{component.description}</p> : null}
                  </div>
                  <PublicServiceBadge status={component.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {page.activeIncidents.length > 0 ? (
          <section className="mt-10" aria-labelledby="active">
            <h2 id="active" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Active incidents · {page.activeIncidents.length}
            </h2>
            <div className="space-y-4">
              {page.activeIncidents.map((incident) => (
                <article key={incident.id} className="rounded-2xl border border-rose-500/20 bg-abyss-850/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium text-white">{incident.title}</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-200 ring-1 ring-inset ring-rose-500/25">
                      <span className="size-1.5 animate-pulse-dot rounded-full bg-rose-400" aria-hidden />
                      {incident.status.charAt(0) + incident.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Started {timeAgo(incident.startedAt)}
                    {incident.componentName ? ` · affecting ${incident.componentName}` : ''}
                  </p>
                  {incident.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{incident.description}</p> : null}
                  {incident.latestUpdate?.body ? (
                    <div className="mt-4 border-l-2 border-indigo-500/60 pl-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Latest update · {timeAgo(incident.latestUpdate.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{incident.latestUpdate.body}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10" aria-labelledby="history">
          <h2 id="history" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Past incidents · last 90 days
          </h2>
          <PublicIncidentList incidents={page.history} />
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-xs text-slate-600">
          <p>
            Status by <Link href="/" className="font-medium text-slate-400 transition hover:text-slate-200">ARCH</Link> · rendered {formatDateTime(page.generatedAt)}
          </p>
          <p className="arch-mono">/{slug}</p>
        </footer>
      </main>
    </div>
  );
}
