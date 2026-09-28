'use client';

import { useEffect, useRef, useState } from 'react';
import { Reveal } from './reveal';
import { usePrefersReducedMotion } from '@/lib/motion';
import { AI_NAME } from '@/lib/brand';

/**
 * ARCH V1.1 — the intelligence section.
 *
 * Every number and mechanism here is lifted from the repository, not from a pitch:
 * `docs/engineering/ARCH-MODEL.md` (one engine, 5–100 ms, 22 categories, 44 patterns) and
 * `docs/engineering/AI-GUARDRAILS.md` (drafts are drafts, context limits, sandbox-only execution,
 * a fix is "verified" only when a generated test fails before the patch and passes after it).
 *
 * This matters because the honest story is the stronger one. ARCH has *no* vendor adapter — the
 * Ollama/hybrid path was deliberately deleted (ARCHITECTURE.md, decision D16) so there is one
 * engine to reason about and no mode where two models disagree. A page that claimed otherwise would
 * be describing software that fails at boot.
 *
 * Layout is a sticky two-column: the claim stays pinned while the evidence scrolls past it.
 */

const SPEC: { key: string; value: string; note: string }[] = [
  { key: 'provider', value: 'arch', note: 'the only one compiled in' },
  { key: 'latency', value: '5–100 ms', note: 'no round trip to anyone' },
  { key: 'network', value: 'none', note: 'it cannot call out' },
  { key: 'hardware', value: 'cpu only', note: 'a few MB per org model' },
  { key: 'api key', value: '—', note: 'there is nothing to buy' },
  { key: 'applies itself', value: 'never', note: 'every draft waits for a human' },
];

const LOOP = [
  { stage: 'plan', detail: 'chain-of-thought planner picks the next tool', ms: '4 ms' },
  { stage: 'retrieve', detail: 'tenant-scoped search over your resolved incidents', ms: '11 ms' },
  { stage: 'classify', detail: 'naive bayes over 22 categories · 44 patterns', ms: '2 ms' },
  { stage: 'verify', detail: 'sandboxed python, no credentials, throwaway', ms: '61 ms' },
];

/** Context ceilings from `src/server/ai/guardrails.ts` — real constants, not rounding. */
const LIMITS = [
  { key: 'maxTimelineEntries', value: '60' },
  { key: 'maxSimilarIncidents', value: '4' },
  { key: 'maxContextChars', value: '16,000' },
];

const TRANSCRIPT: { who: 'human' | 'arch'; text: string; delay: number }[] = [
  { who: 'human', text: 'database slow hai, kya karu?', delay: 0 },
  {
    who: 'arch',
    text: 'pg-primary ka connection pool saturate ho raha hai — 10/10 connections busy, 42 queries queued.',
    delay: 700,
  },
  {
    who: 'arch',
    text: 'Evidence: INC-418 timeline 09:21 · INC-311 (0.87 similar, resolved by pool 10→40) · pg_stat_activity snapshot',
    delay: 1500,
  },
  {
    who: 'arch',
    text: 'Draft #214 ready — pool_size 10→40, statement_timeout 30s. Generated test fails before, passes after. Awaiting your approve.',
    delay: 2400,
  },
];

