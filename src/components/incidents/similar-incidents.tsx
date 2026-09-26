'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type SimilarIncident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  serviceName: string | null;
  startedAt: string;
  resolvedAt: string | null;
  similarity: number;
  fix: string[] | null;
  rootCause: string | null;
  source: string;
};

type Runbook = { sourceName: string; heading: string | null; text: string; url: string | null; similarity: number };

type Response = { query: string; incidents: SimilarIncident[]; runbooks: Runbook[]; seenBefore: number };

/**
 * V6 — "have we seen this before?"
 *
 * Loaded from the API rather than rendered on the server so the panel stays live while a responder
 * types the incident title, and so it never blocks the incident page itself.
 */
export function SimilarIncidentsPanel({ incidentId, initialTitle }: { incidentId: string; initialTitle: string }) {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/incidents/${incidentId}/similar`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load similar incidents.');
        setData((await response.json()).data as Response);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load similar incidents.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [incidentId]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <header className="mb-3">
        <h2 className="text-sm font-medium text-white">Have we seen this before?</h2>
        <p className="text-xs text-slate-500">
          Similar incidents from your own history, plus runbook passages — retrieved by ARCH's embeddings on this server.
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-400">Looking through your incident history…</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error && data ? (
        <div className="space-y-4">
          {data.seenBefore > 0 ? (
            <p className="text-xs text-amber-200">
              This failure has come up {data.seenBefore} time{data.seenBefore === 1 ? '' : 's'} before. Consider
              linking them or writing the runbook entry that would have answered this faster.
            </p>
          ) : null}

          {data.incidents.length === 0 ? (
            <p className="text-sm text-slate-400">No similar incidents yet. As incidents are resolved, this fills in.</p>
          ) : (
            <ul className="space-y-2">
              {data.incidents.map((incident) => (
                <li key={incident.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/incidents/${incident.id}`} className="text-sm text-slate-100 hover:text-white">
                      {incident.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">{Math.round(incident.similarity * 100)}% match</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {incident.severity} · {incident.status.toLowerCase()} ·{' '}
                    {incident.serviceName ?? 'no service'} · {new Date(incident.startedAt).toLocaleString('en-GB')}
                  </p>
                  {incident.rootCause ? <p className="mt-1 text-xs text-slate-400">Root cause: {incident.rootCause}</p> : null}
                  {incident.fix?.length ? (
                    <p className="mt-1 text-xs text-emerald-300/90">What fixed it: {incident.fix.join(' · ')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {data.runbooks.length > 0 ? (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Runbooks</h3>
              <ul className="mt-2 space-y-2">
                {data.runbooks.map((runbook) => (
                  <li key={`${runbook.sourceName}-${runbook.similarity}`} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-sm text-slate-200">
                      {runbook.sourceName}
                      {runbook.heading ? ` — ${runbook.heading}` : ''}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-400">{runbook.text}</p>
                    {runbook.url ? (
                      <a href={runbook.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-sky-300 hover:text-sky-200">
                        Source
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-slate-600">
            Nothing here is applied automatically — it is context for the responder, same as every other ARCH draft.
          </p>
        </div>
      ) : null}

      {!loading && !error && !data ? <p className="text-sm text-slate-400">Searching “{initialTitle}”…</p> : null}
    </section>
  );
}
