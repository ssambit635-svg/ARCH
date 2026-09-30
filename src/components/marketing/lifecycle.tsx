'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container, Heading, SubHeading, cn } from './vui-primitives';
import { GsapTextReveal } from './gsap-reveal';

interface Stage {
  step: string;
  tag: string;
  time: string;
  title: string;
  body: string;
  caption: string;
  lines: Array<{ label: string; value: string; tone?: 'accent' | 'ok' | 'crit' | 'muted' }>;
}

const STAGES: Stage[] = [
  {
    step: '01',
    tag: 'INGEST',
    time: '03:12:04 UTC',
    title: 'Duplicate alerts merge into one incident.',
    body: 'Prometheus, Datadog, Sentry, or any HTTP source can send signed alerts. Duplicates join the same incident.',
    caption: 'POST /api/webhooks/alerts · X-Arch-Signature: sha256=…',
    lines: [
      { label: 'SOURCE', value: 'prometheus / eu-central-1' },
      { label: 'FINGERPRINT', value: 'sha256:9c4a…e81b (14 merged)', tone: 'accent' },
      { label: 'INCIDENT', value: 'INC-204 · SEV-1 · INVESTIGATING', tone: 'crit' },
      { label: 'INGEST LATENCY', value: '18ms · 202 Accepted', tone: 'ok' },
    ],
  },
  {
    step: '02',
    tag: 'ROUTE',
    time: '03:12:06 UTC',
    title: 'Page the right on-call engineer.',
    body: 'ARCH checks service ownership, assigns the on-call, and records acknowledgement time.',
    caption: 'Service ownership → primary on-call → escalation policy',
    lines: [
      { label: 'SERVICE', value: 'checkout-api (tier-1 · commerce)' },
      { label: 'PRIMARY ON-CALL', value: 'lead-sre@arch.internal', tone: 'accent' },
      { label: 'ACKNOWLEDGED', value: '03:13:18 UTC · MTTA 01m 14s', tone: 'ok' },
      { label: 'AUDIT HASH', value: 'a94f1c…83d2 (signed)', tone: 'muted' },
    ],
  },
  {
    step: '03',
    tag: 'TRIAGE',
    time: '03:12:19 UTC',
    title: 'Find likely causes and affected services.',
    body: 'ARCH compares deployments, dependencies, and past incidents to surface evidence-backed causes.',
    caption: 'ARCH V1.1 · native root-cause correlation',
    lines: [
      { label: 'HYPOTHESIS #1', value: 'pg-primary-02 pool saturation (87%)', tone: 'accent' },
      { label: 'CORRELATED DEPLOY', value: 'checkout-api v2.18.4 (-6m)', tone: 'crit' },
      { label: 'BLAST RADIUS', value: '3 downstream services affected' },
      { label: 'SUGGESTED ACTION', value: 'Rollback migration #418', tone: 'ok' },
    ],
  },
  {
    step: '04',
    tag: 'RESOLVE & REVIEW',
    time: '03:18:19 UTC',
    title: 'Publish status and prepare a review.',
    body: 'Publish updates from the timeline, then create a postmortem with key events and action items.',
    caption: 'Status advisory + postmortem generated from the same timeline',
    lines: [
      { label: 'STATE TRANSITION', value: 'MONITORING → RESOLVED', tone: 'ok' },
      { label: 'MTTR', value: '06m 15s (SLO target < 15m)', tone: 'ok' },
      { label: 'PUBLIC STATUS', value: '/status/arch updated · 99.98% 90d', tone: 'accent' },
      { label: 'POSTMORTEM', value: 'Drafted with 4 timeline milestones' },
    ],
  },
];

