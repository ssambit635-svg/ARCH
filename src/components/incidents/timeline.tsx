import { formatDateTime, timeAgo } from '@/lib/format';
import type { IncidentEventType } from '@/generated/prisma/client';

type TimelineEvent = {
  id: string;
  type: IncidentEventType;
  body: string | null;
  actorLabel: string | null;
  metadata: unknown;
  createdAt: Date;
  author: { id: string; name: string | null; email: string } | null;
};

const typeLabels: Record<IncidentEventType, string> = {
  CREATED: 'opened the incident',
  STATUS_CHANGED: 'changed the status',
  SEVERITY_CHANGED: 'changed the severity',
  ASSIGNED: 'changed the assignment',
  COMMENT: 'commented',
  LINKED: 'linked a service',
};

function metadataSummary(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  if (typeof record.from === 'string' && typeof record.to === 'string') return `${record.from} → ${record.to}`;
  if (typeof record.to === 'string') return `→ ${record.to}`;
  if (typeof record.serviceId === 'string') return 'service link updated';
  return null;
}

function isCopilotEntry(metadata: unknown): boolean {
  return Boolean(metadata && typeof metadata === 'object' && (metadata as Record<string, unknown>).source === 'copilot');
}

export function IncidentTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-400">No timeline entries yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event) => {
        const actor = event.author?.name ?? event.author?.email ?? event.actorLabel ?? 'system';
        const summary = metadataSummary(event.metadata);
        return (
          <li key={event.id} className="relative border-b border-slate-800/70 px-5 py-4 last:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-slate-200">
                <span className="font-medium text-white">{actor}</span>{' '}
                <span className="text-slate-400">{typeLabels[event.type]}</span>{' '}
                {summary && event.type !== 'COMMENT' ? <span className="arch-mono text-xs text-slate-400">({summary})</span> : null}
                {isCopilotEntry(event.metadata) ? (
                  <span
                    className="ml-1 inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/30"
                    title="Drafted by ARCH Copilot, reviewed and approved by this person"
                  >
                    Copilot draft · approved
                  </span>
                ) : null}
              </p>
              <time className="text-xs text-slate-500" dateTime={event.createdAt.toISOString()} title={formatDateTime(event.createdAt)}>
                {timeAgo(event.createdAt)}
              </time>
            </div>
            {event.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{event.body}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
