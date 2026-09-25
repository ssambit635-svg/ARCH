'use client';

import { useActionState } from 'react';
import { SubmitButton, Textarea } from '@/components/ui/form';
import {
  approveCopilotDraftAction,
  dismissCopilotDraftAction,
  generateCopilotDraftAction,
  type ActionResult,
} from '@/app/dashboard/actions';

/**
 * ARCH Copilot panel (AGENTS-V2.md M2/M3) — lives in the incident workspace.
 *
 * Every piece of AI output is shown as a DRAFT with an explicit "needs review" marker. Responders
 * can edit text drafts, then approve (posts to the timeline / applies triage) or dismiss. Viewers
 * see drafts read-only. The server re-checks every permission; this component only hides buttons.
 */

export type CopilotSuggestionView = {
  id: string;
  type: 'SUMMARY' | 'TRIAGE' | 'STATUS_UPDATE' | 'POSTMORTEM';
  status: 'PENDING' | 'APPROVED' | 'DISMISSED';
  output: unknown;
  /** Exact text an approval would post (null for triage). */
  draftText: string | null;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  createdBy: string;
  createdAgo: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAgo: string | null;
  triage?: { currentSeverity: string; suggestedAssignee: string | null; currentAssignee: string | null };
};

type Config = { enabled: boolean; provider: string; model: string; reason?: string };

const TYPE_LABELS: Record<CopilotSuggestionView['type'], string> = {
  SUMMARY: 'Summary',
  TRIAGE: 'Triage suggestion',
  STATUS_UPDATE: 'Status-update draft',
  POSTMORTEM: 'Postmortem draft',
};

const APPROVE_LABELS: Record<CopilotSuggestionView['type'], string> = {
  SUMMARY: 'Approve & post to timeline',
  TRIAGE: 'Approve & apply',
  STATUS_UPDATE: 'Approve & post update',
  POSTMORTEM: 'Approve & post to timeline',
};

const GENERATORS: { type: CopilotSuggestionView['type']; label: string; hint: string }[] = [
  { type: 'SUMMARY', label: 'Summarize', hint: '≤ 5 bullets for whoever joins next' },
  { type: 'TRIAGE', label: 'Suggest triage', hint: 'Severity + assignee' },
  { type: 'STATUS_UPDATE', label: 'Draft status update', hint: 'Customer-safe wording' },
  { type: 'POSTMORTEM', label: 'Draft postmortem', hint: 'Timeline · Impact · Root cause · Actions' },
];

function Outcome({ state }: { state: ActionResult | undefined }) {
  if (!state) return null;
  if (state.ok) {
    return state.message ? (
      <p className="text-xs text-emerald-300" role="status">
        {state.message}
      </p>
    ) : null;
  }
  return (
    <p className="text-xs text-rose-300" role="alert">
      {state.error}
    </p>
  );
}

function GenerateButton({ incidentId, type, label, hint, disabled }: { incidentId: string; type: string; label: string; hint: string; disabled: boolean }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(generateCopilotDraftAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <input type="hidden" name="incidentId" value={incidentId} />
      <input type="hidden" name="type" value={type} />
      <fieldset disabled={disabled} className="contents">
        <SubmitButton variant="secondary" pendingLabel="Drafting…">
          {label}
        </SubmitButton>
      </fieldset>
      <p className="text-xs text-slate-500">{hint}</p>
      <Outcome state={state} />
    </form>
  );
}

function TriageView({ suggestion }: { suggestion: CopilotSuggestionView }) {
  const output = suggestion.output as { severity: string; assigneeId?: string; rationale: string };
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      <dt className="text-slate-500">Severity</dt>
      <dd className="text-slate-200">
        {suggestion.triage?.currentSeverity === output.severity ? (
          <span>{output.severity} (unchanged)</span>
        ) : (
          <span>
            <span className="text-slate-500 line-through">{suggestion.triage?.currentSeverity}</span> → <span className="font-semibold">{output.severity}</span>
          </span>
        )}
      </dd>
      <dt className="text-slate-500">Assignee</dt>
      <dd className="text-slate-200">
        {suggestion.triage?.suggestedAssignee ? (
          suggestion.triage.suggestedAssignee === suggestion.triage.currentAssignee ? (
            <span>{suggestion.triage.suggestedAssignee} (unchanged)</span>
          ) : (
            <span>
              {suggestion.triage.currentAssignee ? <span className="text-slate-500 line-through">{suggestion.triage.currentAssignee}</span> : 'nobody'} →{' '}
              <span className="font-semibold">{suggestion.triage.suggestedAssignee}</span>
            </span>
          )
        ) : (
          <span className="text-slate-500">no suggestion</span>
        )}
      </dd>
      <dt className="text-slate-500">Why</dt>
      <dd className="text-slate-300">{output.rationale}</dd>
    </dl>
  );
}

