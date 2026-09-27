'use client';

import { useRef, useState } from 'react';
import { AiBadge } from '@/components/ui/logo';
import { AI_NAME } from '@/lib/brand';

type Citation = {
  source: 'timeline' | 'runbook' | 'similar_incident' | 'category' | 'playbook';
  label: string;
  detail?: string;
  similarity?: number;
};

type Turn = {
  role: 'user' | 'arch';
  text: string;
  intent?: string;
  confidence?: string;
  citations?: Citation[];
  suggestions?: string[];
};

const SOURCE_LABEL: Record<Citation['source'], string> = {
  timeline: 'Timeline',
  runbook: 'Runbook',
  similar_incident: 'Past incident',
  category: 'Classifier',
  playbook: 'Playbook',
};

/**
 * Ask ARCH — the conversational face of the native engine.
 *
 * Ask anything about the incident ("what's the status?", "kyun hua?", "what do I do next?"),
 * describe an ops problem ("database slow hai, kya karu?"), or just say hi. Answers are computed
 * on this server by the native engine — no language model, no cost — and every claim comes with
 * clickable evidence. The last few turns are sent along so follow-ups make sense.
 */
export function AskArchPanel({ incidentId }: { incidentId: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setQuestion('');
    // Build {question, answer} pairs from the transcript so follow-ups resolve against them.
    const pairs: { question: string; answer: string }[] = [];
    for (let i = 0; i < turns.length; i += 1) {
      const current = turns[i]!;
      if (current.role === 'user') {
        const next = turns[i + 1];
        pairs.push({ question: current.text, answer: next && next.role === 'arch' ? next.text : '' });
      }
    }
    setTurns((previous) => [...previous, { role: 'user', text: trimmed }]);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/copilot/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: trimmed, history: pairs.slice(-6) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? `${AI_NAME} could not answer that.`);
      const data = payload.data as { answer: string; intent: string; confidence: string; citations: Citation[]; suggestions: string[] };
      setTurns((previous) => [
        ...previous,
        { role: 'arch', text: data.answer, intent: data.intent, confidence: data.confidence, citations: data.citations, suggestions: data.suggestions },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${AI_NAME} could not answer that.`);
      setTurns((previous) => previous.slice(0, -1));
      setQuestion(trimmed);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-b from-indigo-500/[0.07] to-abyss-850 p-4 shadow-[0_8px_32px_-16px_rgb(0_0_0/0.8)]">
      <header className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">Ask <AiBadge /></h2>
        <p className="text-xs text-slate-500">
          Talk to the native engine — status, cause, next steps, or any ops problem (&quot;database slow hai, kya karu?&quot;).
          English or Hinglish. Answers are advice, never auto-applied.
        </p>
      </header>

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <div className="space-y-1.5">
            {["What's the current status?", 'What should I do next?', 'Disk is filling up — what do I do?'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => ask(chip)}
                className="block w-full rounded-lg border border-white/[0.08] bg-abyss-950/50 px-3 py-2 text-left text-xs text-slate-300 hover:border-white/20 hover:text-slate-100"
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}

        {turns.map((turn, index) =>
          turn.role === 'user' ? (
            <div key={index} className="flex justify-end">
              <p className="max-w-[85%] rounded-xl rounded-br-sm bg-indigo-500/20 px-3 py-2 text-xs text-indigo-100">{turn.text}</p>
            </div>
          ) : (
            <div key={index} className="space-y-2">
              <div className="rounded-lg border border-white/[0.08] bg-abyss-950/60 px-3 py-2">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">{turn.text}</p>
                {turn.intent ? (
                  <p className="mt-1.5 text-[10px] uppercase tracking-wide text-slate-600">
                    {turn.intent.replace(/_/g, ' ')} · {turn.confidence} confidence
                  </p>
                ) : null}
              </div>
              {turn.citations?.length ? (
                <ul className="space-y-1">
                  {turn.citations.map((citation, cIndex) => (
                    <li key={cIndex} className="rounded border border-white/[0.08]/80 bg-abyss-950/40 px-2 py-1 text-[10px] text-slate-400">
                      <span className="text-slate-500">{SOURCE_LABEL[citation.source]}</span> — {citation.label}
                      {citation.detail ? <span className="block text-slate-500">{citation.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {turn.suggestions?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {turn.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => ask(suggestion)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ),
        )}

        {busy ? <p className="flex items-center gap-2 text-xs text-violet-300"><span className="flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-violet-400" /><span className="size-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" /><span className="size-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" /></span>Thinking…</p> : null}
      </div>

      {error ? <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p> : null}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={800}
          placeholder={`Ask ${AI_NAME}…`}
          className="w-full rounded-lg border border-white/[0.08] bg-abyss-950/70 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-violet-500/60 focus:outline-none"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 2}
          className="shrink-0 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
