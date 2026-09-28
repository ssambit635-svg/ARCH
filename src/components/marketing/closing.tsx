'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Reveal } from './reveal';
import { AI_NAME, PRODUCT_NAME } from '@/lib/brand';

/**
 * The closing run: what points alerts at ARCH, the final call to action, and a footer dense enough
 * to be a sitemap.
 *
 * Attribution lives in the footer on purpose. The hero footage is Pexels-licensed and the rack
 * models are CC-BY from Sketchfab — CC-BY *requires* credit, and burying it in a source comment is
 * not credit. Both are named here and in the HUD of the stage that uses them.
 */

/* ---- Integrations marquee ------------------------------------------------ */

const SOURCES_ROW_A = ['Grafana', 'Prometheus', 'Alertmanager', 'Sentry', 'GitHub', 'AWS CloudWatch'];
const SOURCES_ROW_B = ['Uptime Robot', 'Healthchecks', 'Nagios', 'Zabbix', 'custom script', 'anything with a webhook'];

function MarqueeRow({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  // The row is duplicated so the -50% translate loops seamlessly; aria-hidden on the copy.
  const doubled = [...items, ...items];
  return (
    <div className="arch-marquee-mask relative flex overflow-hidden py-3">
      <div
        className={`flex shrink-0 items-center gap-10 pr-10 ${reverse ? 'animate-marquee-rev' : 'animate-marquee'}`}
        style={{ animationPlayState: 'running' }}
      >
        {doubled.map((item, index) => (
          <span
            key={`${item}-${index}`}
            aria-hidden={index >= items.length ? 'true' : undefined}
            className="arch-mono flex shrink-0 items-center gap-3 text-[13px] tracking-[0.06em] text-ash-500 transition-colors duration-300 hover:text-bone"
          >
            <span className="size-1 rounded-full bg-ash-700" aria-hidden />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Integrations() {
  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.07] bg-ink-1000 py-14"
      aria-label="Alert sources"
    >
      <div className="mx-auto mb-8 max-w-[1400px] px-5 sm:px-8">
        <Reveal variant="fade">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="arch-mono flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-500">
              <span className="block h-px w-8 bg-signal-500" aria-hidden />
              ingestion
            </p>
            <p className="max-w-[34rem] text-[13px] leading-relaxed text-ash-500">
              There is no integration catalogue to wait on. If it can POST JSON with a valid HMAC
              signature, ARCH will open an incident from it — these are the sources teams point at it
              first.
            </p>
          </div>
        </Reveal>
      </div>

      <MarqueeRow items={SOURCES_ROW_A} />
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="h-px w-full bg-white/[0.06]" aria-hidden />
      </div>
      <MarqueeRow items={SOURCES_ROW_B} reverse />
    </section>
  );
}

/* ---- Closing CTA --------------------------------------------------------- */

export function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.07] bg-ink-950">
      <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 70% at 50% 100%, rgb(59 130 246 / 0.06), transparent 68%)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8 lg:py-36">
        <Reveal variant="fade">
          <p className="arch-mono mb-7 inline-flex items-center gap-2.5 rounded-md border border-white/[0.09] bg-white/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-ash-500">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-signal-500" aria-hidden />
            {AI_NAME} · ready on first boot
          </p>
        </Reveal>

        <Reveal variant="mask" duration={1100}>
          <h2 className="arch-display mx-auto max-w-[16ch] text-[clamp(2.4rem,6.4vw,5rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-bone">
            The next incident is already on the calendar.
          </h2>
        </Reveal>

        <Reveal variant="rise" delay={160}>
          <p className="mx-auto mt-7 max-w-[38rem] text-[15.5px] leading-[1.75] text-ash-400">
            It just does not have a date on it yet. In five minutes you can have a webhook endpoint, a
            status page, an on-call trail and an engine that has started learning from your first
            resolved incident.
          </p>
        </Reveal>

        <Reveal variant="rise" delay={260}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              data-cursor="start"
              className="arch-sheen group inline-flex items-center gap-2.5 rounded-lg bg-bone px-7 py-4 text-[15px] font-semibold text-ink-1000 shadow-[0_1px_0_0_rgb(255_255_255/0.55)_inset,0_20px_44px_-22px_rgb(0_0_0/0.95)] transition-all duration-300 hover:bg-white active:scale-[0.985]"
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
              className="inline-flex items-center gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.03] px-6 py-4 text-[15px] font-medium text-bone transition-all duration-300 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <span className="size-1.5 rounded-full bg-state-ok" aria-hidden />
              See a live status page
            </Link>
          </div>
        </Reveal>

        <Reveal variant="fade" delay={340}>
          <p className="arch-mono mt-7 text-[10.5px] uppercase tracking-[0.14em] text-ash-600">
            free to start · no card · your data never leaves your server
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- Footer -------------------------------------------------------------- */

const COLUMNS: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Lifecycle', href: '#lifecycle' },
      { label: AI_NAME, href: '#intelligence' },
      { label: 'Topology', href: '#topology' },
      { label: 'Platform', href: '#platform' },
      { label: 'Deploy', href: '#deploy' },
    ],
  },
  {
    heading: 'Try it',
    links: [
      { label: 'Create organization', href: '/register' },
      { label: 'Sign in', href: '/login' },
      { label: 'Live status page', href: '/status/demo' },
      { label: 'API health', href: '/api/health' },
    ],
  },
  {
    heading: 'Engineering',
    links: [
      { label: 'Repository', href: 'https://github.com/ssambit635-svg/ARCH', external: true },
      { label: 'Contributing', href: 'https://github.com/ssambit635-svg/ARCH/blob/main/CONTRIBUTING.md', external: true },
      { label: 'Security policy', href: 'https://github.com/ssambit635-svg/ARCH/blob/main/SECURITY.md', external: true },
      { label: 'Changelog', href: 'https://github.com/ssambit635-svg/ARCH/blob/main/CHANGELOG.md', external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-ink-1000">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Logo />
            <p className="mt-5 max-w-[26rem] text-[13px] leading-relaxed text-ash-500">
              Multi-tenant incident management and public status pages for developer teams, with a
              native on-call engine compiled into the repository. Self-hosted by design.
            </p>

            {/* Asset attribution — the licences these assets ship under ask for exactly this. */}
            <div className="mt-7 rounded-lg border border-white/[0.07] bg-white/[0.015] p-4">
              <p className="arch-mono mb-2.5 text-[9.5px] uppercase tracking-[0.16em] text-ash-600">assets & attribution</p>
              <ul className="arch-mono space-y-1.5 text-[10px] leading-relaxed tracking-[0.02em] text-ash-600">
                <li>
                  <span className="text-ash-500">footage</span> · James Cheney, MrColo — Pexels licence
                </li>
                <li>
                  <span className="text-ash-500">3d models</span> · EntropyNine, themighty808, FlevasGR —{' '}
                  <a
                    href="https://sketchfab.com"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-white/15 underline-offset-2 transition hover:text-signal-300"
                  >
                    Sketchfab
                  </a>{' '}
                  CC BY
                </li>
                <li>
                  <span className="text-ash-500">type</span> · Space Grotesk, Inter, JetBrains Mono — OFL 1.1, self-hosted
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <p className="arch-mono mb-4 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ash-600">
                  {column.heading}
                </p>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          data-cursor
                          className="group inline-flex items-center gap-1.5 text-[13px] text-ash-400 transition-colors duration-250 hover:text-bone"
                        >
                          {link.label}
                          <span className="text-[9px] text-ash-700 transition-colors group-hover:text-signal-500" aria-hidden>
                            ↗
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          prefetch={link.href.startsWith('#') ? undefined : false}
                          data-cursor
                          className="text-[13px] text-ash-400 transition-colors duration-250 hover:text-bone"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6">
          <p className="arch-mono text-[10.5px] tracking-[0.06em] text-ash-600">
            © {new Date().getFullYear()} {PRODUCT_NAME} · incident response · v0.3.0
          </p>
          <p className="arch-mono flex items-center gap-2 text-[10.5px] tracking-[0.06em] text-ash-600">
            <span className="size-1.5 rounded-full bg-state-ok" aria-hidden />
            all systems operational
          </p>
        </div>
      </div>

      {/* Oversized wordmark, cropped by the viewport — the last thing on the page is the mark. */}
      <div className="pointer-events-none relative -mb-[3.2vw] select-none overflow-hidden" aria-hidden>
        <p className="arch-display whitespace-nowrap text-center text-[19vw] font-semibold leading-[0.72] tracking-[-0.06em] text-white/[0.035]">
          ARCH
        </p>
      </div>
    </footer>
  );
}