function DraftMeta({ suggestion }: { suggestion: CopilotSuggestionView }) {
  return (
    <p className="text-xs text-slate-500">
      requested by {suggestion.createdBy} · <time dateTime={suggestion.createdAt}>{suggestion.createdAgo}</time> ·{' '}
      <span className="arch-mono">{suggestion.model}</span> · {suggestion.promptTokens + suggestion.completionTokens} tokens
    </p>
  );
}

function PendingDraft({ suggestion, canReview }: { suggestion: CopilotSuggestionView; canReview: boolean }) {
  const [approveState, approveAction] = useActionState<ActionResult | undefined, FormData>(approveCopilotDraftAction, undefined);
  const [dismissState, dismissAction] = useActionState<ActionResult | undefined, FormData>(dismissCopilotDraftAction, undefined);
  const textareaId = `copilot-text-${suggestion.id}`;
  const rows = suggestion.type === 'POSTMORTEM' ? 16 : suggestion.type === 'SUMMARY' ? 7 : 5;

  return (
    <li className="space-y-3 border-b border-slate-800/70 px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">{TYPE_LABELS[suggestion.type]}</p>
        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-inset ring-amber-500/30">
          AI draft · needs review
        </span>
      </div>
      <DraftMeta suggestion={suggestion} />

      <form action={approveAction} className="space-y-3">
        <input type="hidden" name="suggestionId" value={suggestion.id} />
        {suggestion.type === 'TRIAGE' ? (
          <TriageView suggestion={suggestion} />
        ) : canReview ? (
          <div className="space-y-1.5">
            <label htmlFor={textareaId} className="block text-xs font-medium text-slate-400">
              {suggestion.type === 'STATUS_UPDATE' ? 'Customer-facing text — edit before posting' : 'Edit before posting'}
            </label>
            <Textarea id={textareaId} name="text" rows={rows} defaultValue={suggestion.draftText ?? ''} className="arch-mono text-xs leading-relaxed" />
          </div>
        ) : (
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">{suggestion.draftText}</pre>
        )}
        {canReview ? (
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton pendingLabel="Posting…">{APPROVE_LABELS[suggestion.type]}</SubmitButton>
            <Outcome state={approveState} />
          </div>
        ) : null}
      </form>

      {canReview ? (
        <form action={dismissAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <SubmitButton variant="secondary" pendingLabel="Dismissing…">
            Dismiss
          </SubmitButton>
          <Outcome state={dismissState} />
        </form>
      ) : null}
    </li>
  );
}

export function CopilotPanel({
  incidentId,
  canGenerate,
  canReview,
  config,
  suggestions,
}: {
  incidentId: string;
  canGenerate: boolean;
  canReview: boolean;
  config: Config;
  suggestions: CopilotSuggestionView[];
}) {
  const pending = suggestions.filter((suggestion) => suggestion.status === 'PENDING');
  const reviewed = suggestions.filter((suggestion) => suggestion.status !== 'PENDING');

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-slate-900/60">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-100">
            ARCH Copilot
            <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
              beta
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">AI drafts only. Nothing is posted or changed until a responder approves it.</p>
        </div>
        <span className="arch-mono shrink-0 text-xs text-slate-500" title="AI provider · model">
          {config.provider} · {config.model}
        </span>
      </div>

      <div className="space-y-3 px-5 py-4">
        {!config.enabled ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" role="status">
            Copilot is not configured: {config.reason ?? 'missing AI settings.'} Set <span className="arch-mono">AI_PROVIDER=&quot;mock&quot;</span> for local
            development.
          </p>
        ) : null}
        {canGenerate ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GENERATORS.map((generator) => (
              <GenerateButton key={generator.type} incidentId={incidentId} {...generator} disabled={!config.enabled} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Your role can read Copilot drafts but not request or review them.</p>
        )}
      </div>

      <div className="border-t border-slate-800">
        <p className="px-5 pt-4 text-xs font-medium uppercase tracking-wide text-slate-500">Waiting for review ({pending.length})</p>
        {pending.length === 0 ? (
          <p className="px-5 pb-4 pt-2 text-sm text-slate-400">No drafts waiting. {canGenerate ? 'Ask Copilot for one above.' : ''}</p>
        ) : (
          <ul>
            {pending.map((suggestion) => (
              <PendingDraft key={suggestion.id} suggestion={suggestion} canReview={canReview} />
            ))}
          </ul>
        )}
      </div>

      {reviewed.length > 0 ? (
        <details className="border-t border-slate-800 px-5 py-3">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500">Reviewed drafts ({reviewed.length})</summary>
          <ul className="mt-3 space-y-2">
            {reviewed.map((suggestion) => (
              <li key={suggestion.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-slate-300">
                  {TYPE_LABELS[suggestion.type]}{' '}
                  <span className={suggestion.status === 'APPROVED' ? 'text-emerald-300' : 'text-slate-500'}>{suggestion.status.toLowerCase()}</span>
                </span>
                <span className="text-xs text-slate-500">
                  by {suggestion.reviewedBy ?? 'unknown'} · {suggestion.reviewedAgo}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
