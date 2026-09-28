'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { HeroVideo } from './hero-video';
import { Reveal } from './reveal';
import { ScrambleText } from './scramble-text';
import { Sparkline } from '@/components/ui/sparkline';
import { usePrefersReducedMotion, useViewportWidth } from '@/lib/motion';
import { useBooted } from './boot-gate';
import { AI_NAME } from '@/lib/brand';

/**
 * Hero.
 *
 * Composition is deliberately asymmetric and layered, in this order back to front:
 *
 *   1. Real footage — a storm rolling in at twilight (see hero-video.tsx for sourcing and the
 *      degradation chain). Graded, vignetted, drifting on a slow Ken Burns.
 *   2. The live WebGL topology — a service graph with one node failing and the failure walking
 *      downstream. This is the product's thesis rendered in space.
 *   3. Type. Left-aligned, display face, enormous, revealed by line-mask. One word decodes.
 *   4. A telemetry rail pinned to the bottom edge — the "this system is running right now" cue.
 *
 * Nothing here glows. Depth comes from the footage, the specular on machined metal, hairlines and
 * elevation. The only saturated colour in the whole hero is severity red on the failing node.
 */

/** The topology scene is ~600kB of three.js. It is client-only and lazy, so the shell paints and
 *  the footage starts before a single WebGL byte is parsed. */
const TopologyScene = dynamic(() => import('./topology-scene').then((mod) => mod.TopologyScene), {
  ssr: false,
  loading: () => <div className="size-full" aria-hidden />,
});

const TELEMETRY: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  /** Direction the metric is trending; drives the arrow, not a colour wash. */
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

/** A deterministic-ish wobble so the rail feels instrumented without lying about real data. */
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
          // Two layered sines plus a small per-tick jitter: smooth enough to read as a real curve,
          // irregular enough not to look generated.
          const base = Math.sin((i + metric.seed) * 0.52) * 0.5 + Math.sin((i + metric.seed) * 0.19) * 0.32;
          const jitter = Math.sin((i * 3.7 + tick * 2.3 + metric.seed) * 1.7) * 0.18;
          return 50 + (base + jitter) * 34;
        }),
      ),
    [tick],
  );

  return { tick, series };
}

/** T+00:42 on the active incident. A clock that actually runs is the cheapest possible proof of life. */
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

/**
 * Hairlines for one telemetry cell.
 *
 * Two columns on phones, three on tablets, five on desktop — so which edges a cell owns depends on
 * the breakpoint. Working it out in one place keeps the JSX readable and guarantees no doubled
 * hairline or missing divider at any width.
 */
function cellBorder(index: number, total: number): string {
  const isLast = index === total - 1;
  return [
    // Phones: 2-up. Right edge on the left column, bottom edge on every row but the last.
    index % 2 === 0 ? 'border-r' : '',
    index < total - (total % 2 === 0 ? 0 : 1) ? 'border-b' : '',
    // Tablets: 3-up.
    index % 3 !== 2 && !isLast ? 'sm:border-r' : '',
    index < total - (total % 3 === 0 ? 0 : total % 3) ? 'sm:border-b' : '',
    // Desktop: all five on one row, so only vertical dividers remain.
    !isLast ? 'lg:border-r' : '',
    'lg:border-b-0',
    // Tailwind needs the colour declared once per element, not per edge.
    'border-white/[0.07]',
  ]
    .filter(Boolean)
    .join(' ');
}

