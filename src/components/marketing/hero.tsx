'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HeroVideo } from './hero-video';
import { Reveal } from './reveal';
import { ScrambleText } from './scramble-text';
import { Sparkline } from '@/components/ui/sparkline';
import { usePrefersReducedMotion } from '@/lib/motion';
import { useBooted } from './boot-gate';
import { AI_NAME } from '@/lib/brand';
import { ArchitectureStage } from './architecture-stage';

const TELEMETRY: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  trend: 'up' | 'down' | 'flat';
  goodWhenDown: boolean;
  seed: number;
}[] = [
  { label: 'Open incidents', value: '2', hint: 'across 14 services', trend: 'up', goodWhenDown: true, seed: 7 },
  { label: 'MTTA', value: '48', unit: 's', hint: 'median, last 24h', trend: 'down', goodWhenDown: true, seed: 21 },
  { label: 'MTTR', value: '26', unit: 'm', hint: 'p90, last 30d', trend: 'down', goodWhenDown: true, seed: 33 },
  { label: 'Error budget', value: '71.4', unit: '%', hint: 'checkout-api · 30d', trend: 'flat', goodWhenDown: false, seed: 48 },
  { label: 'Audit coverage', value: '100', unit: '%', hint: 'of every write', trend: 'flat', goodWhenDown: false, seed: 62 },
];

function useLiveRail(reduced: boolean) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 2600);
    return () => window.clearInterval(id);
  }, [reduced]);

  const series = useMemo(
    () =>
      TELEMETRY.map((metric) =>
        Array.from({ length: 22 }, (_, i) => {
          const base = Math.sin((i + metric.seed) * 0.52) * 0.5 + Math.sin((i + metric.seed) * 0.19) * 0.32;
          const jitter = Math.sin((i * 3.7 + tick * 2.3 + metric.seed) * 1.7) * 0.18;
          return 50 + (base + jitter) * 34;
        }),
      ),
    [tick],
  );

  return { tick, series };
}

function useElapsed(reduced: boolean) {
  const [seconds, setSeconds] = useState(42);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setSeconds((value) => (value + 1) % 6000), 1000);
    return () => window.clearInterval(id);
  }, [reduced]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `T+${mm}:${ss}`;
}

function cellBorder(index: number, total: number): string {
  const isLast = index === total - 1;
  return [
    index % 2 === 0 ? 'border-r' : '',
    index < total - (total % 2 === 0 ? 0 : 1) ? 'border-b' : '',
    index % 3 !== 2 && !isLast ? 'sm:border-r' : '',
    index < total - (total % 3 === 0 ? 0 : total % 3) ? 'sm:border-b' : '',
    !isLast ? 'lg:border-r' : '',
    'lg:border-b-0',
    'border-white/[0.08]',
  ]
    .filter(Boolean)
    .join(' ');
}

