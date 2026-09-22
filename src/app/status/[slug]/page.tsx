import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicStatusPage } from '@/server/services/statusPage.service';
import { formatDateTime, timeAgo } from '@/lib/format';
import { ServiceStatusBadge } from '@/components/ui';
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

const banner: Record<ServiceStatus, { label: string; className: string }> = {
  OPERATIONAL: { label: 'All systems operational', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' },
  MAINTENANCE: { label: 'Scheduled maintenance in progress', className: 'border-sky-500/40 bg-sky-500/10 text-sky-200' },
  DEGRADED: { label: 'Partially degraded service', className: 'border-amber-500/40 bg-amber-500/10 text-amber-200' },
  OUTAGE: { label: 'Major outage in progress', className: 'border-rose-500/40 bg-rose-500/10 text-rose-200' },
};

const severityText: Record<IncidentSeverity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicStatusPage(slug);
  if (!page) notFound();

  const overall = banner[page.overallStatus];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm text-slate-400">{page.organization.name}</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">{page.page.name}</h1>
        {page.page.description ? <p className="mt-2 text-sm text-slate-400">{page.page.description}</p> : null}
      </header>

      <div className={`mb-8 rounded-xl border px-5 py-4 ${overall.className}`} role="status">
        <p className="text-lg font-medium">{overall.label}</p>
        <p className="mt-1 text-xs opacity-80">
          Updated {timeAgo(page.generatedAt)} · {formatDateTime(page.generatedAt)}
        </p>
      </div>

      <section aria-labelledby="components">
        <h2 id="components" className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
          Components
        </h2>
        {page.components.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
            No components are published on this page yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            {page.components.map((component) => (
              <li key={component.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm text-slate-100">{component.name}</p>
                  {component.description ? <p className="text-xs text-slate-500">{component.description}</p> : null}
                </div>
                <ServiceStatusBadge status={component.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="incidents">
        <h2 id="incidents" className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
          Active incidents
        </h2>
        {page.activeIncidents.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
            No active incidents. We will post updates here if that changes.
          </p>
        ) : (
          <div className="space-y-4">
            {page.activeIncidents.map((incident) => (
              <article key={incident.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-medium text-white">{incident.title}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{severityText[incident.severity]}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{incident.status}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Started {timeAgo(incident.startedAt)}
                  {incident.componentName ? ` · affected: ${incident.componentName}` : ''}
                </p>
                {incident.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{incident.description}</p> : null}
                {incident.latestUpdate?.body ? (
                  <div className="mt-4 border-l-2 border-indigo-500/60 pl-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Latest update · {timeAgo(incident.latestUpdate.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{incident.latestUpdate.body}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 border-t border-slate-800 pt-4 text-xs text-slate-500">
        <p>
          This page is generated by <span className="text-slate-300">ARCH</span>. Last rendered {formatDateTime(page.generatedAt)}.
        </p>
      </footer>
    </main>
  );
}