function TrendArrow({ trend, good }: { trend: 'up' | 'down' | 'flat'; good: boolean }) {
  if (trend === 'flat') {
    return <span className="arch-mono text-[10px] text-ash-600">—</span>;
  }
  return (
    <span className={`arch-mono text-[10px] ${good ? 'text-state-ok' : 'text-sev-high'}`}>
      {trend === 'up' ? '▲' : '▼'}
    </span>
  );
}

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const width = useViewportWidth();
  const booted = useBooted();
  const { series } = useLiveRail(reduced);
  const elapsed = useElapsed(reduced);

  // The graph needs room to be legible. Below ~900px it would sit behind the type and cost frames
  // for nothing, so the footage carries the hero alone on phones.
  const showScene = !reduced && width >= 900;

  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden" aria-label="ARCH">
      <HeroVideo />

      {/* 3D topology. Masked towards the right so it never competes with the headline, and it fades
          in only once the context has compiled — a half-built first frame is worse than a late one. */}
      {showScene && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] animate-fade-in"
          style={{
            maskImage: 'linear-gradient(100deg, transparent 26%, black 62%)',
            WebkitMaskImage: 'linear-gradient(100deg, transparent 26%, black 62%)',
            animationDuration: '1600ms',
            animationDelay: '500ms',
            animationFillMode: 'both',
          }}
          aria-hidden
        >
          <TopologyScene className="size-full" cameraZ={12.4} />
        </div>
      )}

      {/* Hairline grid over the footage: ties the hero to the rest of the page's engineering-paper
          language and stops the video from reading as a photograph dropped behind some text. */}
      <div className="arch-grid-fine pointer-events-none absolute inset-0 z-[3] opacity-[0.35]" aria-hidden />

      {/* ---- Content ------------------------------------------------------ */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1400px] flex-col justify-end px-5 pb-0 pt-32 sm:px-8">
        <div className="max-w-[min(58rem,100%)] pb-10 sm:pb-14">
          {/* Active incident chip — the first thing that tells you this is a live system. */}
          <Reveal variant="fade" duration={700}>
            <div className="mb-7 inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-white/[0.09] bg-ink-950/70 px-3 py-1.5 backdrop-blur-md">
              <span className="relative flex size-1.5 shrink-0">
                {!reduced && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-sev-critical/70" aria-hidden />
                )}
                <span className="relative inline-flex size-1.5 rounded-full bg-sev-critical" />
              </span>
              <span className="arch-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-sev-critical">sev1</span>
              <span className="h-3 w-px bg-white/[0.12]" aria-hidden />
              <span className="arch-mono text-[10.5px] tracking-[0.08em] text-ash-300">
                checkout-api · p99 <span className="arch-tabular text-bone">4.21s</span> · eu-west
              </span>
              <span className="h-3 w-px bg-white/[0.12]" aria-hidden />
              <span className="arch-mono arch-tabular text-[10.5px] tracking-[0.08em] text-ash-400">{elapsed}</span>
              <span className="h-3 w-px bg-white/[0.12]" aria-hidden />
              <span className="arch-mono text-[10.5px] uppercase tracking-[0.14em] text-signal-300">{AI_NAME} triaging</span>
            </div>
          </Reveal>

          {/* Headline — three lines behind overflow clips, translating up on a stagger. */}
          <h1 className="arch-display text-[clamp(2.9rem,8.4vw,7.4rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-bone">
            <Reveal as="span" variant="none" duration={0} className="line-mask">
              <span style={{ transitionDelay: '120ms' }}>The room</span>
            </Reveal>
            <Reveal as="span" variant="none" duration={0} className="line-mask">
              <span style={{ transitionDelay: '230ms' }}>where the incident</span>
            </Reveal>
            <Reveal as="span" variant="none" duration={0} className="line-mask">
              <span style={{ transitionDelay: '340ms' }} className="text-signal-500">
                <ScrambleText text="ends." speed={2.1} startDelay={420} play={!reduced && booted} />
              </span>
            </Reveal>
          </h1>

          <Reveal variant="rise" delay={560} duration={900}>
            <p className="mt-7 max-w-[38rem] text-pretty text-[15px] leading-[1.72] text-ash-300 sm:text-[17px]">
              One alert lands and ARCH carries it the whole distance — incident opened, responder
              assigned, timeline running, status page published, audit trail sealed in the same
              transaction. Self-hosted. One native engine compiled into the
              repository — no vendor, no API key, no second model to disagree with. Not one byte of
              your incident leaves your infrastructure.
            </p>
          </Reveal>

          <Reveal variant="rise" delay={680} duration={900}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                data-cursor="start"
                className="arch-sheen group inline-flex items-center gap-2.5 rounded-lg bg-bone px-6 py-3.5 text-[15px] font-semibold text-ink-1000 shadow-[0_1px_0_0_rgb(255_255_255/0.55)_inset,0_18px_40px_-20px_rgb(0_0_0/0.95)] transition-all duration-300 hover:bg-white active:scale-[0.985]"
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
                className="group inline-flex items-center gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.03] px-5.5 py-3.5 text-[15px] font-medium text-bone backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/[0.07]"
              >
                <span className="size-1.5 rounded-full bg-state-ok" aria-hidden />
                See a live status page
              </Link>
              <span className="arch-mono ml-1 hidden text-[10.5px] uppercase tracking-[0.12em] text-ash-600 sm:inline">
                free · no card · 5 min to first page
              </span>
            </div>
          </Reveal>
        </div>

        {/* ---- Telemetry rail ---------------------------------------------
         * Full-bleed, hairline-divided, tabular figures. This is the Cloudflare/Grafana DNA: dense,
         * scannable, and it makes the hero a *console* rather than a poster. */}
        <Reveal variant="fade" delay={820} duration={1000} className="relative">
          <div className="-mx-5 grid grid-cols-2 border-t border-white/[0.08] bg-ink-1000/55 backdrop-blur-md sm:-mx-8 sm:grid-cols-3 lg:grid-cols-5">
            {TELEMETRY.map((metric, index) => (
              <div
                key={metric.label}
                className={`group relative border-white/[0.07] px-5 py-4 transition-colors duration-300 hover:bg-white/[0.028] sm:px-7 sm:py-5 ${cellBorder(index, TELEMETRY.length)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="arch-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ash-500">
                    {metric.label}
                  </p>
                  <TrendArrow trend={metric.trend} good={metric.trend === 'flat' ? false : metric.trend === 'down' === metric.goodWhenDown} />
                </div>
                <p className="arch-display arch-tabular mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] text-bone sm:text-[30px]">
                  {metric.value}
                  {metric.unit && <span className="ml-0.5 text-[0.5em] font-medium text-ash-500">{metric.unit}</span>}
                </p>
                <div className="mt-2.5 flex items-end justify-between gap-3">
                  <p className="arch-mono text-[9.5px] leading-tight tracking-[0.04em] text-ash-600">{metric.hint}</p>
                  <span className="opacity-45 transition-opacity duration-300 group-hover:opacity-90">
                    <Sparkline points={series[index] ?? []} width={62} height={20} strokeWidth={1.3} />
                  </span>
                </div>
                {/* Hover rule — the cell announces itself with a drawn edge, not a glow. */}
                <span
                  className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-signal-500 transition-transform duration-500 ease-out group-hover:scale-x-100"
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-24 right-5 z-10 hidden items-center gap-2.5 sm:right-8 lg:flex" aria-hidden>
        <span className="arch-mono arch-vertical text-[9.5px] uppercase tracking-[0.28em] text-ash-600">scroll</span>
        <span className="relative block h-14 w-px overflow-hidden bg-white/[0.12]">
          {!reduced && <span className="arch-scroll-cue absolute inset-x-0 top-0 block h-4 bg-signal-500" />}
        </span>
      </div>
    </section>
  );
}
