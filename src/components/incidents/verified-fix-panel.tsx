'use client';

import { useActionState, useState } from 'react';
import { SubmitButton, Textarea } from '@/components/ui/form';
import {
  approveVerificationAction,
  generateVerifiedFixAction,
  verifySuggestionAction,
  type ActionResult,
} from '@/app/dashboard/actions';

export type VerificationView = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'TIMEOUT' | 'UNSAFE' | 'ERROR';
  patch: string;
  commitSha: string | null;
  testCommand: string | null;
  testOutput: string | null;
  evidence: {
    sandboxId: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    commitSha: string | null;
    patchHash: string;
    patchPreview: string;
    safetyChecks: { passed: boolean; failures: { rule: string; message: string; line?: number }[] };
    testCommand: string | null;
    testOutput: string;
    testResults: { passed: boolean; exitCode: number | null; timedOut: boolean };
    logs: string[];
    isolation: { noProdCredentials: boolean; tempContainer: boolean; timeoutEnforced: boolean; sandboxEscapePrevented: boolean };
  } | null;
  durationMs: number | null;
  createdAt: string;
  createdAgo: string;
  repoConnection: { id: string; fullName: string; pinnedCommitSha: string | null } | null;
  pullRequest: { id: string; externalUrl: string | null; branch: string; status: string } | null;
  suggestion: { id: string; type: string };
};

export type RepoConnectionView = {
  id: string;
  fullName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  pinnedCommitSha: string | null;
  isActive: boolean;
};

function Outcome({ state }: { state: ActionResult | undefined }) {
  if (!state) return null;
  if (state.ok) {
    return state.message ? <p className="text-xs text-emerald-300">{state.message}</p> : null;
  }
  return <p className="text-xs text-rose-300">{state.error}</p>;
}

function StatusBadge({ status }: { status: VerificationView['status'] }) {
  const colors: Record<VerificationView['status'], string> = {
    PENDING: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
    RUNNING: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
    PASSED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    FAILED: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    TIMEOUT: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    UNSAFE: 'bg-red-500/15 text-red-300 ring-red-500/30',
    ERROR: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${colors[status]}`}>
      {status}
    </span>
  );
}

function EvidenceBundle({ evidence }: { evidence: VerificationView['evidence'] }) {
  if (!evidence) return <p className="text-xs text-slate-500">No evidence yet.</p>;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Sandbox:</span> <span className="arch-mono text-slate-300">{evidence.sandboxId}</span>
        </div>
        <div>
          <span className="text-slate-500">Commit:</span> <span className="arch-mono text-slate-300">{evidence.commitSha ?? 'none'}</span>
        </div>
        <div>
          <span className="text-slate-500">Patch hash:</span> <span className="arch-mono text-slate-300">{evidence.patchHash}</span>
        </div>
        <div>
          <span className="text-slate-500">Duration:</span> <span className="text-slate-300">{evidence.durationMs}ms</span>
        </div>
      </div>
      <div className="rounded bg-slate-950/60 p-2">
        <p className="text-xs font-medium text-slate-400">Safety checks: {evidence.safetyChecks.passed ? 'PASSED' : 'FAILED'}</p>
        {evidence.safetyChecks.failures.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-xs text-rose-300">
            {evidence.safetyChecks.failures.map((f, i) => (
              <li key={i}>
                [{f.rule}] {f.message} {f.line ? `(line ${f.line})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded bg-slate-950/60 p-2">
        <p className="text-xs font-medium text-slate-400">Isolation guarantees</p>
        <ul className="mt-1 text-xs text-slate-300">
          <li>✓ No prod credentials: {evidence.isolation.noProdCredentials ? 'yes' : 'no'}</li>
          <li>✓ Temp container: {evidence.isolation.tempContainer ? 'yes' : 'no'}</li>
          <li>✓ Timeout enforced: {evidence.isolation.timeoutEnforced ? 'yes' : 'no'}</li>
          <li>✓ Sandbox escape prevented: {evidence.isolation.sandboxEscapePrevented ? 'yes' : 'no'}</li>
        </ul>
      </div>
      <details className="rounded bg-slate-950/60 p-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-400">Logs ({evidence.logs.length})</summary>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{evidence.logs.join('\n')}</pre>
      </details>
    </div>
  );
}

