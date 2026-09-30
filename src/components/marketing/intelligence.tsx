'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container, cn } from './vui-primitives';
import { GsapTextReveal } from './gsap-reveal';

const HYPOTHESES = [
  {
    id: 'hyp-1',
    rank: '01',
    node: 'pg-primary',
    tag: 'v2.18.4 · lock',
    score: 92,
    title: 'Pool saturation on postgres-primary after deploy v2.18.4',
    evidence: 'pg_stat_activity = 200/200 · migration #418 holds ACCESS EXCLUSIVE lock',
    remediation: 'Rollback checkout-api to v2.18.3 and drain idle transactions.',
  },
  {
    id: 'hyp-2',
    rank: '02',
    node: 'webhooks',
    tag: '3.4× spike',
    score: 64,
    title: 'Retry storm from payment gateway webhook workers',
    evidence: '3.4× inbound spike on /api/webhooks/alerts over 120s window',
    remediation: 'Enable token-bucket shedder on edge-proxy for non-idempotent retries.',
  },
  {
    id: 'hyp-3',
    rank: '03',
    node: 'auth-svc',
    tag: 'eu-central-1b',
    score: 14,
    title: 'Cross-AZ network jitter in eu-central-1b',
    evidence: 'inter-AZ RTT normal (0.8ms p95); packet loss < 0.01%',
    remediation: 'Ruled out — keep traffic balanced across all 3 availability zones.',
  },
];

