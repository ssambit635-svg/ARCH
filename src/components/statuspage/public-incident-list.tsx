import type { IncidentStatus } from '@/generated/prisma/client';
import { formatDateTime, timeAgo } from '@/lib/format';

export type PublicIncident = {
  id: string;
  title: string;
  status: IncidentStatus;
  startedAt: Date;
  resolvedAt: Date | null;
  updates: { id: string; body: string | null; createdAt: Date }[];
};

const statusLabel: Record<IncidentStatus, string> = {
  INVESTIGATING: 'Investigating',
  IDENTIFIED: 'Identified',
  MONITORING: 'Monitoring',
  RESOLVED: 'Resolved',
};

const statusDot: Record<IncidentStatus, string> = {
  INVESTIGATING: 'bg-rose-400',
  IDENTIFIED: 'bg-orange-400',
  MONITORING: 'bg-sky-400',
  RESOLVED: 'bg-emerald-400',
};

/** Customer-safe incident history for public status pages — no severities, no assignees. */
export function PublicIncidentList({ incidents }: { incidents: PublicIncident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-6 py-10 text-center">
        <p className="text-sm font-medium text-slate-200">No incidents in this period</p>
        <p className="mt-1 text-[13px] text-slate-500">Everything has been running smoothly.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {incidents.map((incident) => (
        <li key={incident.id} className="rounded-2xl border border-white/[0.07] bg-abyss-850/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-slate-100">{incident.title}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-slate-300">
              <span className={`size-1.5 rounded-full ${statusDot[incident.status]}`} aria-hidden />
              {statusLabel[incident.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(incident.startedAt)}
            {incident.resolvedAt ? ` → ${formatDateTime(incident.resolvedAt)}` : ' → ongoing'}
          </p>
          {incident.updates.length > 0 ? (
            <ol className="mt-4 space-y-3 border-l border-white/10 pl-4">
              {incident.updates.map((update) => (
                <li key={update.id}>
                  <p className="text-xs text-slate-500">{timeAgo(update.createdAt)}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">{update.body ?? 'Status update.'}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