function VerificationItem({ verification, canApprove }: { verification: VerificationView; canApprove: boolean }) {
  const [approveState, approveAction] = useActionState<ActionResult | undefined, FormData>(approveVerificationAction, undefined);
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <li className="space-y-3 border-b border-slate-800/70 px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">Verification {verification.id.slice(0, 8)}</p>
        <StatusBadge status={verification.status} />
      </div>
      <p className="text-xs text-slate-500">
        {verification.repoConnection ? `${verification.repoConnection.fullName} @ ${verification.commitSha ?? verification.repoConnection.pinnedCommitSha ?? 'main'}` : 'No repo linked'} · {verification.createdAgo} · {verification.testCommand ?? 'no test command'}
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Diff</p>
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">{verification.patch.slice(0, 4000)}</pre>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Test results</p>
        <pre className="max-h-48 overflow-auto rounded-lg bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">
          {verification.testOutput ?? verification.evidence?.testOutput ?? 'No output yet'}
        </pre>
      </div>

      <div className="space-y-2">
        <button onClick={() => setShowEvidence(!showEvidence)} className="text-xs text-indigo-400 hover:text-indigo-300">
          {showEvidence ? 'Hide evidence bundle' : 'Show evidence bundle'}
        </button>
        {showEvidence && <EvidenceBundle evidence={verification.evidence} />}
      </div>

      {verification.pullRequest ? (
        <p className="text-xs text-emerald-300">
          {verification.pullRequest.externalUrl ? (
            <>
              PR created:{' '}
              <a href={verification.pullRequest.externalUrl} className="underline" target="_blank" rel="noreferrer">
                {verification.pullRequest.branch}
              </a>{' '}
              · {verification.pullRequest.status}
            </>
          ) : (
            <span className="text-amber-300">
              Recorded offline — no GitHub PR (mock mode) · branch {verification.pullRequest.branch} · {verification.pullRequest.status}
            </span>
          )}
        </p>
      ) : verification.status === 'PASSED' && canApprove ? (
        <form action={approveAction} className="space-y-2">
          <input type="hidden" name="verificationId" value={verification.id} />
          <SubmitButton pendingLabel="Creating PR…">Approve & create PR</SubmitButton>
          <Outcome state={approveState} />
          <p className="text-xs text-slate-500">Human approval required — PR banta hai only after you approve. Audit logged.</p>
        </form>
      ) : verification.status === 'PASSED' ? (
        <p className="text-xs text-slate-400">Verified fix passed — waiting for human approval to create PR.</p>
      ) : verification.status === 'UNSAFE' ? (
        <p className="text-xs text-rose-300">Unsafe fix blocked — review patch for dangerous patterns.</p>
      ) : verification.status === 'TIMEOUT' ? (
        <p className="text-xs text-amber-200">Test timed out — patch may have infinite loop or heavy operation.</p>
      ) : null}
    </li>
  );
}

function GenerateVerifiedFixForm({ incidentId, repoConnections, canGenerate }: { incidentId: string; repoConnections: RepoConnectionView[]; canGenerate: boolean }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(generateVerifiedFixAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <input type="hidden" name="incidentId" value={incidentId} />
      <label className="text-xs font-medium text-slate-400">Generate verified fix (patch → sandbox test → evidence)</label>
      <Textarea name="attachment" rows={3} placeholder="Paste stack trace or code snippet (optional)" className="arch-mono text-xs" disabled={!canGenerate} />
      {repoConnections.length > 0 && (
        <select name="repoConnectionId" className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200" disabled={!canGenerate}>
          <option value="">Auto (first active repo)</option>
          {repoConnections.map((rc) => (
            <option key={rc.id} value={rc.id}>
              {rc.fullName} @ {rc.pinnedCommitSha ?? rc.defaultBranch}
            </option>
          ))}
        </select>
      )}
      <input name="testCommand" placeholder="Test command (default: npm test)" className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200" disabled={!canGenerate} />
      <SubmitButton variant="secondary" pendingLabel="Generating & testing…">
        Generate verified fix
      </SubmitButton>
      <Outcome state={state} />
      <p className="text-xs text-slate-500">Isolated sandbox: no prod credentials, temporary container, timeout enforced. Evidence bundle with proof.</p>
    </form>
  );
}

export function VerifiedFixPanel({
  incidentId,
  canGenerate,
  canApprove,
  repoConnections,
  verifications,
}: {
  incidentId: string;
  canGenerate: boolean;
  canApprove: boolean;
  repoConnections: RepoConnectionView[];
  verifications: VerificationView[];
}) {
  const passed = verifications.filter((v) => v.status === 'PASSED').length;
  const total = verifications.length;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-slate-900/60">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-100">
            Verified Fix Loop
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              V4
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">Patch tested against your code, with proof. Fix tested in isolated sandbox → evidence → human approve → PR.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="arch-mono text-xs text-slate-500">
            {total} verification{total === 1 ? '' : 's'} · {passed} passed
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-500/30">no prod credentials</span>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {repoConnections.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            No GitHub repo connected. Connect a repo in <span className="arch-mono">/dashboard/repos</span> to enable commit pinning and PR creation.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Connected repos: {repoConnections.map((rc) => `${rc.fullName}@${rc.pinnedCommitSha ?? rc.defaultBranch}`).join(', ')}
          </p>
        )}
        {canGenerate ? <GenerateVerifiedFixForm incidentId={incidentId} repoConnections={repoConnections} canGenerate={canGenerate} /> : <p className="text-sm text-slate-400">Your role cannot generate verified fixes.</p>}
      </div>

      <div className="border-t border-slate-800">
        <p className="px-5 pt-4 text-xs font-medium uppercase tracking-wide text-slate-500">Verifications ({total}) — diff + test results + evidence bundle</p>
        {verifications.length === 0 ? (
          <p className="px-5 pb-4 pt-2 text-sm text-slate-400">No verifications yet. Generate a verified fix above.</p>
        ) : (
          <ul>
            {verifications.map((v) => (
              <VerificationItem key={v.id} verification={v} canApprove={canApprove} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
