'use client';

import { useEffect, useState } from 'react';

type Risk = {
  changeId: string;
  title: string;
  type: string;
  serviceName: string | null;
  author: string | null;
  occurredAt: string;
  risk: { probability: number; band: 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH'; drivers: { feature: string; value: string; lift: number }[]; fallback: boolean };
};

type Response = { trained: boolean; examples: number; incidents: number; windowMinutes: number; changes: Risk[] };

const BAND_STYLE: Record<Risk['risk']['band'], string> = {
  LOW: 'bg-emerald-500/15 text-emerald-300',
  GUARDED: 'bg-sky-500/15 text-sky-300',
  ELEVATED: 'bg-amber-500/15 text-amber-300',
  HIGH: 'bg-rose-500/15 text-rose-300',
};

const FEATURE_LABEL: Record<string, string> = {
  type: 'change type',
  hourBucket: 'time of day',
  weekday: 'weekday',
  filesBucket: 'size',
  authorKind: 'author',
  service: 'service',
  category: 'failure family',
};

type BlastRadius = {
  affectedServices: { id: string; name: string; status: string; distance: number }[];
  recentIncidents: { id: string; title: string; severity: string; status: string; startedAt: string }[];
  note: string;
};

/**
 * V7 — change-aware blast radius, loaded on demand: "this deploy ships — who is downstream of it?"
 * Graph distance 1 = depends directly on the changed service.
 */
function ChangeBlastRadius({ changeId }: { changeId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BlastRadius | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    const controller = new AbortController();
    fetch(`/api/changes/${changeId}/blast-radius`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load blast radius.');
        setData((await response.json()).data as BlastRadius);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load blast radius.');
      });
    return () => controller.abort();
  }, [open, data, changeId]);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs text-sky-300 hover:text-sky-200"
      >
        {open ? 'Hide blast radius' : 'Blast radius — who is downstream?'}
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          {!error && !data ? <p className="text-xs text-slate-500">Walking the dependency map…</p> : null}
          {data ? (
            <>
              <p className="text-xs text-slate-400">{data.note}</p>
              {data.affectedServices.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {data.affectedServices.map((service) => (
                    <li key={service.id} className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200">
                      {service.name} · hop {service.distance}
                    </li>
                  ))}
                </ul>
              ) : null}
              {data.recentIncidents.length > 0 ? (
                <p className="text-[10px] text-slate-500">
                  Recent incidents on the affected set:{' '}
                  {data.recentIncidents.slice(0, 3).map((incident) => incident.title).join(' · ')}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * V6 — which recent changes are most likely to cause an incident, and why.
 *
 * Shown while declaring an incident: the responder sees what changed on this service and how risky
 * your own history says it is. It never blocks or rolls anything back — it is a ranking aid.
 */
export function ChangeRiskPanel({ serviceId }: { serviceId?: string | null }) {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : '';
    fetch(`/api/changes/risk${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load change risk.');
        setData((await response.json()).data as Response);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load change risk.');
      });
    return () => controller.abort();
  }, [serviceId]);

  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <header className="mb-3">
        <h2 className="text-sm font-medium text-white">Change risk</h2>
        <p className="text-xs text-slate-500">
          Trained on your own history: a change counts as risky when an incident on the same service opened within{' '}
          {data?.windowMinutes ?? 60} minutes of it.
        </p>
      </header>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!error && data ? (
        data.trained ? (
          data.changes.length === 0 ? (
            <p className="text-sm text-slate-400">No changes recorded for this service yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.changes.slice(0, 5).map((change) => (
                <li key={change.changeId} className="rounded-lg border border-white/[0.07] bg-abyss-950/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-200">{change.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${BAND_STYLE[change.risk.band]}`}>
                      {change.risk.band.toLowerCase()} · {Math.round(change.risk.probability * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {change.type.toLowerCase()} · {change.author ?? 'unknown author'} ·{' '}
                    {new Date(change.occurredAt).toLocaleString('en-GB')}
                  </p>
                  {change.risk.drivers.length > 0 ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Because:{' '}
                      {change.risk.drivers
                        .map((driver) => `${FEATURE_LABEL[driver.feature] ?? driver.feature} = ${driver.value}`)
                        .join(', ')}
                    </p>
                  ) : null}
                  <ChangeBlastRadius changeId={change.changeId} />
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-slate-400">
            Not enough history yet — ARCH needs at least 20 changes, including some that were followed by an incident,
            before it will rank them ({data.examples} so far). Until then it says nothing rather than guessing.
          </p>
        )
      ) : null}

      {!error && !data ? <p className="text-sm text-slate-400">Scoring recent changes…</p> : null}
    </section>
  );
}
