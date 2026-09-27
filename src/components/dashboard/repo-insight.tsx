'use client';

import { useActionState } from 'react';
import { Select, SubmitButton, Textarea } from '@/components/ui/form';
import { askRepoInsightAction, type RepoInsightState } from '@/app/dashboard/actions';

const SEVERITY: Record<string, string> = {
  error: 'bg-rose-500/15 text-rose-300',
  warning: 'bg-amber-500/15 text-amber-200',
  info: 'bg-slate-800 text-slate-300',
};

export function RepoInsight({
  repos,
}: {
  repos: { id: string; fullName: string }[];
}) {
  const [state, formAction] = useActionState<RepoInsightState | undefined, FormData>(askRepoInsightAction, undefined);

  if (repos.length === 0) {
    return <p className="text-sm text-slate-400">Connect a repository first. Insight only reads; it never opens a PR.</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="insight-repo" className="block text-xs font-medium text-slate-400">
            Connected repo (read-only)
          </label>
          <Select id="insight-repo" name="repoConnectionId" defaultValue={repos[0]!.id}>
            {repos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.fullName}
              </option>
            ))}
          </Select>
        </div>
        <label htmlFor="insight-q" className="sr-only">
          Question
        </label>
        <Textarea
          id="insight-q"
          name="question"
          rows={6}
          maxLength={2000}
          placeholder="e.g. mein apne repo ko private kaise banaun? / kahan secrets hain?"
        />
        <SubmitButton pendingLabel="Reading repo…">Ask (never writes)</SubmitButton>
      </form>
      <div>
        {!state ? (
          <p className="text-sm text-slate-500">
            ARCH reads a small file subset + GitHub how-tos. It will not add features or push commits.
          </p>
        ) : !state.ok ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
            {state.error}
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium text-white">
              {state.result.summary}{' '}
              <span className="arch-mono text-xs text-slate-500">
                {state.result.fullName} · {state.result.private ? 'private' : 'public'} · touchedRepo={String(state.result.touchedRepo)}
              </span>
            </p>
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">{state.result.explanation}</pre>
            {state.result.findings.length ? (
              <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                {state.result.findings.map((finding, index) => (
                  <li key={`${finding.path}-${index}`} className="px-3 py-2 text-sm">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${SEVERITY[finding.severity]}`}>{finding.severity}</span>
                    <span className="arch-mono text-xs text-slate-500">{finding.path}</span> {finding.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