function FlipTextWord({ text }: { text: string }) {
  const chars = text.split('');
  return (
    <span
      className="inline-flex items-center justify-center font-mono text-sm font-bold tracking-[0.18em] text-zinc-100"
      style={{
        ['--flip-duration' as string]: '2.2s',
        ['--flip-delay' as string]: '0.06s',
      }}
    >
      {chars.map((char, i) => (
        <span
          key={`${char}-${i}`}
          className="flip-char"
          style={{ ['--index' as string]: i }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

function CreepyAckButton({ onTrigger }: { onTrigger: () => void }) {
  const eyesRef = useRef<HTMLSpanElement>(null);
  const [eyeCoords, setEyeCoords] = useState({ x: 0, y: 0 });

  const updateEyes = (e: React.MouseEvent | React.TouchEvent) => {
    const userEvent = 'touches' in e ? e.touches[0] : e;
    if (!userEvent || !eyesRef.current) return;
    const eyesRect = eyesRef.current.getBoundingClientRect();
    const eyesCenter = {
      x: eyesRect.left + eyesRect.width / 2,
      y: eyesRect.top + eyesRect.height / 2,
    };
    const cursor = { x: userEvent.clientX, y: userEvent.clientY };
    const dx = cursor.x - eyesCenter.x;
    const dy = cursor.y - eyesCenter.y;
    const angle = Math.atan2(-dy, dx) + Math.PI / 2;
    const distance = Math.hypot(dx, dy);
    const x = (Math.sin(angle) * Math.min(distance, 180)) / 180;
    const y = (Math.cos(angle) * Math.min(distance, 75)) / 75;
    setEyeCoords({ x, y });
  };

  const translateX = `${-50 + eyeCoords.x * 50}%`;
  const translateY = `${-50 + eyeCoords.y * 50}%`;

  return (
    <button
      type="button"
      onClick={onTrigger}
      onMouseMove={updateEyes}
      onTouchMove={updateEyes}
      onFocus={() => setEyeCoords({ x: -0.25, y: -0.25 })}
      onBlur={() => setEyeCoords({ x: 0, y: 0 })}
      className="group relative min-w-[9em] cursor-pointer rounded-xl bg-black outline-none select-none"
    >
      <span
        ref={eyesRef}
        className="pointer-events-none absolute right-[1em] bottom-[0.5em] z-0 flex h-[0.75em] items-center gap-[0.375em]"
      >
        <span className="relative h-[0.75em] w-[0.75em] overflow-hidden rounded-full bg-white">
          <span
            className="absolute top-1/2 left-1/2 h-[0.375em] w-[0.375em] rounded-full bg-black"
            style={{ transform: `translate(${translateX}, ${translateY})` }}
          />
        </span>
        <span className="relative h-[0.75em] w-[0.75em] overflow-hidden rounded-full bg-white">
          <span
            className="absolute top-1/2 left-1/2 h-[0.375em] w-[0.375em] rounded-full bg-black"
            style={{ transform: `translate(${translateX}, ${translateY})` }}
          />
        </span>
      </span>

      <span
        className={cn(
          'relative inset-0 block origin-[1.25em_50%] rounded-xl bg-zinc-100 px-4 py-2.5 text-center text-xs font-bold tracking-[0.08em] uppercase text-zinc-950',
          'shadow-[inset_0_0_0_2px_rgba(0,0,0,1)] transition-transform duration-300 ease-in-out',
          'group-hover:rotate-[-12deg] group-active:rotate-[-8deg]'
        )}
      >
        Acknowledge
      </span>
    </button>
  );
}

function CardTopline({ index, tag }: { index: string; tag: string }) {
  return (
    <div className="mb-4 flex items-center justify-between text-[11px] font-mono">
      <span className="rounded-md border border-[#182438] bg-[#070d19] px-2 py-0.5 text-zinc-400">
        {index}
      </span>
      <span className="uppercase tracking-[0.14em] text-zinc-500">{tag}</span>
    </div>
  );
}

function SystemActionPill({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 min-w-[98px] items-center justify-center rounded-lg border border-[#182438] bg-[#070d19] px-2.5 font-mono text-[10px] font-medium whitespace-nowrap text-zinc-300">
      {label}
    </span>
  );
}

export function Intelligence() {
  const sectionRef = useRef<HTMLElement>(null);
  const [buttonMode, setButtonMode] = useState<'dedup' | 'ack'>('dedup');
  const [activeHypIdx, setActiveHypIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeHyp = HYPOTHESES[activeHypIdx] ?? HYPOTHESES[0]!;

  // Smooth automatic cycling through the 3 hypotheses when not hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setActiveHypIdx((prev) => (prev + 1) % HYPOTHESES.length);
    }, 3600);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.vui-matrix-card',
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="intelligence"
      ref={sectionRef}
      className="relative border-b border-[#182438] bg-[#04070e] overflow-hidden"
    >
      <div id="library-map" className="scroll-mt-20" />
      <Container>
        <div className="md:border-x border-[#182438]">
          {/* ================================================================
              IntroBand
             ================================================================ */}
          <div className="relative overflow-hidden border-b border-[#182438] px-5 py-8 md:px-8 lg:px-10">
            <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#182438] bg-[#070d19] px-3 py-1 text-[11px] font-medium text-zinc-400">
                  <span className="font-mono text-[#3b8ef4]">ARCH</span>
                  <span className="font-mono">Workflow preview · illustrative data</span>
                </div>

                <GsapTextReveal
                  as="h2"
                  className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight text-left"
                >
                  Build with ARCH Intelligence
                </GsapTextReveal>

                <p className="mt-2 max-w-2xl text-left font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Alert intake, native assistance and human review — one workspace. All examples below are illustrative, not live results.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[#182438] bg-[#070d19] p-3.5">
                  <div className="font-orbitron text-lg font-bold text-zinc-100 tnum">CPU-only</div>
                  <div className="font-mono text-[11px] text-zinc-500">Native model inference</div>
                </div>
                <div className="rounded-xl border border-[#182438] bg-[#070d19] p-3.5">
                  <div className="font-orbitron text-lg font-bold text-[#3b8ef4] tnum">Human-led</div>
                  <div className="font-mono text-[11px] text-zinc-500">Review every suggestion</div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================
              PreviewMatrix (3-Column 01/03 · 02/03 · 03/03)
             ================================================================ */}
          <div className="relative overflow-hidden border-b border-[#182438]">
            <div className="relative z-10 grid grid-cols-1 divide-y divide-[#182438] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {/* COLUMN 01/03: Alert Ingest Forge */}
              <div className="vui-matrix-card relative flex min-h-[410px] flex-col justify-between p-5 md:p-6">
                <div>
                  <CardTopline index="01/03" tag="Alert Ingest Forge" />
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-100 leading-snug">
                    Interactive Deduplication Controls
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-zinc-400 leading-relaxed">
                    HMAC-SHA256 verified webhook intake that collapses alert storms into a single fingerprinted incident.
                  </p>
                </div>

                <div className="my-5 rounded-2xl border border-[#182438] bg-[#060a14] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex rounded-lg border border-[#182438] bg-[#0a1120] p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setButtonMode('dedup')}
                        className={cn(
                          'rounded-md px-2.5 py-1 font-mono font-medium transition-colors cursor-pointer',
                          buttonMode === 'dedup'
                            ? 'bg-[#3b8ef4] text-[#04070e] font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        Deduplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => setButtonMode('ack')}
                        className={cn(
                          'rounded-md px-2.5 py-1 font-mono font-medium transition-colors cursor-pointer',
                          buttonMode === 'ack'
                            ? 'bg-[#3b8ef4] text-[#04070e] font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        Acknowledge
                      </button>
                    </div>

                    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      SHA-256 INTAKE
                    </span>
                  </div>

                  <div className="mt-3 flex min-h-[142px] flex-col items-center justify-center gap-3 rounded-xl border border-[#182438] bg-[#080e1b] px-3 py-4">
                    {buttonMode === 'dedup' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setButtonMode('ack')}
                          className="rounded-xl border border-[#1e3454] bg-[#04070e] px-4 py-2.5 transition-colors hover:border-[#3b8ef4] cursor-pointer"
                        >
                          <FlipTextWord text="DEDUPLICATE" />
                        </button>
                        <span className="font-mono text-[10px] text-zinc-500 text-center">
                          fingerprint: sha256(service + alert_rule + region)
                        </span>
                      </>
                    ) : (
                      <CreepyAckButton onTrigger={() => setButtonMode('dedup')} />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-zinc-400">
                    <span>Click preview to test intake</span>
                    <a
                      href="#workspace"
                      className="inline-flex items-center gap-1 font-medium text-zinc-200 hover:text-[#3b8ef4]"
                    >
                      Open War Room →
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <span className="rounded-md border border-[#182438] bg-[#070d19] px-2.5 py-1 text-zinc-400">
                    Alertmanager
                  </span>
                  <span className="rounded-md border border-[#182438] bg-[#070d19] px-2.5 py-1 text-zinc-400">
                    Datadog
                  </span>
                  <span className="rounded-md border border-[#182438] bg-[#070d19] px-2.5 py-1 text-zinc-400">
                    Sentry HMAC
                  </span>
                </div>
              </div>

              {/* COLUMN 02/03: Clean Minimal Animated ARCH V1 Engine Classifier */}
              <div
                className="vui-matrix-card relative flex min-h-[410px] flex-col justify-between p-5 md:p-6"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div>
                  <CardTopline index="02/03" tag="Native assistant" />
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-100 leading-snug">
                    ARCH V1 Incident Assistant
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-zinc-400 leading-relaxed">
                    Classifies supplied incident context and retrieves similar examples using small local models, rules and templates. Suggestions can be wrong.
                  </p>
                </div>

                {/* Clean Minimal Animated Engine Pipeline (Replaces the orbital ring) */}
                <div className="my-5 rounded-2xl border border-[#182438] bg-[#060a14] p-3.5">
                  {/* Engine Header Bar with Animated Signal Sweep */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#182438]">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-[#3b8ef4]/40 bg-[#3b8ef4]/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase text-[#3b8ef4]">
                        Engine
                      </span>
                      <span className="font-mono text-xs font-semibold text-zinc-100">
                        ARCH V1
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                      <span>TF-IDF · BAYES</span>
                    </div>
                  </div>

                  {/* Minimal Animated Scan Track */}
                  <div className="relative my-2.5 h-1 w-full overflow-hidden rounded-full bg-[#0a1222]">
                    <motion.div
                      key={activeHyp.id}
                      initial={{ x: '-100%' }}
                      animate={{ x: '0%' }}
                      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full w-full rounded-full bg-gradient-to-r from-[#1e3a5f] via-[#3b8ef4] to-[#1e3a5f]"
                    />
                  </div>

                  {/* 3 Clean Interactive Signal Rows */}
                  <div className="space-y-1.5">
                    {HYPOTHESES.map((hyp, idx) => {
                      const isSelected = idx === activeHypIdx;
                      return (
                        <button
                          key={hyp.id}
                          type="button"
                          onClick={() => setActiveHypIdx(idx)}
                          className={cn(
                            'w-full rounded-xl border px-3 py-2 text-left transition-all duration-200 cursor-pointer',
                            isSelected
                              ? 'border-[#3b8ef4]/60 bg-[#0b1528]'
                              : 'border-[#141f33] bg-[#080d18] hover:border-[#1e3454]'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-[10px] font-semibold tnum',
                                  isSelected ? 'text-[#3b8ef4]' : 'text-zinc-500'
                                )}
                              >
                                {hyp.rank}
                              </span>
                              <span
                                className={cn(
                                  'font-medium',
                                  isSelected ? 'text-white' : 'text-zinc-300'
                                )}
                              >
                                {hyp.node}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500">{hyp.tag}</span>
                              <span
                                className={cn(
                                  'w-8 text-right text-[10px] font-semibold tnum',
                                  isSelected ? 'text-[#3b8ef4]' : 'text-zinc-500'
                                )}
                              >
                                {hyp.score}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#050811]">
                            <motion.div
                              initial={false}
                              animate={{
                                width: `${hyp.score}%`,
                                opacity: isSelected ? 1 : 0.35,
                              }}
                              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                              className="h-full rounded-full bg-[#3b8ef4]"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Hypothesis Bar */}
                <div className="rounded-xl border border-[#182438] bg-[#060a14] p-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>SAMPLE #{activeHyp.rank}</span>
                    <span className="text-[#3b8ef4]">EXAMPLE ONLY</span>
                  </div>
                  <div className="mt-1 text-zinc-200 font-sans text-xs font-medium leading-snug">
                    {activeHyp.title}
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-400 leading-relaxed break-words">
                    {activeHyp.evidence}
                  </div>
                </div>
              </div>

              {/* COLUMN 03/03: Runbook & Audit Composer */}
              <div className="vui-matrix-card relative flex min-h-[410px] flex-col justify-between p-5 md:p-6">
                <div>
                  <CardTopline index="03/03" tag="Incident Composer" />
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-100 leading-snug">
                    From Alert to Signed Audit Ledger
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-zinc-400 leading-relaxed">
                    State-machine transitions, Slack/Status broadcasts, and postmortem synthesis wired into one bus.
                  </p>
                </div>

                <div className="my-5 rounded-2xl border border-[#182438] bg-[#060a14] p-4">
                  <div className="relative h-48 overflow-hidden rounded-xl border border-[#182438] bg-[#080e1b] p-3">
                    <svg
                      viewBox="0 0 360 190"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      fill="none"
                      aria-hidden="true"
                    >
                      <line x1="112" y1="32" x2="146" y2="74" stroke="rgba(59,142,244,0.28)" strokeWidth="1.2" />
                      <line x1="112" y1="95" x2="132" y2="95" stroke="rgba(59,142,244,0.5)" strokeWidth="1.2" />
                      <line x1="112" y1="158" x2="146" y2="116" stroke="rgba(59,142,244,0.28)" strokeWidth="1.2" />
                      <line x1="248" y1="32" x2="214" y2="74" stroke="rgba(59,142,244,0.28)" strokeWidth="1.2" />
                      <line x1="248" y1="95" x2="228" y2="95" stroke="rgba(59,142,244,0.5)" strokeWidth="1.2" />
                      <line x1="248" y1="158" x2="214" y2="116" stroke="rgba(59,142,244,0.28)" strokeWidth="1.2" />
                    </svg>

                    <div className="relative z-10 flex h-full items-center justify-between gap-2">
                      <div className="flex flex-col gap-2">
                        <SystemActionPill label="State Machine" />
                        <SystemActionPill label="Audit SHA-256" />
                        <SystemActionPill label="Status 90d" />
                      </div>

                      <div className="flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-[#1e3454] bg-[#04070e] px-2 text-center">
                        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-zinc-500">
                          Core
                        </span>
                        <span className="mt-0.5 font-orbitron text-xs font-bold text-zinc-100">
                          ARCH<span className="text-[#3b8ef4]">.</span>
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <SystemActionPill label="RBAC Matrix" />
                        <SystemActionPill label="Alert Rules" />
                        <SystemActionPill label="Postmortem" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
                  <span>Ready for production on-call</span>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 font-medium text-zinc-200 hover:text-[#3b8ef4]"
                  >
                    Launch Console →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
