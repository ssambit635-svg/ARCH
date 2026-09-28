'use client';

import { useState } from 'react';
import { Reveal } from './reveal';

/**
 * Deploy — self-hosting, which is the actual differentiator.
 *
 * Every competitor on this page's comparison sells a hosted console you send your incident data to.
 * ARCH is a repository you run. So the section is a terminal with the real commands, copied from
 * README.md — not a stylised illustration of a terminal.
 *
 * `npm run dev` is the one command that has to work on a fresh machine: it generates the Prisma
 * client, reaches or starts a database, applies migrations and boots Next.js. That is worth saying
 * out loud on a marketing page, because it is the whole onboarding promise.
 */

const TABS = [
  {
    key: 'dev',
    label: 'Local dev',
    note: 'three commands on a fresh machine',
    lines: [
      { cmd: 'cp .env.example .env && chmod 600 .env', comment: 'set distinct random AUTH_SECRET / AUTH_SECRET_WEBHOOK' },
      { cmd: 'npm ci', comment: 'node >= 20.19' },
      { cmd: 'npm run dev', comment: 'prisma generate → postgres → migrate → next.js' },
      { cmd: 'npm run worker', comment: 'optional second terminal: notification outbox' },
    ],
    after: '# register at /register — no demo users are created automatically',
  },
  {
    key: 'docker',
    label: 'Docker',
    note: 'bring your own postgres:16-alpine',
    lines: [
      { cmd: 'docker compose up -d', comment: 'postgres on 127.0.0.1:5432, volume-backed' },
      { cmd: 'npm run setup', comment: 'generate client, apply migrations, stop embedded pg' },
      { cmd: 'npm run dev', comment: 'uses the running container instead of embedded' },
    ],
    after: '# there is no AI container to start — the engine runs in-process',
  },
  {
    key: 'prod',
    label: 'Production',
    note: 'the server does not migrate for you',
    lines: [
      { cmd: 'npm ci', comment: 'lockfile-exact' },
      { cmd: 'npm run db:generate', comment: 'prisma client into src/generated' },
      { cmd: 'npm run db:migrate', comment: 'run this BEFORE start — deploy does not' },
      { cmd: 'npm run build', comment: 'network-free: fonts are self-hosted' },
      { cmd: 'npm start', comment: 'next start --hostname 0.0.0.0' },
    ],
    after: '# managed postgres + a stable DATABASE_URL for anything durable',
  },
] as const;

const REQUIREMENTS = [
  ['runtime', 'Node.js ≥ 20.19'],
  ['database', 'PostgreSQL 16'],
  ['ai hardware', 'cpu — no gpu, no key'],
  ['egress', 'none required'],
  ['containers', '1 (or 0, embedded pg)'],
];