function TrendArrow({ trend, good }: { trend: 'up' | 'down' | 'flat'; good: boolean }) {
  if (trend === 'flat') {
    return <span className="arch-mono text-[10px] text-ash-500">—</span>;
  }
  return (
    <span className={`arch-mono text-[10px] ${good ? 'text-emerald-400' : 'text-red-400'}`}>
      {trend === 'up' ? '▲' : '▼'}
    </span>
  );
}

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const booted = useBooted();
  const { series } = useLiveRail(reduced);
  const elapsed = useElapsed(reduced);

  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden" aria-label="ARCH">
      <HeroVideo />

      {/* Engineering hairline grid backdrop */}
      <div className="arch-grid-fine pointer-events-none absolute inset-0 z-[2] opacity-35" aria-hidden />

      {/* ---- Hero Content & Headline ---- */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pt-28 sm:px-8 sm:pt-36">
        <div className="max-w-[min(62rem,100%)] pb-8 sm:pb-12">
          {/* Active Incident Status Pill */}
          <Reveal variant="fade" duration={600}>
            <div className="mb-6 inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/[0.1] bg-slate-950/80 px-3.5 py-1.5 backdrop-blur-md shadow-lg">
              <span className="relative flex size-2 shrink-0">
                {!reduced && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70" aria-hidden />
                )}
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              <span className="arch-mono text-[11px] font-bold uppercase tracking-[0.14em] text-red-400">SEV-1 ALERT</span>
              <span className="h-3 w-px bg-white/[0.12]" aria-hidden />
              <span className="arch-mono text-[11px] tracking-[0.06em] text-ash-300">
                checkout-api · p99 <span className="arch-tabular font-semibold text-bone">4.21s</span> · eu-west-1
              </span>
              <span className="h-3 w-px bg-white/[0.12]" aria-hidden />
              <span className="arch-mono arch-tabular text-[11px] tracking-[0.06em] text-ash-400">{elapsed}</span>
              <span className="h-3 w-px bg-white/[0.12]" aria-hidden />
              <span className="arch-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-400" />
                {AI_NAME} Active Triage
              </span>
            </div>
          </Reveal>

          {/* Headline */}
          <h1 className="arch-display text-[clamp(2.8rem,7.5vw,6.4rem)] font-semibold leading-[0.94] tracking-[-0.04em] text-bone">
            <Reveal as="span" variant="none" duration={0} className="line-mask">
              <span style={{ transitionDelay: '100ms' }}>Mission control</span>
            </Reveal>
            <Reveal as="span" variant="none" duration={0} className="line-mask">
              <span style={{ transitionDelay: '200ms' }}>for modern developer</span>
            </Reveal>
            <Reveal as="span" variant="none" duration={0} className="line-mask">
              <span style={{ transitionDelay: '300ms' }} className="text-blue-500">
                <ScrambleText text="infrastructure." speed={2.0} startDelay={380} play={!reduced && booted} />
              </span>
            </Reveal>
          </h1>

          <Reveal variant="rise" delay={450} duration={800}>
            <p className="mt-6 max-w-[42rem] text-pretty text-[16px] leading-[1.7] text-ash-300 sm:text-[18px]">
              One alert lands and ARCH coordinates the entire incident lifecycle — opening the war room,
              computing real-time dependency blast radius, generating verified fixes in throwaway sandboxes,
              and sealing an immutable audit trail in the same transaction.
            </p>
          </Reveal>

          <Reveal variant="rise" delay={550} duration={800}>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/register"
                data-cursor="start"
                className="arch-sheen group inline-flex items-center gap-2.5 rounded-lg bg-blue-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_18px_36px_-18px_rgba(37,99,235,0.7)] transition-all duration-300 hover:bg-blue-500 active:scale-[0.985]"
              >
                Create your organization
                <span className="transition-transform duration-300 ease-out group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </Link>
              <Link
                href="/status/demo"
                prefetch={false}
                data-cursor="demo"
                className="group inline-flex items-center gap-2.5 rounded-lg border border-white/[0.12] bg-slate-900/60 px-5.5 py-3.5 text-[15px] font-medium text-bone backdrop-blur-md transition-all duration-300 hover:border-blue-500/40 hover:bg-slate-800/80"
              >
                <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
                View live status page
              </Link>
              <span className="arch-mono ml-2 hidden text-[11px] uppercase tracking-[0.14em] text-ash-500 sm:inline">
                Self-hosted · zero data egress · 5 min setup
              </span>
            </div>
          </Reveal>
        </div>

        {/* ---- Interactive 3D Architectural Centerpiece ---- */}
        <Reveal variant="rise" delay={650} duration={900} className="relative z-20 pb-12">
          <ArchitectureStage className="shadow-[0_24px_64px_-24px_rgba(0,0,0,0.95)]" />
        </Reveal>

        {/* ---- Telemetry Rail Bar ---- */}
        <Reveal variant="fade" delay={800} duration={900} className="relative">
          <div className="-mx-5 grid grid-cols-2 border-t border-white/[0.08] bg-slate-950/75 backdrop-blur-md sm:-mx-8 sm:grid-cols-3 lg:grid-cols-5">
            {TELEMETRY.map((metric, index) => (
              <div
                key={metric.label}
                className={`group relative border-white/[0.07] px-5 py-4 transition-colors duration-300 hover:bg-white/[0.025] sm:px-7 sm:py-5 ${cellBorder(index, TELEMETRY.length)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="arch-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ash-400">
                    {metric.label}
                  </p>
                  <TrendArrow
                    trend={metric.trend}
                    good={metric.trend === 'flat' ? false : metric.trend === 'down' === metric.goodWhenDown}
                  />
                </div>
                <p className="arch-display arch-tabular mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] text-bone sm:text-[30px]">
                  {metric.value}
                  {metric.unit && <span className="ml-0.5 text-[0.5em] font-medium text-ash-500">{metric.unit}</span>}
                </p>
                <div className="mt-2.5 flex items-end justify-between gap-3">
                  <p className="arch-mono text-[10px] leading-tight tracking-[0.04em] text-ash-500">{metric.hint}</p>
                  <span className="opacity-55 transition-opacity duration-300 group-hover:opacity-100">
                    <Sparkline points={series[index] ?? []} width={62} height={20} strokeWidth={1.4} />
                  </span>
                </div>
                <span
                  className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-blue-500 transition-transform duration-500 ease-out group-hover:scale-x-100"
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-20 right-5 z-10 hidden items-center gap-2.5 sm:right-8 lg:flex" aria-hidden>
        <span className="arch-mono arch-vertical text-[10px] uppercase tracking-[0.28em] text-ash-500">SCROLL</span>
        <span className="relative block h-14 w-px overflow-hidden bg-white/[0.12]">
          {!reduced && <span className="arch-scroll-cue absolute inset-x-0 top-0 block h-4 bg-blue-500" />}
        </span>
      </div>
    </section>
  );
}
