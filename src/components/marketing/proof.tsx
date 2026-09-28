'use client';

import { useEffect, useRef, useState } from 'react';
import { Reveal } from './reveal';
import { usePrefersReducedMotion } from '@/lib/motion';

/**
 * Proof — the numbers, and the boundary.
 *
 * Two halves, because a serious product page needs both:
 *
 *   1. Counters that animate up when they enter the viewport. Every figure is traceable to the
 *      repository — the audit guarantee, the native model's latency band, the pattern library's
 *      size, the number of services ARCH needs you to run.
 *   2. "What ARCH is not", lifted from README.md. Naming the boundary is the single most credible
 *      thing a tool page can do, and it is why the rest of the page gets believed.
 */

function Counter({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1500,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          const start = performance.now();
          const tick = (now: number) => {
            const raw = Math.min(1, (now - start) / duration);
            // Ease-out cubic: the number arrives quickly and settles, which reads as an instrument
            // taking a measurement rather than a slot machine.
            const eased = 1 - Math.pow(1 - raw, 3);
            setValue(to * eased);
            if (raw < 1) raf = requestAnimationFrame(tick);
            else setValue(to);
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration, reduced]);

  return (
    <span ref={ref} className="arch-tabular">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

const STATS: {
  render: () => React.ReactNode;
  label: string;
  note: string;
}[] = [
  {
    render: () => <Counter to={0} />,
    label: 'incident bytes sent to a vendor',
    note: 'the native engine cannot make a network call',
  },
  {
    render: () => <Counter to={100} suffix="%" />,
    label: 'of writes covered by the audit log',
    note: 'same transaction — there is no path that skips it',
  },
  {
    render: () => <span className="arch-tabular">5–100<span className="ml-1 text-[0.42em] font-medium text-ash-500">ms</span></span>,
    label: 'native model latency',
    note: 'no round trip, no queue, no rate limit to wait on',
  },
  {
    render: () => <Counter to={1} />,
    label: 'service you have to operate',
    note: 'PostgreSQL 16. The outbox is a table, not a broker',
  },
  {
    render: () => <Counter to={44} />,
    label: 'failure patterns, 22 categories',
    note: 'an original library, so it knows things on day one',
  },
  {
    render: () => <Counter to={4} />,
    label: 'roles, enforced on every request',
    note: 'the UI only hides what the API would refuse anyway',
  },
];

const NOT_ARCH = [
  'a general-purpose chatbot',
  'a code generator',
  'an IDE',
  'a debugger',
  'a hosting platform',
  'a CI/CD system',
  'a Kubernetes manager',
  'a billing system',
  'a replacement for GitHub',
  'a replacement for Slack',
  'a replacement for your cloud',
  'an AI model vendor',
];

export function Proof() {
  return (
    <section
      className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.07] bg-ink-1000"
      aria-label="What ARCH guarantees, and what it is not"
    >
      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
        {/* ---- Counters ---- */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} variant="fade" delay={index * 70} duration={800} className="bg-ink-1000">
              <div className="group h-full px-6 py-7 transition-colors duration-400 hover:bg-ink-900 sm:px-7 sm:py-8">
                <p className="arch-display text-[clamp(2.4rem,5vw,3.4rem)] font-semibold leading-[0.86] tracking-[-0.045em] text-bone">
                  {stat.render()}
                </p>
                <p className="mt-4 text-[13.5px] font-medium leading-snug text-ash-300">{stat.label}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ash-600">{stat.note}</p>
                <span
                  className="mt-5 block h-px w-full origin-left scale-x-0 bg-signal-500/60 transition-transform duration-700 ease-out group-hover:scale-x-100"
                  aria-hidden
                />
              </div>
            </Reveal>
          ))}
        </div>

        {/* ---- The boundary ---- */}
        <div className="mt-20 grid grid-cols-1 gap-12 lg:mt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
          <div>
            <Reveal variant="fade">
              <p className="arch-mono mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-500">
                <span className="block h-px w-8 bg-signal-500" aria-hidden />
                scope
              </p>
            </Reveal>
            <Reveal variant="mask" duration={1000}>
              <h2 className="arch-display max-w-[22ch] text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-[1] tracking-[-0.04em] text-bone">
                What ARCH is not.
              </h2>
            </Reveal>
            <Reveal variant="rise" delay={120}>
              <p className="mt-6 max-w-[36rem] text-[15px] leading-[1.75] text-ash-400">
                Deliberately out of scope, and written down so the product stays fast and honest. A
                tool that claims to do everything cannot be trusted to do the one thing you are
                paging someone at 3am for.
              </p>
            </Reveal>

            <Reveal variant="rise" delay={200}>
              <ul className="mt-8 flex flex-wrap gap-2">
                {NOT_ARCH.map((item) => (
                  <li
                    key={item}
                    className="arch-mono group flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] tracking-[0.03em] text-ash-400 transition-colors duration-300 hover:border-white/[0.18] hover:text-ash-200"
                  >
                    <span className="text-ash-700 transition-colors duration-300 group-hover:text-sev-critical" aria-hidden>
                      ✕
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* The stack, stated plainly — the buyer's real question. */}
          <Reveal variant="rise" delay={240} duration={1000}>
            <div className="arch-panel overflow-hidden">
              <p className="arch-mono border-b border-white/[0.07] bg-white/[0.02] px-5 py-2.5 text-[9.5px] uppercase tracking-[0.16em] text-ash-500">
                the stack
              </p>
              <dl className="arch-mono divide-y divide-white/[0.06] text-[11.5px]">
                {[
                  ['language', 'TypeScript (strict)'],
                  ['framework', 'Next.js App Router'],
                  ['styling', 'Tailwind CSS'],
                  ['database', 'PostgreSQL 16'],
                  ['orm', 'Prisma'],
                  ['validation', 'Zod'],
                  ['auth', 'Auth.js (NextAuth v5)'],
                  ['jobs', 'Postgres outbox + worker'],
                  ['ai', 'in-process, no adapter'],
                  ['cache layer', 'none required'],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-ash-600">{key}</dt>
                    <dd className="truncate text-right text-ash-200">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-white/[0.07] px-5 py-4 text-[12px] leading-relaxed text-ash-500">
                Nothing here needs a managed service you do not already run. If you have Postgres,
                you have ARCH.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