/** Types the transcript out when it scrolls into view. Reduced motion gets the full text at once. */
function Transcript() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="arch-mono overflow-hidden rounded-xl border border-white/[0.08] bg-ink-950 text-[12px] leading-[1.75] sm:text-[12.5px]"
    >
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-2">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-ash-500">
          <span className="size-1.5 rounded-full bg-signal-500" /> ask {AI_NAME.toLowerCase()}
        </span>
        <span className="text-[10px] tracking-[0.08em] text-ash-600">inc-418 · war-room</span>
      </div>

      <div className="space-y-3 px-4 py-4">
        {TRANSCRIPT.map((line, index) => (
          <div
            key={index}
            className={`flex gap-2.5 transition-all duration-700 ease-out ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
            style={{ transitionDelay: `${reduced ? 0 : line.delay}ms` }}
          >
            <span
              className={`shrink-0 pt-px text-[10px] font-bold uppercase tracking-[0.1em] ${
                line.who === 'human' ? 'text-ash-500' : 'text-signal-400'
              }`}
            >
              {line.who === 'human' ? 'you' : 'v1.1'}
            </span>
            <span className={line.who === 'human' ? 'text-ash-200' : 'text-ash-300'}>
              {line.text}
              {/* Caret sits on the last revealed line only. */}
              {visible && index === TRANSCRIPT.length - 1 && !reduced && (
                <span className="ml-1 inline-block h-[1.05em] w-[6px] translate-y-[2px] animate-blink bg-signal-500" aria-hidden />
              )}
            </span>
          </div>
        ))}

        {visible && (
          <div className="flex flex-wrap gap-1.5 border-t border-white/[0.07] pt-3 transition-opacity delay-1000 duration-700">
            {['approve draft #214', 'dismiss', 'open war-room', 'draft postmortem'].map((action, index) => (
              <span
                key={action}
                className={`rounded-[5px] border px-2 py-1 text-[10px] tracking-[0.04em] ${
                  index === 0
                    ? 'border-signal-500/35 bg-signal-500/[0.09] text-signal-200'
                    : 'border-white/[0.09] bg-white/[0.02] text-ash-400'
                }`}
              >
                {action}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** The agent loop, drawn as a pipeline with a pulse travelling the stages. */
function AgentLoop() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="arch-panel overflow-hidden p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="arch-display text-[17px] font-semibold tracking-[-0.02em] text-bone">One turn of the agent loop</h3>
        <span className="arch-mono arch-tabular text-[10px] uppercase tracking-[0.12em] text-ash-600">78 ms total</span>
      </div>

      <ol className="relative space-y-0">
        {/* Spine */}
        <span className="absolute bottom-3 left-[7px] top-3 w-px bg-white/[0.09]" aria-hidden />
        {!reduced && (
          <span className="arch-loop-pulse absolute left-[5px] top-3 block size-[5px] rounded-full bg-signal-500" aria-hidden />
        )}

        {LOOP.map((step, index) => (
          <li key={step.stage} className="relative flex items-start gap-4 py-2.5">
            <span
              className="relative z-10 mt-1.5 grid size-[15px] shrink-0 place-items-center rounded-full border border-white/[0.14] bg-ink-900"
              aria-hidden
            >
              <span className="size-[5px] rounded-full bg-ash-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="arch-mono text-[11px] font-bold uppercase tracking-[0.14em] text-bone">
                  {String(index + 1).padStart(2, '0')} · {step.stage}
                </span>
                <span className="arch-mono arch-tabular text-[10px] text-ash-600">{step.ms}</span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ash-400">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 border-t border-white/[0.07] pt-4 text-[12.5px] leading-relaxed text-ash-500">
        The loop runs entirely in-process. It does not browse the internet while a responder is
        waiting, and the only thing it can execute is Python inside a throwaway sandbox with no
        credentials attached.
      </p>
    </div>
  );
}

/** Verified Fix Loop — the before/after test result is the whole point. */
function VerifiedFix() {
  return (
    <div className="arch-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-5 py-3">
        <h3 className="arch-display text-[15px] font-semibold tracking-[-0.01em] text-bone">Verified Fix Loop</h3>
        <span className="arch-mono text-[9.5px] uppercase tracking-[0.14em] text-ash-600">draft #214</span>
      </div>

      <div className="grid gap-px bg-white/[0.07] sm:grid-cols-2">
        <div className="bg-ink-900 px-5 py-4">
          <p className="arch-mono mb-2.5 text-[9.5px] uppercase tracking-[0.14em] text-ash-600">before patch</p>
          <p className="arch-mono text-[11.5px] leading-relaxed text-sev-critical">
            ✗ pool_exhaustion_raises_5xx
            <br />
            <span className="text-ash-600">  expected 200, got 503 (queued 42)</span>
          </p>
          <p className="arch-mono mt-2 text-[10px] text-ash-600">1 failed · 213 passed</p>
        </div>
        <div className="bg-ink-900 px-5 py-4">
          <p className="arch-mono mb-2.5 text-[9.5px] uppercase tracking-[0.14em] text-ash-600">after patch</p>
          <p className="arch-mono text-[11.5px] leading-relaxed text-state-ok">
            ✓ pool_exhaustion_raises_5xx
            <br />
            <span className="text-ash-600">  200 in 84 ms · queue depth 0</span>
          </p>
          <p className="arch-mono mt-2 text-[10px] text-ash-600">214 passed</p>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-white/[0.07] px-5 py-4">
        <div className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3">
          <span className="arch-mono mt-px shrink-0 rounded-[4px] border border-state-ok/30 bg-state-ok/10 px-1.5 py-px text-[9.5px] font-bold tracking-[0.08em] text-state-ok">
            PR
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-bone">fix(db): raise checkout pool 10→40, cap statement timeout</p>
            <p className="arch-mono mt-1 truncate text-[10px] tracking-[0.04em] text-ash-500">
              draft · against pinned a91f3c2 · opened only after a human approved
            </p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-ash-500">
          A fix is only ever called <span className="text-ash-300">verified</span> when the generated
          test fails before the patch and passes after it. Generation alone proves nothing, so it
          earns no label.
        </p>
      </div>
    </div>
  );
}

export function Intelligence() {
  return (
    <section
      id="intelligence"
      className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.07] bg-ink-950"
      aria-label={AI_NAME}
    >
      <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: 'radial-gradient(70% 100% at 78% 0%, rgb(255 182 39 / 0.045), transparent 68%)' }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20 lg:py-32">
        {/* ---- Sticky claim column ---- */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal variant="fade">
            <p className="arch-mono mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-500">
              <span className="block h-px w-8 bg-signal-500" aria-hidden />
              {AI_NAME}
            </p>
          </Reveal>

          <Reveal variant="mask" duration={1000}>
            <h2 className="arch-display text-[clamp(2.1rem,4.4vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-bone">
              An on-call brain with
              <br />
              nowhere to phone home.
            </h2>
          </Reveal>

          <Reveal variant="rise" delay={120}>
            <p className="mt-6 max-w-[34rem] text-[15px] leading-[1.75] text-ash-400">
              There is no OpenAI key to paste and no per-seat AI upsell, because there is no adapter
              to configure. {AI_NAME} is classifiers, retrieval, a planner and a sandbox — compiled
              into this repository, trained on your own resolved incidents, and structurally unable
              to make a network call.
            </p>
          </Reveal>

          {/* The spec block reads like an instrument's data plate. */}
          <Reveal variant="rise" delay={220}>
            <dl className="arch-mono mt-8 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {SPEC.map((row) => (
                <div key={row.key} className="group flex items-baseline justify-between gap-4 py-2.5 transition-colors hover:bg-white/[0.02]">
                  <dt className="text-[10.5px] uppercase tracking-[0.14em] text-ash-600">{row.key}</dt>
                  <dd className="flex items-baseline gap-3 text-right">
                    <span className="text-[10px] tracking-[0.04em] text-ash-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {row.note}
                    </span>
                    <span className="arch-tabular text-[12.5px] font-semibold text-bone">{row.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal variant="rise" delay={300}>
            <div className="mt-7 flex flex-wrap gap-1.5">
              {LIMITS.map((limit) => (
                <span
                  key={limit.key}
                  className="arch-mono rounded-[5px] border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 text-[10px] tracking-[0.04em] text-ash-400"
                  title="Ceiling enforced in src/server/ai/guardrails.ts"
                >
                  <span className="text-ash-600">{limit.key}</span>{' '}
                  <span className="arch-tabular text-signal-300">{limit.value}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ash-600">
              Context is bounded before it is used. A provider never receives your whole history —
              and credentials are redacted before text leaves the calling module.
            </p>
          </Reveal>
        </div>

        {/* ---- Scrolling evidence column ---- */}
        <div className="space-y-6">
          <Reveal variant="rise" duration={1000}>
            <Transcript />
          </Reveal>
          <Reveal variant="rise" delay={80} duration={1000}>
            <AgentLoop />
          </Reveal>
          <Reveal variant="rise" delay={80} duration={1000}>
            <VerifiedFix />
          </Reveal>

          {/* What it learns from — with the licences named, because the optional corpora are real. */}
          <Reveal variant="rise" delay={80} duration={1000}>
            <div className="arch-panel p-5 sm:p-6">
              <h3 className="arch-display mb-4 text-[15px] font-semibold tracking-[-0.01em] text-bone">
                What the model trains on
              </h3>
              <ul className="divide-y divide-white/[0.06]">
                {[
                  { source: 'your resolved incidents', note: 'timeline notes written by humans; copilot entries excluded', licence: 'yours' },
                  { source: 'approved postmortems', note: 'only the ones a human signed off', licence: 'yours' },
                  { source: 'pattern library', note: '44 failure patterns across 22 categories', licence: 'original' },
                  { source: 'public postmortems', note: '~340 incidents, opt-in fetch', licence: 'optional' },
                  { source: 'code-fix corpus', note: 'SWE-bench + ManySStuBs4J', licence: 'MIT' },
                  { source: 'code-review corpus', note: 'github-codereview + CodeReviewer', licence: 'MIT · Apache-2.0' },
                ].map((row) => (
                  <li key={row.source} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ash-200">{row.source}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ash-600">{row.note}</p>
                    </div>
                    <span className="arch-mono shrink-0 rounded-[4px] border border-white/[0.08] px-1.5 py-px text-[9.5px] uppercase tracking-[0.1em] text-ash-500">
                      {row.licence}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
