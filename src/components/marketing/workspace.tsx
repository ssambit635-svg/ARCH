'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from './vui-primitives';
import { GsapTextReveal } from './gsap-reveal';
import { cn } from './vui-primitives';

/**
 * Slimmed-down live-console preview. One incident, one timeline, one AI hypothesis — the full
 * interactive demo moved out to keep the page light.
 */
const TIMELINE = [
  { time: '03:12:04', kind: 'alert', text: '14 alerts fingerprinted into INC-204 (SEV-1)' },
  { time: '03:12:06', kind: 'action', text: 'lead-sre paged · acknowledged in 01m 14s' },
  { time: '03:12:19', kind: 'ai', text: 'ARCH V1.1: 87% confidence — migration #418 lock' },
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
      className="relative border-b border-[#222] bg-[#050608] overflow-hidden"
    >
      <Container>
        <div className="md:border-x border-[#222]">
          {/* Header */}
          <div className="workspace-reveal flex flex-col gap-4 border-b border-[#222] px-5 py-10 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
                <span className="size-1.5 rounded-full bg-[#3b8ef4]" />
                <span>LIVE INCIDENT CONSOLE</span>
              </div>
              <GsapTextReveal
                as="h2"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight text-left"
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
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                <span>Open Console</span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Console shell */}
          <div className="workspace-reveal bg-[#08090c]">
            <div className="flex items-center justify-between gap-2 border-b border-[#222] bg-[#0b0c10] px-4 py-2.5 font-mono text-[11px] text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="ml-2 text-zinc-300">
                  arch.internal / incidents / <strong className="text-white">INC-204</strong>
                </span>
              </span>
              <span className="hidden rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-[#3b8ef4] sm:inline">
                ARCH V1.1 READY
              </span>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[#222] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Incident card */}
              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-white">INC-204</span>
                  <span className="rounded border border-crit-500/30 bg-crit-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-crit-400">
                    SEV-1 · IDENTIFIED
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  Checkout API p99 latency &gt; 4.2s across eu-central-1
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-400">
                  Pool saturation on pg-primary-02 after deploy v2.18.4 · commander: Alex Mercer · MTTA 01m 14s · 14 deduped
                </p>

                <div className="mt-4 rounded-xl border border-[#3b8ef4]/25 bg-[#3b8ef4]/[0.05] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#3b8ef4]">
                    AI hypothesis · 87%
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
                          'mt-1 size-1.5 shrink-0 rounded-full',
                          event.kind === 'ai'
                            ? 'bg-[#3b8ef4]'
                            : event.kind === 'alert'
                              ? 'bg-crit-400'
                              : event.kind === 'status'
                                ? 'bg-ok-400'
                                : 'bg-zinc-500'
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
                  <span className="size-1.5 rounded-full bg-ok-400 animate-pulse-dot" />
                  Public ledger: /status/arch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
