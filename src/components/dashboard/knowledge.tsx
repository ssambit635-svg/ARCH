'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/form';
import {
  deleteKnowledgeAction,
  fetchKnowledgeAction,
  ingestKnowledgeAction,
  type ActionResult,
} from '@/app/dashboard/actions';

function Outcome({ state }: { state: ActionResult | undefined }) {
  if (!state) return null;
  if (state.ok) return state.message ? <p className="text-xs text-emerald-300">{state.message}</p> : null;
  return <p className="text-xs text-rose-300">{state.error}</p>;
}

export type KnowledgeSourceView = {
  id: string;
  name: string;
  kind: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  sourceUrl: string | null;
  chunkCount: number;
  tokenCount: number;
  error: string | null;
  createdAt: string;
};

const KIND_LABEL: Record<string, string> = {
  RUNBOOK: 'Runbook',
  DOC: 'Document',
  NOTE: 'Note',
  URL: 'Fetched',
  INCIDENT_EXPORT: 'Incident export',
};

/** Paste a runbook, doc or note. It is chunked and embedded on this server, then retrievable. */
export function AddKnowledgeForm({ canManage }: { canManage: boolean }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(ingestKnowledgeAction, undefined);
  if (!canManage) {
    return (
      <p className="text-sm text-slate-400">
        Only OWNER, ADMIN and RESPONDER can add knowledge. Everyone can read what is indexed.
      </p>
    );
  }
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
      <h3 className="text-sm font-medium text-white">Index a document</h3>
      <p className="text-xs text-slate-400">
        Paste a runbook, doc or note. ARCH splits it into retrievable passages and embeds them on this
        server — nothing is sent anywhere. ARCH V1.1 drafts then cite it by name.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          name="name"
          placeholder="Name (e.g. Database pool runbook)"
          className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-sm text-slate-200"
          required
        />
        <select name="kind" defaultValue="RUNBOOK" className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-sm text-slate-200">
          <option value="RUNBOOK">Runbook</option>
          <option value="DOC">Document</option>
          <option value="NOTE">Note</option>
          <option value="INCIDENT_EXPORT">Incident export</option>
        </select>
      </div>
      <textarea
        name="text"
        rows={7}
        placeholder={'# Runbook: database pool exhaustion\n\nSymptoms: …\n\nSteps:\n1. …'}
        className="w-full rounded border border-white/10 bg-abyss-900 px-2 py-1 font-mono text-xs text-slate-200"
        required
      />
      <SubmitButton pendingLabel="Indexing…">Index document</SubmitButton>
      <Outcome state={state} />
    </form>
  );
}

/** Fetch a public document by URL. Guarded: private addresses are refused before any request. */
export function FetchKnowledgeForm({ enabled, canManage }: { enabled: boolean; canManage: boolean }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(fetchKnowledgeAction, undefined);
  if (!canManage) return null;
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
      <h3 className="text-sm font-medium text-white">Fetch a public document</h3>
      <p className="text-xs text-slate-400">
        {enabled
          ? 'The URL is checked against private and internal addresses before anything is requested, the response is size- and time-capped, and only text is accepted.'
          : 'Fetching is disabled while ARCH_OFFLINE_ONLY=true — paste the document instead.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          name="url"
          type="url"
          placeholder="https://example.com/runbook.md"
          className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-sm text-slate-200"
          disabled={!enabled}
          required
        />
        <input
          name="name"
          placeholder="Name (optional)"
          className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-sm text-slate-200"
          disabled={!enabled}
        />
      </div>
      {enabled ? (
        <>
          <SubmitButton pendingLabel="Fetching…">Fetch and index</SubmitButton>
          <Outcome state={state} />
        </>
      ) : null}
    </form>
  );
}

export function KnowledgeSourceList({ sources, canDelete }: { sources: KnowledgeSourceView[]; canDelete: boolean }) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Nothing indexed yet. Add a runbook and the next ARCH V1.1 draft will cite it instead of guessing.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-white/[0.05]">
      {sources.map((source) => (
        <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{source.name}</p>
            <p className="text-xs text-slate-500">
              {KIND_LABEL[source.kind] ?? source.kind} · {source.chunkCount} chunk{source.chunkCount === 1 ? '' : 's'} ·{' '}
              {source.tokenCount.toLocaleString('en-US')} words · {new Date(source.createdAt).toLocaleString('en-GB')}
              {source.sourceUrl ? ` · ${source.sourceUrl}` : ''}
            </p>
            {source.status === 'FAILED' && source.error ? <p className="text-xs text-rose-300">{source.error}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                source.status === 'READY'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : source.status === 'FAILED'
                    ? 'bg-rose-500/15 text-rose-300'
                    : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {source.status === 'READY' ? 'indexed' : source.status === 'FAILED' ? 'failed' : 'pending'}
            </span>
            {canDelete ? (
              <form action={deleteKnowledgeAction}>
                <input type="hidden" name="sourceId" value={source.id} />
                <SubmitButton pendingLabel="Removing…">Remove</SubmitButton>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
