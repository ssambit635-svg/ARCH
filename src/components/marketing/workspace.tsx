'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container, cn } from './vui-primitives';
import { GsapTextReveal } from './gsap-reveal';

const TIMELINE = [
  { time: '03:12:04', kind: 'alert', text: 'Alerts fingerprinted into INC-204 (SEV-1)' },
  { time: '03:12:06', kind: 'action', text: 'lead-sre paged · acknowledged in 01m 14s' },
  { time: '03:12:19', kind: 'ai', text: 'ARCH V1: possible database lock — review the evidence' },
  { time: '03:18:19', kind: 'status', text: 'IDENTIFIED → rollback suggested, blast radius 3 services' },
] as const;

export function Workspace() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.workspace-reveal',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="workspace"
      ref={sectionRef}
      className="relative border-b border-[#182438] bg-[#04070e] overflow-hidden"
    >
      <Container>
        <div className="md:border-x border-[#182438]">
          {/* Header */}
          <div className="workspace-reveal flex flex-col gap-4 border-b border-[#182438] px-5 py-10 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#182438] bg-[#070d19] px-3 py-1 font-mono text-[11px] font-medium text-[#3b8ef4]">
                <span>INCIDENT CONSOLE PREVIEW</span>
              </div>
              <GsapTextReveal
                as="h2"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight text-left"
              >
                One console for every incident
              </GsapTextReveal>
              <p className="mt-2 max-w-xl font-mono text-xs sm:text-sm text-zinc-400">
                Queue, timeline, and root cause — sample data below.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#3b8ef4] px-4 text-xs font-semibold text-[#04070e] transition-colors hover:bg-[#64a8ff]"
              >
                <span>Open Console</span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Console shell */}
          <div className="workspace-reveal bg-[#060a14]">
            <div className="flex items-center justify-between gap-2 border-b border-[#182438] bg-[#070d19] px-4 py-2.5 font-mono text-[11px] text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="text-[#3b8ef4]">//</span>
                <span className="text-zinc-300">
                  arch.internal / incidents / <strong className="text-white">INC-204</strong>
                </span>
              </span>
              <span className="hidden rounded border border-[#182438] bg-[#04070e] px-2 py-0.5 text-[10px] text-[#3b8ef4] sm:inline">
                ARCH V1.1 READY
              </span>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[#182438] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Incident card */}
              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-white">INC-204</span>
                  <span className="rounded border border-[#3b8ef4]/35 bg-[#3b8ef4]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#3b8ef4]">
                    SEV-1 · IDENTIFIED
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-100 leading-snug">
                  Checkout API p99 latency &gt; 4.2s across eu-central-1
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-400">
                  Pool saturation on pg-primary-02 after deploy v2.18.4 · commander: Alex Mercer · MTTA 01m 14s
                </p>

                <div className="mt-4 rounded-xl border border-[#3b8ef4]/30 bg-[#3b8ef4]/[0.06] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#3b8ef4]">
                    Suggested cause · example
                  </div>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-zinc-300">
                    Unindexed foreign-key scan on orders_ledger → rollback checkout-api to v2.18.3.
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-5 md:p-6">
                <div className="pb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Timeline
                </div>
                <ol className="space-y-3">
                  {TIMELINE.map((event) => (
                    <li key={event.time} className="flex items-start gap-3">
                      <span className="mt-0.5 font-mono text-[10px] tabular-nums text-zinc-500">
                        {event.time}
                      </span>
                      <span
                        className={cn(
                          'mt-1 h-3 w-0.5 shrink-0 rounded-full',
                          event.kind === 'ai' || event.kind === 'status'
                            ? 'bg-[#3b8ef4]'
                            : 'bg-zinc-600'
                        )}
                      />
                      <span className="text-xs leading-relaxed text-zinc-300">{event.text}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href="/status/arch"
                  className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 transition-colors hover:text-[#3b8ef4]"
                >
                  <span>Public ledger: /status/arch →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
