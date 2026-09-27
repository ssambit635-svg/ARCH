'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Repeat = {
  id: string;
  title: string;
  severity: string;
  status: string;
  serviceName: string | null;
  source: string;
  startedAt: string;
  resolvedAt: string | null;
  current: boolean;
};

type SharedRootCause = {
  category: string | null;
  categoryLabel: string | null;
  confidence: number;
  evidence: 'shared_alert_signature' | 'same_failure_family' | 'none';
  fromIncidentId: string | null;
  fromIncidentTitle: string | null;
  rootCause: string | null;
  fix: string[] | null;
  note: string;
};

type Response = {
  incidentId: string;
  fingerprint: string;
  totalOccurrences: number;
  openOccurrences: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  repeats: Repeat[];
  sharedRootCause: SharedRootCause;
};

const EVIDENCE_BADGE: Record<SharedRootCause['evidence'], { label: string; className: string }> = {
  shared_alert_signature: { label: 'Same alert signature', className: 'bg-rose-500/15 text-rose-300' },
  same_failure_family: { label: 'Same failure family (hypothesis)', className: 'bg-amber-500/15 text-amber-300' },
  none: { label: 'No repeat yet', className: 'bg-slate-500/15 text-slate-400' },
};

/**
 * V7 — incident correlation & dedup.
 *
 * "Same alert signature" means the same content fingerprint: the alert re-fired with different
 * hosts/numbers/timestamps in the title. "Same failure family" is a classifier hypothesis. The
 * panel shows which one it is, always — a responder must never confuse dedup evidence with a guess.
 */
export function CorrelationPanel({ incidentId }: { incidentId: string }) {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/incidents/${incidentId}/correlation`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load correlation data.');
        setData((await response.json()).data as Response);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load correlation data.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [incidentId]);

  const badge = data ? EVIDENCE_BADGE[data.sharedRootCause.evidence] : null;

  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <header className="mb-3">
        <h2 className="text-sm font-medium text-white">Repeat alerts &amp; shared root cause</h2>
        <p className="text-xs text-slate-500">
          Incidents grouped by alert fingerprint (title noise, hosts and timestamps ignored), with the strongest
          root-cause evidence ARCH can find — labelled as fact or hypothesis.
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-400">Checking for repeats…</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error && data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded bg-white/[0.07] px-2 py-0.5 font-mono text-[10px] text-slate-400">
              fp {data.fingerprint.slice(0, 10)}
            </span>
            <span>
              Fired {data.totalOccurrences} time{data.totalOccurrences === 1 ? '' : 's'}
              {data.openOccurrences > 0 ? ` · ${data.openOccurrences} still open` : ''}
              {data.firstSeenAt ? ` · first seen ${new Date(data.firstSeenAt).toLocaleString('en-GB')}` : ''}
            </span>
          </div>

          {data.totalOccurrences > 1 ? (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Same alert signature</h3>
              <ul className="mt-2 space-y-2">
                {data.repeats.map((repeat) => (
                  <li key={repeat.id} className="rounded-lg border border-white/[0.07] bg-abyss-950/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      {repeat.current ? (
                        <span className="text-sm text-slate-300">{repeat.title} <span className="text-xs text-slate-500">(this incident)</span></span>
                      ) : (
                        <Link href={`/dashboard/incidents/${repeat.id}`} className="text-sm text-slate-100 hover:text-white">
                          {repeat.title}
                        </Link>
                      )}
                      <span className="shrink-0 text-xs text-slate-500">{repeat.status.toLowerCase()}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {repeat.severity} · {repeat.serviceName ?? 'no service'} · {repeat.source.toLowerCase()} ·{' '}
                      {new Date(repeat.startedAt).toLocaleString('en-GB')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-400">First time this alert signature has fired. Repeats will group here automatically.</p>
          )}

          {badge ? (
            <div className="rounded-lg border border-white/[0.07] bg-abyss-950/50 p-3">
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
                {data.sharedRootCause.categoryLabel ? (
                  <span className="text-xs text-slate-500">{data.sharedRootCause.categoryLabel}</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-slate-400">{data.sharedRootCause.note}</p>
              {data.sharedRootCause.rootCause ? (
                <p className="mt-2 text-xs text-slate-300">
                  Likely root cause: {data.sharedRootCause.rootCause}
                  {data.sharedRootCause.fromIncidentId ? (
                    <>
                      {' '}
                      <Link href={`/dashboard/incidents/${data.sharedRootCause.fromIncidentId}`} className="text-sky-300 hover:text-sky-200">
                        (from {data.sharedRootCause.fromIncidentTitle ?? 'a past incident'})
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              {data.sharedRootCause.fix?.length ? (
                <p className="mt-1 text-xs text-emerald-300/90">What worked before: {data.sharedRootCause.fix.join(' · ')}</p>
              ) : null}
            </div>
          ) : null}

          <p className="text-xs text-slate-600">
            Grouping is advisory — nothing here merges, closes or re-opens incidents by itself.
          </p>
        </div>
      ) : null}
    </section>
  );
}
