'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/form';
import { connectRepoAction, pinCommitAction, deactivateRepoAction, type ActionResult } from '@/app/dashboard/actions';

function Outcome({ state }: { state: ActionResult | undefined }) {
  if (!state) return null;
  if (state.ok) return state.message ? <p className="text-xs text-emerald-300">{state.message}</p> : null;
  return <p className="text-xs text-rose-300">{state.error}</p>;
}

export type RepoConnectionView = {
  id: string;
  fullName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  pinnedCommitSha: string | null;
  isActive: boolean;
  createdAgo: string;
};

export function ConnectRepoForm() {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(connectRepoAction, undefined);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
      <h3 className="text-sm font-medium text-white">Connect GitHub repo</h3>
      <p className="text-xs text-slate-400">M1: Repo link hua, RBAC enforced. Only OWNER/ADMIN can connect.</p>
      <div className="grid grid-cols-2 gap-2">
        <input name="owner" placeholder="Owner (e.g., acme)" className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-sm text-slate-200" required />
        <input name="repo" placeholder="Repo (e.g., api)" className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-sm text-slate-200" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="defaultBranch" placeholder="Default branch (main)" className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-sm text-slate-200" />
        <input name="pinnedCommitSha" placeholder="Pinned commit SHA (optional)" className="rounded border border-white/10 bg-abyss-900 px-2 py-1 text-xs text-slate-200 arch-mono" />
      </div>
      <SubmitButton pendingLabel="Connecting…">Connect repo</SubmitButton>
      <Outcome state={state} />
    </form>
  );
}

export function RepoConnectionItem({ connection }: { connection: RepoConnectionView }) {
  const [pinState, pinAction] = useActionState<ActionResult | undefined, FormData>(pinCommitAction, undefined);
  const [deactState, deactAction] = useActionState<ActionResult | undefined, FormData>(deactivateRepoAction, undefined);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-white/[0.07] bg-abyss-950/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">{connection.fullName}</p>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${connection.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>{connection.isActive ? 'active' : 'inactive'}</span>
      </div>
      <p className="text-xs text-slate-500">
        Owner: {connection.owner} · Repo: {connection.repo} · Branch: {connection.defaultBranch} · Pinned: <span className="arch-mono">{connection.pinnedCommitSha ?? 'none'}</span> · {connection.createdAgo}
      </p>

      <form action={pinAction} className="flex gap-2">
        <input type="hidden" name="repoConnectionId" value={connection.id} />
        <input name="commitSha" placeholder="New commit SHA to pin" className="flex-1 rounded border border-white/10 bg-abyss-900 px-2 py-1 text-xs text-slate-200 arch-mono" required />
        <SubmitButton variant="secondary" pendingLabel="Pinning…">
          Pin commit
        </SubmitButton>
      </form>
      <Outcome state={pinState} />

      {connection.isActive && (
        <form action={deactAction}>
          <input type="hidden" name="repoConnectionId" value={connection.id} />
          <SubmitButton variant="secondary" pendingLabel="Deactivating…">
            Deactivate
          </SubmitButton>
        </form>
      )}
      <Outcome state={deactState} />
    </li>
  );
}

export function RepoConnectionsList({ connections }: { connections: RepoConnectionView[] }) {
  if (connections.length === 0) return <p className="text-sm text-slate-400">No repos connected yet.</p>;
  return (
    <ul className="space-y-2">
      {connections.map((c) => (
        <RepoConnectionItem key={c.id} connection={c} />
      ))}
    </ul>
  );
}
