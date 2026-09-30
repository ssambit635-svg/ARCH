'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container, Heading, SubHeading, cn } from './vui-primitives';
import { GsapTextReveal } from './gsap-reveal';

const HYPOTHESES = [
  {
    id: 'hyp-1',
    rank: '01',
    node: 'pg-primary',
    title: 'Pool saturation on postgres-primary after deploy v2.18.4',
    evidence: 'pg_stat_activity = 200/200 · migration #418 holds ACCESS EXCLUSIVE lock',
    remediation: 'Rollback checkout-api to v2.18.3 and drain idle transactions.',
  },
  {
    id: 'hyp-2',
    rank: '02',
    node: 'webhooks',
    title: 'Retry storm from payment gateway webhook workers',
    evidence: '3.4× inbound spike on /api/webhooks/alerts over 120s window',
    remediation: 'Enable token-bucket shedder on edge-proxy for non-idempotent retries.',
  },
  {
    id: 'hyp-3',
    rank: '03',
    node: 'auth-svc',
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

function FlowLayer() {
  return (
    <svg
      viewBox="0 0 1200 540"
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block opacity-75"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arch-flow-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="50%" stopColor="rgba(59,142,244,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </linearGradient>
      </defs>

      <path
        id="arch-flow-a"
        d="M 165 268 C 292 268, 308 166, 430 166 C 544 166, 650 166, 770 166 C 895 166, 912 268, 1035 268"
        stroke="url(#arch-flow-line)"
        strokeWidth="1.4"
        strokeDasharray="6 8"
      />

      <path
        id="arch-flow-b"
        d="M 165 338 C 300 338, 318 370, 430 370 C 544 370, 650 370, 770 370 C 885 370, 902 338, 1035 338"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.2"
        strokeDasharray="5 8"
      />

      <circle r="3.4" fill="rgba(59,142,244,0.95)">
        <animateMotion
          dur="6.5s"
          repeatCount="indefinite"
          path="M 165 268 C 292 268, 308 166, 430 166 C 544 166, 650 166, 770 166 C 895 166, 912 268, 1035 268"
        />
      </circle>

      <circle r="3" fill="rgba(255,255,255,0.8)">
        <animateMotion
          dur="7.2s"
          begin="1.2s"
          repeatCount="indefinite"
          path="M 165 338 C 300 338, 318 370, 430 370 C 544 370, 650 370, 770 370 C 885 370, 902 338, 1035 338"
        />
      </circle>
    </svg>
  );
}

function CardTopline({ index, tag }: { index: string; tag: string }) {
  return (
    <div className="mb-4 flex items-center justify-between text-[11px] font-mono">
      <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-400">
        {index}
      </span>
      <span className="uppercase tracking-[0.14em] text-zinc-500">{tag}</span>
    </div>
  );
}

function SystemActionPill({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 w-[112px] items-center justify-center gap-1 rounded-full border border-zinc-700/85 bg-zinc-900/90 px-2.5 font-mono text-[10px] font-medium whitespace-nowrap text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <span className="size-1.5 rounded-full bg-[#3b8ef4]" />
      {label}
    </span>
  );
}

export function Intelligence() {
  const sectionRef = useRef<HTMLElement>(null);
  const [buttonMode, setButtonMode] = useState<'dedup' | 'ack'>('dedup');
  const [mergedCount, setMergedCount] = useState(14);
  const [activeHypIdx, setActiveHypIdx] = useState(0);

  const activeHyp = HYPOTHESES[activeHypIdx] ?? HYPOTHESES[0]!;

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
      className="relative border-b border-[#222] bg-[#050608] overflow-hidden"
    >
      <div id="library-map" className="scroll-mt-20" />
      <Container>
        <div className="md:border-x border-[#222]">
          {/* ================================================================
              IntroBand (Exact Vengeance UI LandingPageGrid IntroBand)
             ================================================================ */}
          <div className="relative overflow-hidden border-b border-[#222] px-5 py-8 md:px-8 lg:px-10">
            <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3 py-1 text-[11px] font-medium text-zinc-400">
                  <span className="text-[#3b8ef4]">✦</span>
                  <span className="font-mono">Workflow preview · illustrative data</span>
                </div>

                <GsapTextReveal as="h2" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight text-left">
                  Build with ARCH Intelligence
                </GsapTextReveal>

                <p className="mt-2 max-w-2xl text-left font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Alert intake, native assistance and human review — one workspace. All examples below are illustrative, not live results.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="font-orbitron text-lg font-bold text-zinc-100 tnum">CPU-only</div>
                  <div className="font-mono text-[11px] text-zinc-500">Native model inference</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="font-orbitron text-lg font-bold text-[#3b8ef4] tnum">Human-led</div>
                  <div className="font-mono text-[11px] text-zinc-500">Review every suggestion</div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================
              PreviewMatrix (Exact Vengeance UI 3-Column 01/03 · 02/03 · 03/03)
             ================================================================ */}
          <div className="relative overflow-hidden border-b border-[#222]">
            <FlowLayer />

            <div className="relative z-10 grid grid-cols-1 divide-y divide-[#222] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {/* COLUMN 01/03: Alert Ingest Forge */}
              <div className="vui-matrix-card relative flex min-h-[390px] flex-col justify-between p-5 md:p-6">
                <div>
                  <CardTopline index="01/03" tag="Alert Ingest Forge" />
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
                    Interactive Deduplication Controls
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-zinc-400">
                    HMAC-SHA256 verified webhook intake that collapses alert storms into a single fingerprinted incident.
                  </p>
                </div>

                <div className="my-5 rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-3.5 shadow-[0_24px_72px_-48px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex rounded-lg border border-zinc-700/80 bg-zinc-900/90 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setButtonMode('dedup')}
                        className={cn(
                          'rounded-md px-2.5 py-1 font-mono font-medium transition-colors cursor-pointer',
                          buttonMode === 'dedup'
                            ? 'bg-zinc-200 text-zinc-900'
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
                            ? 'bg-zinc-200 text-zinc-900'
                            : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        Acknowledge
                      </button>
                    </div>

                    <span className="rounded-md border border-zinc-700/80 bg-zinc-900/90 px-2 py-0.5 font-mono text-[10px] text-[#3b8ef4]">
                      +{mergedCount} merged
                    </span>
                  </div>

                  <div className="mt-3 flex min-h-[142px] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800/90 bg-zinc-900/75 px-3 py-4">
                    {buttonMode === 'dedup' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setMergedCount((c) => c + 1)}
                          className="rounded-xl border border-zinc-700/85 bg-zinc-950/90 px-4 py-2.5 transition-colors hover:border-[#3b8ef4]/60 cursor-pointer"
                        >
                          <FlipTextWord text="DEDUPLICATE" />
                        </button>
                        <span className="font-mono text-[10px] text-zinc-500">
                          fingerprint: sha256(service + alert_rule + region)
                        </span>
                      </>
                    ) : (
                      <CreepyAckButton onTrigger={() => setMergedCount((c) => c + 1)} />
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
                  <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-400">
                    Alertmanager
                  </span>
                  <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-400">
                    Datadog
                  </span>
                  <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-400">
                    Sentry HMAC
                  </span>
                </div>
              </div>

              {/* COLUMN 02/03: Motion Kernel / ARCH V1.1 Native Engine */}
              <div className="vui-matrix-card relative flex min-h-[390px] flex-col justify-between bg-[radial-gradient(circle_at_50%_20%,rgba(59,142,244,0.06),transparent_62%)] p-5 md:p-6">
                <div>
                  <CardTopline index="02/03" tag="Native assistant" />
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
                    ARCH V1 Incident Assistant
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-zinc-400">
                    Classifies supplied incident context and retrieves similar examples using small local models, rules and templates. Suggestions can be wrong.
                  </p>
                </div>

                <div className="my-5 flex items-center justify-center">
                  <div className="relative flex h-56 w-full max-w-[330px] items-center justify-center">
                    <svg
                      viewBox="0 0 320 220"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M 160 110 L 66 44" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeDasharray="3 5" />
                      <path d="M 160 110 L 254 44" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeDasharray="3 5" />
                      <path d="M 160 110 L 52 170" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeDasharray="3 5" />
                      <path d="M 160 110 L 268 170" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeDasharray="3 5" />
                      <path d="M 160 110 L 160 22" stroke="rgba(59,142,244,0.45)" strokeWidth="1.2" strokeDasharray="3 5" />
                    </svg>

                    <div className="absolute h-44 w-44 rounded-full border border-zinc-800/90" />
                    <div className="absolute h-32 w-32 rounded-full border border-dashed border-zinc-700/80" />

                    {/* Vengeance UI motion-core-ring */}
                    <div className="motion-core-ring relative flex h-24 w-40 flex-col items-center justify-center rounded-2xl border border-zinc-600/85 bg-zinc-900/90 px-3 text-center shadow-[0_20px_50px_-30px_rgba(0,0,0,1)]">
                      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500">
                        Engine
                      </span>
                      <span className="mt-1 font-mono text-xs font-semibold text-zinc-100">
                        ARCH V1
                        <span className="motion-caret" />
                      </span>
                      <span className="mt-1 font-mono text-[10px] text-[#3b8ef4]">
                        Illustrative example
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveHypIdx(0)}
                      className={cn(
                        'absolute top-4 left-3 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors cursor-pointer',
                        activeHypIdx === 0
                          ? 'border-[#3b8ef4] bg-[#3b8ef4]/15 text-[#3b8ef4]'
                          : 'border-zinc-700/80 bg-zinc-900/90 text-zinc-300'
                      )}
                    >
                      pg-primary
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveHypIdx(1)}
                      className={cn(
                        'absolute top-4 right-3 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors cursor-pointer',
                        activeHypIdx === 1
                          ? 'border-[#3b8ef4] bg-[#3b8ef4]/15 text-[#3b8ef4]'
                          : 'border-zinc-700/80 bg-zinc-900/90 text-zinc-300'
                      )}
                    >
                      webhooks
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveHypIdx(2)}
                      className={cn(
                        'absolute bottom-4 left-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors cursor-pointer',
                        activeHypIdx === 2
                          ? 'border-[#3b8ef4] bg-[#3b8ef4]/15 text-[#3b8ef4]'
                          : 'border-zinc-700/80 bg-zinc-900/90 text-zinc-300'
                      )}
                    >
                      auth-svc
                    </button>
                    <span className="absolute right-1.5 bottom-4 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-2.5 py-1 font-mono text-[10px] text-zinc-300">
                      checkout
                    </span>
                    <span className="absolute top-0.5 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-2.5 py-1 font-mono text-[10px] text-[#3b8ef4]">
                      v2.18.4
                    </span>
                  </div>
                </div>

                {/* Selected Hypothesis Bar */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>SAMPLE #{activeHyp.rank}</span>
                    <span className="text-[#3b8ef4]">EXAMPLE ONLY</span>
                  </div>
                  <div className="mt-1 text-zinc-200 font-sans text-xs font-medium">
                    {activeHyp.title}
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500 truncate">{activeHyp.evidence}</div>
                </div>
              </div>

              {/* COLUMN 03/03: Runbook & Audit Composer */}
              <div className="vui-matrix-card relative flex min-h-[390px] flex-col justify-between p-5 md:p-6">
                <div>
                  <CardTopline index="03/03" tag="Incident Composer" />
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
                    From Alert to Signed Audit Ledger
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-zinc-400">
                    State-machine transitions, Slack/Status broadcasts, and postmortem synthesis wired into one bus.
                  </p>
                </div>

                <div className="my-5 rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="relative h-48 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3">
                    <svg
                      viewBox="0 0 360 190"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      fill="none"
                      aria-hidden="true"
                    >
                      <line x1="112" y1="32" x2="146" y2="74" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                      <line x1="112" y1="95" x2="132" y2="95" stroke="rgba(59,142,244,0.45)" strokeWidth="1.2" />
                      <line x1="112" y1="158" x2="146" y2="116" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                      <line x1="248" y1="32" x2="214" y2="74" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                      <line x1="248" y1="95" x2="228" y2="95" stroke="rgba(59,142,244,0.45)" strokeWidth="1.2" />
                      <line x1="248" y1="158" x2="214" y2="116" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                    </svg>

                    <div className="relative z-10 flex h-full items-center justify-between gap-2">
                      <div className="flex flex-col gap-2">
                        <SystemActionPill label="State Machine" />
                        <SystemActionPill label="Audit SHA-256" />
                        <SystemActionPill label="Status 90d" />
                      </div>

                      <div className="flex h-16 w-28 flex-col items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/90 text-center shadow-[0_16px_34px_-22px_rgba(0,0,0,1)]">
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