export function Deploy() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('dev');
  const [copied, setCopied] = useState(false);

  const active = TABS.find((entry) => entry.key === tab) ?? TABS[0]!;
  const script = [...active.lines.map((line) => line.cmd), active.after].join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API is blocked in some embedding contexts; the text is on screen either way.
      setCopied(false);
    }
  };

  return (
    <section
      id="deploy"
      className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.07] bg-ink-950"
      aria-label="Deploy ARCH"
    >
      <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-25" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px]"
        style={{ background: 'radial-gradient(70% 100% at 26% 100%, rgb(255 182 39 / 0.04), transparent 66%)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal variant="fade">
              <p className="arch-mono mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-500">
                <span className="block h-px w-8 bg-signal-500" aria-hidden />
                deploy
              </p>
            </Reveal>
            <Reveal variant="mask" duration={1000}>
              <h2 className="arch-display text-[clamp(2.1rem,4.4vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-bone">
                It is a repository,
                <br />
                not a subscription.
              </h2>
            </Reveal>
            <Reveal variant="rise" delay={120}>
              <p className="mt-6 text-[15px] leading-[1.75] text-ash-400">
                Clone it, point it at Postgres, run it. There is no control plane to trust, no data
                residency conversation to have, and no vendor to be acquired. The build never touches
                the network — fonts are self-hosted and the intelligence is compiled in — so an
                air-gapped machine builds and runs ARCH exactly the same way.
              </p>
            </Reveal>

            <Reveal variant="rise" delay={200}>
              <dl className="arch-mono mt-8 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {REQUIREMENTS.map(([key, value]) => (
                  <div key={key} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-ash-600">{key}</dt>
                    <dd className="arch-tabular text-right text-[12px] font-medium text-ash-200">{value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {/* ---- Terminal ---- */}
          <Reveal variant="rise" delay={140} duration={1000}>
            <div className="arch-panel overflow-hidden">
              {/* Tab strip */}
              <div className="flex items-stretch justify-between gap-2 border-b border-white/[0.07] bg-white/[0.02] px-2">
                <div className="flex overflow-x-auto scroll-thin" role="tablist" aria-label="Deployment target">
                  {TABS.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      role="tab"
                      aria-selected={tab === entry.key}
                      onClick={() => setTab(entry.key)}
                      data-cursor
                      className={`arch-mono relative shrink-0 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 ${
                        tab === entry.key ? 'text-bone' : 'text-ash-600 hover:text-ash-300'
                      }`}
                    >
                      {entry.label}
                      <span
                        className={`absolute inset-x-3 bottom-0 h-px origin-left bg-signal-500 transition-transform duration-500 ease-out ${
                          tab === entry.key ? 'scale-x-100' : 'scale-x-0'
                        }`}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={copy}
                  data-cursor={copied ? 'copied' : 'copy'}
                  className="arch-mono my-2 flex shrink-0 items-center gap-2 self-center rounded-md border border-white/[0.09] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-ash-400 transition-colors duration-300 hover:border-white/20 hover:text-bone"
                  aria-label="Copy commands"
                >
                  <span className={`size-1.5 rounded-full transition-colors duration-300 ${copied ? 'bg-state-ok' : 'bg-ash-600'}`} aria-hidden />
                  {copied ? 'copied' : 'copy'}
                </button>
              </div>

              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <p className="arch-mono mb-4 text-[10px] uppercase tracking-[0.14em] text-ash-600">{active.note}</p>

                {/* Each tab re-keys so the lines stagger in on switch instead of cross-fading mush. */}
                <ol key={active.key} className="space-y-2.5">
                  {active.lines.map((line, index) => (
                    <li
                      key={line.cmd}
                      className="arch-deploy-line group flex flex-wrap items-baseline gap-x-3 gap-y-1"
                      style={{ animationDelay: `${index * 90}ms` }}
                    >
                      <span className="arch-mono shrink-0 select-none text-[12px] text-signal-500" aria-hidden>
                        $
                      </span>
                      <code className="arch-mono min-w-0 flex-1 text-[12.5px] text-bone sm:text-[13px]">{line.cmd}</code>
                      <span className="arch-mono w-full shrink-0 pl-5 text-[10.5px] tracking-[0.03em] text-ash-600 sm:w-auto sm:max-w-[16rem] sm:pl-0 sm:text-right">
                        {line.comment}
                      </span>
                    </li>
                  ))}
                </ol>

                <p
                  key={`${active.key}-after`}
                  className="arch-mono arch-deploy-line mt-4 border-t border-white/[0.06] pt-4 text-[11.5px] leading-relaxed text-ash-600"
                  style={{ animationDelay: `${active.lines.length * 90}ms` }}
                >
                  {active.after}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-5 py-3.5 sm:px-6">
                <p className="text-[12px] leading-relaxed text-ash-500">
                  From a cold clone to a published status page in about five minutes.
                </p>
                <a
                  href="https://github.com/ssambit635-svg/ARCH"
                  target="_blank"
                  rel="noreferrer noopener"
                  data-cursor="repo"
                  className="arch-mono inline-flex items-center gap-2 rounded-md border border-white/[0.1] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.12em] text-ash-300 transition-colors duration-300 hover:border-signal-500/40 hover:text-signal-300"
                >
                  read the docs →
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