export function Lifecycle() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const activeIdxRef = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (prefersReduced || !isDesktop || !sectionRef.current) return;

    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top+=64',
      end: '+=180%',
      pin: true,
      scrub: 0.35,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress;
        setProgress(p);
        const nextIdx = Math.min(STAGES.length - 1, Math.floor(p * STAGES.length));
        if (nextIdx !== activeIdxRef.current) {
          activeIdxRef.current = nextIdx;
          setActiveIdx(nextIdx);
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  const current = STAGES[activeIdx] ?? STAGES[0]!;

  return (
    <section
      id="lifecycle"
      ref={sectionRef}
      className="relative border-b border-[#222] bg-[#050608] overflow-hidden"
    >
      <Container>
        <div className="md:border-x border-[#222]">
          {/* Top Header */}
          <div className="flex flex-col gap-4 border-b border-[#222] px-5 py-10 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
                <span className="size-1.5 rounded-full bg-[#3b8ef4]" />
                <span>INCIDENT LIFECYCLE · 4 STAGES</span>
              </div>
              <GsapTextReveal as="h2" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight text-left">
                From Alert to Postmortem
              </GsapTextReveal>
              <p className="mt-2 max-w-2xl text-left font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Follow an alert through response, resolution, and review.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 font-mono text-xs text-zinc-400">
              <span>STAGE {current.step} / 04</span>
              <div className="h-1.5 w-36 overflow-hidden rounded-full bg-zinc-900 border border-zinc-800">
                <div
                  className="h-full bg-[#3b8ef4] transition-all duration-150"
                  style={{
                    width: `${Math.max((activeIdx + 1) * 25, Math.round(progress * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 12-Column Split: Left 4 Stages + Right Live Terminal Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#222]">
            {/* Left 6 Columns: 4 Stage Selector Cards */}
            <div className="lg:col-span-6 divide-y divide-[#222]">
              {STAGES.map((stage, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={stage.step}
                    type="button"
                    onClick={() => {
                      activeIdxRef.current = idx;
                      setActiveIdx(idx);
                    }}
                    className={cn(
                      'w-full text-left p-5 md:p-6 transition-colors cursor-pointer flex items-start gap-4',
                      isActive ? 'bg-[#0e1016]' : 'bg-[#050608] hover:bg-[#090a0e]'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold',
                        isActive
                          ? 'border-[#3b8ef4] bg-[#3b8ef4] text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      )}
                    >
                      {stage.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                        <span
                          className={cn(
                            'uppercase tracking-[0.14em]',
                            isActive ? 'text-[#3b8ef4] font-semibold' : 'text-zinc-500'
                          )}
                        >
                          {stage.tag}
                        </span>
                        <span className="text-zinc-500 tnum">{stage.time}</span>
                      </div>
                      <h3 className="mt-1 text-sm md:text-base font-semibold text-white">
                        {stage.title}
                      </h3>
                      {isActive && (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                          {stage.body}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right 6 Columns: Live Stage Telemetry Inspector */}
            <div className="lg:col-span-6 bg-[#08090c] p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#222] pb-4 font-mono text-xs">
                  <span className="inline-flex items-center gap-2 text-white font-semibold">
                    <span className="size-2 rounded-full bg-[#3b8ef4]" />
                    STAGE {current.step} · {current.tag}
                  </span>
                  <span className="text-zinc-400 tnum">{current.time}</span>
                </div>

                <h3 className="mt-5 font-orbitron text-xl md:text-2xl font-bold text-white leading-snug">
                  {current.title}
                </h3>
                <p className="mt-2.5 text-xs md:text-sm text-zinc-400 leading-relaxed">
                  {current.body}
                </p>

                {/* Terminal Output Box */}
                <div className="mt-6 rounded-2xl border border-[#222] bg-[#050608] p-4 shadow-[0_24px_72px_-48px_rgb(0,0,0),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="mb-3 flex items-center justify-between border-b border-[#191a20] pb-2.5 font-mono text-[11px] text-zinc-500">
                    <span>{current.caption}</span>
                    <span className="text-[#3b8ef4]">LIVE TRACE</span>
                  </div>
                  <div className="space-y-2.5 font-mono text-xs">
                    {current.lines.map((l) => (
                      <div
                        key={l.label}
                        className="flex items-center justify-between gap-4 rounded-lg border border-[#191a20] bg-[#0a0b0f] px-3 py-2"
                      >
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                          {l.label}
                        </span>
                        <span
                          className={cn(
                            'text-right font-medium',
                            l.tone === 'accent'
                              ? 'text-[#3b8ef4]'
                              : l.tone === 'ok'
                              ? 'text-ok-400'
                              : l.tone === 'crit'
                              ? 'text-crit-400'
                              : 'text-zinc-200'
                          )}
                        >
                          {l.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[#222] pt-4 font-mono text-[11px] text-zinc-500">
                <span>Deterministic transitions · zero manual spreadsheet handoffs</span>
                <span className="text-zinc-300">MTTA 01m 14s · MTTR 06m 15s</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
