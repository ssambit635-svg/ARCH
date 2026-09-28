'use client';

import { useActionState, useState } from 'react';
import { Select, SubmitButton, Textarea } from '@/components/ui/form';
import { reviewCodeAction, type CodeReviewState } from '@/app/dashboard/actions';

/**
 * ARCH Code Assist — paste code or a stack trace, get a review / fix / explanation from ARCH's
 * own model only — no vendor call, no second inference server. The server re-checks permissions
 * and rate limits; nothing is stored.
 */

const SAMPLE = `async function getUser(id) {
  const res = await fetch("https://api.internal/users/" + id);
  if (res.status == 200) {
    const q = "SELECT * FROM orders WHERE user_id = " + id;
    return db.query(q).then(rows => rows[0]);
  }
  try { audit(id) } catch (e) {}
}`;

const SEVERITY_STYLE = {
  error: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  info: 'bg-white/[0.06] text-slate-300 ring-white/10',
} as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/[0.06]"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Result({ state }: { state: CodeReviewState }) {
  if (!state.ok) {
    return (
      <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
        {state.error}
      </p>
    );
  }
  const result = state.result;
  return (
    <div className="space-y-5" aria-live="polite">
      <div className="rounded-xl border border-white/[0.07] bg-abyss-850/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-white">{result.summary}</p>
          <span className="arch-mono text-xs text-slate-500">
            {result.language} · {result.model} · {result.latencyMs} ms
          </span>
        </div>
        {result.topFrame ? (
          <p className="mt-2 text-xs text-slate-400">
            First frame in your code:{' '}
            <span className="arch-mono text-slate-200">
              {result.topFrame.file}:{result.topFrame.line}
              {result.topFrame.fn ? ` (${result.topFrame.fn})` : ''}
            </span>
          </p>
        ) : null}
      </div>

      {result.diagnoses.length ? (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">What went wrong</h3>
          {result.diagnoses.map((diagnosis) => (
            <div key={diagnosis.id} className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
              <p className="text-sm font-semibold text-rose-200">{diagnosis.title}</p>
              <p className="mt-1 text-sm text-slate-300">{diagnosis.explanation}</p>
              <p className="arch-mono mt-2 truncate text-xs text-slate-500" title={diagnosis.evidence}>
                {diagnosis.evidence}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                {diagnosis.fixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {result.findings.length ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Findings ({result.findings.length})</h3>
          <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.07]">
            {result.findings.map((finding, index) => (
              <li key={`${finding.line}-${index}`} className="flex gap-3 px-4 py-3">
                <span className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLE[finding.severity]}`}>{finding.severity}</span>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-slate-100">
                    {finding.line ? <span className="arch-mono mr-2 text-xs text-slate-500">L{finding.line}</span> : null}
                    {finding.message}
                  </p>
                  {finding.suggestion ? <p className="text-xs text-slate-400">{finding.suggestion}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.improvedCode ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Improved code</h3>
            <CopyButton text={result.improvedCode} />
          </div>
          {result.appliedFixes.length && result.provider === 'arch' ? (
            <p className="text-xs text-emerald-300">Safe fixes applied: {result.appliedFixes.join(' · ')}</p>
          ) : null}
          <pre className="arch-mono max-h-[28rem] overflow-auto rounded-lg border border-white/[0.07] bg-abyss-950/80 p-4 text-xs leading-relaxed text-slate-200">
            {result.improvedCode}
          </pre>
        </div>
      ) : null}

      {result.explanation ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Explanation</h3>
          <pre className="whitespace-pre-wrap rounded-lg border border-white/[0.07] bg-abyss-950/50 p-4 text-sm leading-relaxed text-slate-300">{result.explanation}</pre>
        </div>
      ) : null}
    </div>
  );
}

export function CodeAssist({ canUse, engineLabel }: { canUse: boolean; engineLabel: string }) {
  const [state, formAction] = useActionState<CodeReviewState | undefined, FormData>(reviewCodeAction, undefined);
  const [code, setCode] = useState('');
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form action={formAction} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="code-mode" className="block text-xs font-medium text-slate-400">
              What should ARCH do?
            </label>
            <Select id="code-mode" name="mode" defaultValue="review" disabled={!canUse}>
              <option value="review">Review — find bugs &amp; risks</option>
              <option value="fix">Fix — give me better code</option>
              <option value="explain">Explain — this error / stack trace</option>
              <option value="scaffold">Thinker — small snippet + where it goes / what breaks</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="code-language" className="block text-xs font-medium text-slate-400">
              Language
            </label>
            <Select id="code-language" name="language" defaultValue="auto" disabled={!canUse}>
              <option value="auto">Auto-detect</option>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="java">Java</option>
              <option value="sql">SQL</option>
              <option value="csharp">C#</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
            </Select>
          </div>
          <button
            type="button"
            className="ml-auto text-xs text-indigo-300 hover:text-indigo-200"
            onClick={() => setCode(SAMPLE)}
            disabled={!canUse}
          >
            Try a sample
          </button>
        </div>
        <label htmlFor="code-input" className="sr-only">
          Code or stack trace
        </label>
        <Textarea
          id="code-input"
          name="code"
          rows={22}
          maxLength={20_000}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Paste code or a stack trace — or, in Thinker mode, describe a small snippet (e.g. CRUD route for alerts with name and severity)"
          className="arch-mono text-xs leading-relaxed"
          spellCheck={false}
          disabled={!canUse}
        />
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label htmlFor="code-attachments" className="block text-sm font-medium text-slate-200">Add screenshots or context files</label>
              <p className="mt-1 text-xs text-slate-500">Local OCR for PNG/JPEG/WebP/GIF/BMP; also supports Markdown, logs, config and source files. Up to 6 files, 1 MB each.</p>
            </div>
            <input
              id="code-attachments"
              name="attachments"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,.md,.markdown,.txt,.log,.json,.yaml,.yml,.toml,.ini,.js,.jsx,.ts,.tsx,.py,.go,.java,.kt,.cs,.rb,.php,.sql,.sh,.diff,.patch,.html,.css,.xml,.graphql"
              disabled={!canUse}
              onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []).map((file) => ({ name: file.name, size: file.size })))}
              className="max-w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-white/[0.14]"
            />
          </div>
          {files.length ? <p className="mt-2 break-words text-xs text-slate-400">Selected: {files.map((file) => `${file.name} (${(file.size / 1024).toFixed(0)} KB)`).join(' · ')}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {code.length.toLocaleString('en-US')} / 20,000 typed characters · extracted text shares the 20,000-character limit · <span className="arch-mono">{engineLabel}</span> · not stored
          </p>
          <fieldset disabled={!canUse} className="contents">
            <SubmitButton pendingLabel="Analyzing…">Analyze</SubmitButton>
          </fieldset>
        </div>
      </form>

      <div>
        {state ? (
          <Result state={state} />
        ) : (
          <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-white/[0.07] p-8 text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-sm font-medium text-slate-200">Your code never leaves this server</p>
              <p className="text-sm text-slate-400">
                ARCH looks for the problems that cause incidents: missing timeouts, swallowed errors, SQL injection, hard-coded secrets, unsafe retries. It
                explains stack traces and applies safe fixes automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
