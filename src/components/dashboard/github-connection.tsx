'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui';

type GithubConfig = {
  mode: 'real' | 'mock';
  tokenConfigured: boolean;
  tokenHint: string | null;
  tokenKind?: string;
  baseUrl: string;
  timeoutMs: number;
  openAsDraft: boolean;
  maxFiles: number;
  reason: string;
};

type TokenCheck = {
  ok: boolean;
  mode: 'real' | 'mock';
  actor: string | null;
  actorType: string | null;
  scopes: string[];
  rateLimit: { limit: number; used: number; remaining: number; resetsAt: string | null };
  message: string;
};

type RepoCheck = {
  ok: true;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  archived: boolean;
  canPush: boolean;
  canPull: boolean;
  permissionsKnown: boolean;
  baseSha: string;
  baseRef: string;
  headSha: string;
  commitMessage: string | null;
  message: string;
};

type CheckResponse = {
  config: GithubConfig;
  check: TokenCheck | null;
  repository?: RepoCheck | null;
  note?: string;
  error?: { code: string; message: string };
};

type State =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'done'; data: CheckResponse }
  | { phase: 'failed'; message: string };

/**
 * V4 — GitHub connection panel (M1/M4).
 *
 * Renders what `GET /api/github` decided at page render, and lets an OWNER/ADMIN run the live probe:
 * "is the token alive, and can it push to this repo/commit?" A bad GITHUB_TOKEN used to be discovered
 * only at Approve time, after a human had read the diff.
 */
export function GithubConnectionPanel({ config: initial }: { config: GithubConfig }) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [commitSha, setCommitSha] = useState('');

  async function runCheck(withRepo: boolean) {
    setState({ phase: 'checking' });
    try {
      const response = await fetch('/api/github', {
        method: withRepo ? 'POST' : 'GET',
        headers: withRepo ? { 'content-type': 'application/json' } : undefined,
        body: withRepo
          ? JSON.stringify({
              ...(owner.trim() ? { owner: owner.trim() } : {}),
              ...(repo.trim() ? { repo: repo.trim() } : {}),
              ...(commitSha.trim() ? { commitSha: commitSha.trim() } : {}),
            })
          : undefined,
      });
      const payload = (await response.json()) as CheckResponse & { data?: CheckResponse };
      const data = payload.data ?? payload;
      if (!response.ok) {
        setState({ phase: 'failed', message: data.error?.message ?? `GitHub check failed (HTTP ${response.status}).` });
        return;
      }
      setState({ phase: 'done', data });
    } catch (error) {
      setState({ phase: 'failed', message: error instanceof Error ? error.message : 'GitHub check failed.' });
    }
  }

  const shown = state.phase === 'done' ? state.data.config : initial;
  const check = state.phase === 'done' ? state.data.check : null;
  const repository = state.phase === 'done' ? (state.data.repository ?? null) : null;
  const tone = shown.mode === 'real' ? (check && !check.ok ? 'danger' : 'success') : 'neutral';

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-white">GitHub connection</h3>
        <Badge tone={tone}>{shown.mode === 'real' ? 'real PRs' : 'offline (mock)'}</Badge>
        {shown.tokenConfigured ? <span className="arch-mono text-xs text-slate-500">{shown.tokenHint}</span> : <span className="text-xs text-slate-500">no token</span>}
        {shown.tokenKind && shown.tokenKind !== 'missing' ? <span className="text-xs uppercase tracking-wide text-slate-500">{shown.tokenKind}</span> : null}
      </div>

      <p className="text-xs text-slate-400">{shown.reason}</p>
      <p className="text-xs text-slate-500">
        API: <span className="arch-mono">{shown.baseUrl}</span> · timeout {shown.timeoutMs}ms · drafts {shown.openAsDraft ? 'on' : 'off'} · max {shown.maxFiles} files/PR
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <input
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          placeholder="owner"
          className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
        />
        <input
          value={repo}
          onChange={(event) => setRepo(event.target.value)}
          placeholder="repo"
          className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
        />
        <input
          value={commitSha}
          onChange={(event) => setCommitSha(event.target.value)}
          placeholder="commit SHA (optional)"
          className="w-44 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 arch-mono"
        />
        <button
          type="button"
          onClick={() => void runCheck(false)}
          disabled={state.phase === 'checking'}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
        >
          Test token
        </button>
        <button
          type="button"
          onClick={() => void runCheck(true)}
          disabled={state.phase === 'checking'}
          className="rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          Check repo access
        </button>
      </div>

      {state.phase === 'checking' ? <p className="text-xs text-slate-400">Checking GitHub…</p> : null}
      {state.phase === 'failed' ? <p className="text-xs text-rose-300">{state.message}</p> : null}

      {check ? (
        <div className="space-y-1 rounded border border-slate-800 bg-slate-900/60 p-3">
          <p className={`text-xs ${check.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{check.message}</p>
          {check.scopes.length > 0 ? <p className="text-xs text-slate-500">scopes: <span className="arch-mono">{check.scopes.join(', ')}</span></p> : null}
        </div>
      ) : null}

      {repository ? (
        <div className="space-y-1 rounded border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-xs text-slate-300">{repository.message}</p>
          <p className="text-xs text-slate-500">
            default branch <span className="arch-mono">{repository.defaultBranch}</span> · head{' '}
            <span className="arch-mono">{repository.headSha.slice(0, 12)}</span> · {repository.isPrivate ? 'private' : 'public'}
            {repository.archived ? ' · archived' : ''} · push {repository.permissionsKnown ? (repository.canPush ? 'allowed' : 'DENIED') : 'unknown'}
          </p>
          {repository.commitMessage ? <p className="text-xs text-slate-500">pinned commit: {repository.commitMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
