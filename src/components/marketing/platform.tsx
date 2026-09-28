'use client';

import { Reveal } from './reveal';

/**
 * Platform — the capability grid.
 *
 * Every card carries a miniature of the real artefact rather than an icon: the state rail, uptime
 * bars, a verified signature, the permission matrix, a burning error budget, a failing-then-passing
 * test. That is the Cloudflare/Grafana instinct — a dense grid that is scannable because each cell
 * shows you the shape of the thing, not a glyph that stands for it.
 *
 * Bento spans are deliberate: the three cards that decide whether someone trusts ARCH (state
 * machine, audit, RBAC) get the most room.
 */

const MACHINE = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;

function StateRail() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-1" aria-hidden>
      {MACHINE.map((state, index) => (
        <span key={state} className="flex items-center gap-1">
          <span
            className={`arch-mono rounded-[3px] border px-1.5 py-[2px] text-[8.5px] font-bold tracking-[0.08em] transition-colors duration-500 ${
              index === 3
                ? 'border-state-ok/35 bg-state-ok/10 text-state-ok'
                : 'border-white/[0.09] bg-white/[0.02] text-ash-600'
            }`}
          >
            {state.slice(0, 4)}
          </span>
          {index < MACHINE.length - 1 && <span className="text-[9px] text-ash-700">→</span>}
        </span>
      ))}
    </div>
  );
}

function UptimeMini() {
  // Deterministic: a clean run, one three-day incident, clean again.
  const cells = Array.from({ length: 46 }, (_, day) => {
    if (day >= 28 && day <= 30) return day === 29 ? 1 : 2;
    return day % 17 === 0 ? 3 : 0;
  });
  const colour = ['#2fbf71', '#ff4438', '#ff8a1f', '#38bdf8'];
  return (
    <div className="mt-5 flex items-end gap-[2px]" aria-hidden>
      {cells.map((state, index) => (
        <span
          key={index}
          className="arch-uptime-seg block h-7 w-full flex-1 rounded-[1px]"
          style={{ background: colour[state], opacity: state === 0 ? 0.55 : 1 }}
        />
      ))}
    </div>
  );
}

function SignatureRow() {
  return (
    <div className="arch-mono mt-5 space-y-1.5 text-[10px]" aria-hidden>
      {[
        ['x-arch-signature', 'sha256=7c1f…e9a2', 'verified', 'text-state-ok'],
        ['x-arch-timestamp', 'drift 2.4s', 'within ±300s', 'text-state-ok'],
        ['idempotency-key', 'grafana-8842117', 'new', 'text-ash-400'],
        ['x-arch-signature', 'sha256=0000…0000', 'rejected', 'text-sev-critical'],
      ].map(([header, value, verdict, tone]) => (
        <p key={`${header}-${verdict}`} className="flex items-baseline justify-between gap-2 border-b border-white/[0.05] pb-1.5 last:border-0">
          <span className="truncate text-ash-600">{header}</span>
          <span className="truncate text-ash-400">{value}</span>
          <span className={`shrink-0 font-bold uppercase tracking-[0.08em] ${tone}`}>{verdict}</span>
        </p>
      ))}
    </div>
  );
}

const ROLES = ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'] as const;
/** 1 = permitted, 0 = refused. Mirrors the matrix in README.md. */
const MATRIX: Record<string, number[]> = {
  'read incidents': [1, 1, 1, 1],
  'change · comment · assign': [1, 1, 1, 0],
  'publish status page': [1, 1, 0, 0],
  'read audit log': [1, 1, 0, 0],
  'retrain model': [1, 1, 0, 0],
  'delete organization': [1, 0, 0, 0],
};

function RoleMatrix() {
  return (
    <div className="mt-5 overflow-hidden rounded-md border border-white/[0.07]" aria-hidden>
      <table className="arch-mono w-full border-collapse text-[9.5px]">
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.02] text-ash-600">
            <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-[0.1em]">action</th>
            {ROLES.map((role) => (
              <th key={role} className="px-1 py-1.5 text-center font-semibold uppercase tracking-[0.08em]">
                {role.slice(0, 4)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {Object.entries(MATRIX).map(([action, allowed]) => (
            <tr key={action} className="transition-colors hover:bg-white/[0.025]">
              <td className="max-w-0 truncate px-2 py-1.5 text-ash-400">{action}</td>
              {allowed.map((yes, index) => (
                <td key={index} className="px-1 py-1.5 text-center">
                  <span className={yes ? 'text-state-ok' : 'text-ash-700'}>{yes ? '✓' : '·'}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BudgetBar() {
  return (
    <div className="mt-5" aria-hidden>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-600">error budget · 30d</span>
        <span className="arch-mono arch-tabular text-[11px] font-bold text-sev-high">28.6% burned</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-[3px] bg-white/[0.05]">
        <span className="block h-full bg-sev-high" style={{ width: '28.6%' }} />
        <span className="block h-full flex-1 bg-state-ok/45" />
      </div>
      <div className="arch-mono mt-2 flex justify-between text-[9.5px] text-ash-600">
        <span>slo 99.9%</span>
        <span className="arch-tabular">21m 22s remaining</span>
      </div>
    </div>
  );
}

function TestDiff() {
  return (
    <div className="arch-mono mt-5 space-y-1 text-[10.5px]" aria-hidden>
      <p className="flex items-center gap-2 rounded-[3px] border border-sev-critical/20 bg-sev-critical/[0.07] px-2 py-1.5 text-sev-critical">
        <span className="font-bold">✗</span>
        <span className="truncate">before · expected 200, got 503</span>
      </p>
      <p className="flex items-center gap-2 rounded-[3px] border border-state-ok/20 bg-state-ok/[0.07] px-2 py-1.5 text-state-ok">
        <span className="font-bold">✓</span>
        <span className="truncate">after · 200 in 84 ms · queue 0</span>
      </p>
      <p className="pt-1 text-[9.5px] tracking-[0.06em] text-ash-600">verified = fails before, passes after</p>
    </div>
  );
}

function LedgerMini() {
  return (
    <div className="arch-mono mt-5 space-y-1 text-[10px]" aria-hidden>
      {[
        ['4186', 'fix.approve', '51af', 'e902'],
        ['4187', 'status.publish', 'e902', '2cd7'],
        ['4188', 'incident.resolve', '2cd7', 'a44f'],
      ].map(([seq, action, prev, hash]) => (
        <p key={seq} className="flex items-baseline gap-2 border-b border-white/[0.05] pb-1.5 last:border-0">
          <span className="arch-tabular w-8 shrink-0 text-ash-700">{seq}</span>
          <span className="min-w-0 flex-1 truncate text-signal-300">{action}</span>
          <span className="arch-tabular shrink-0 text-ash-600">{prev}</span>
          <span className="shrink-0 text-ash-700">→</span>
          <span className="arch-tabular shrink-0 text-state-ok">{hash}</span>
        </p>
      ))}
    </div>
  );
}

type Card = {
  eyebrow: string;
  title: string;
  body: string;
  span: string;
  viz: () => React.ReactNode;
};

const CARDS: Card[] = [
  {
    eyebrow: 'core',
    title: 'Incident state machine',
    body: 'Legal transitions only, validated on the server. Two responders in two tabs cannot put an incident into a state that never existed — a stale tab gets a 409 with a human sentence attached.',
    span: 'lg:col-span-3',
    viz: StateRail,
  },
  {
    eyebrow: 'core',
    title: 'Audit that cannot lie',
    body: 'Every write is recorded in the same database transaction as the change. No window where the two diverge, and each row carries the hash of the row before it.',
    span: 'lg:col-span-3',
    viz: LedgerMini,
  },
  {
    eyebrow: 'public',
    title: 'Status pages',
    body: 'Per-service components, 90-day uptime history, active and past incidents. Statically rendered and revalidated on every write, so anonymous reads never touch auth. Drafts 404 for everyone outside the org.',
    span: 'lg:col-span-3',
    viz: UptimeMini,
  },
  {
    eyebrow: 'access',
    title: 'RBAC that holds up',
    body: 'OWNER / ADMIN / RESPONDER / VIEWER, one permission matrix checked on every request. The UI only hides what the API would refuse anyway. A cross-tenant id answers 404, never 403.',
    span: 'lg:col-span-3',
    viz: RoleMatrix,
  },
  {
    eyebrow: 'ingest',
    title: 'Webhook ingestion',
    body: 'HMAC-SHA256 verified, timestamp-tolerant, idempotent. One flapping alert becomes one incident — not forty — and every delivery is logged whether it was accepted or rejected.',
    span: 'lg:col-span-2',
    viz: SignatureRow,
  },
  {
    eyebrow: 'slo',
    title: 'Error budgets',
    body: 'Budgets that warn before they burn, so a deploy is a decision made with a number attached rather than a feeling.',
    span: 'lg:col-span-2',
    viz: BudgetBar,
  },
  {
    eyebrow: 'fix',
    title: 'Verified Fix Loop',
    body: 'Patches proposed against your pinned commit, executed only in a throwaway sandbox with no credentials, and opened as a draft PR after a human approves.',
    span: 'lg:col-span-2',
    viz: TestDiff,
  },
];

/** Smaller capabilities that do not need a miniature — listed tight, the way a spec sheet reads. */
const ALSO = [
  { title: 'Tenant isolation', body: 'Every repository takes organizationId as a required first parameter. A row from another org is not readable.' },
  { title: 'Knowledge base', body: 'Copilot cites your own runbooks, tenant-scoped, with the citation attached to the draft.' },
  { title: 'Chat with ARCH', body: 'A private conversational workspace assistant with bounded memory and selected tenant-scoped evidence.' },
  { title: 'Notification outbox', body: 'Postgres-backed with retries and a delivery state per message. No Redis, no second service to operate.' },
  { title: 'Code Assist', body: 'Review and scaffold modes. Emits one snippet, the file path, and what will break if you paste it blindly.' },
  { title: 'Blast radius', body: 'Dependency graph walked in both directions, so a change shows what it can touch before it ships.' },
];

export function Platform() {
  return (
    <section
      id="platform"
      className="relative scroll-mt-20 border-t border-white/[0.07] bg-ink-950"
      aria-label="Platform capabilities"
    >
      <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-[40rem]">
            <Reveal variant="fade">
              <p className="arch-mono mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-500">
                <span className="block h-px w-8 bg-signal-500" aria-hidden />
                platform
              </p>
            </Reveal>
            <Reveal variant="mask" duration={1000}>
              <h2 className="arch-display text-[clamp(2.1rem,4.6vw,3.6rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-bone">
                The whole lifecycle,
                <br />
                with nothing left over.
              </h2>
            </Reveal>
          </div>
          <Reveal variant="rise" delay={140}>
            <p className="max-w-[26rem] text-[14.5px] leading-[1.75] text-ash-400">
              No seat-tiered feature gates, no module you have to email sales about. What is on this
              page is what ships, and it is enforced on the server rather than hidden in the client.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {CARDS.map((card, index) => {
            const Viz = card.viz;
            return (
              <Reveal
                key={card.title}
                variant="rise"
                delay={index * 55}
                duration={900}
                className={card.span}
              >
                <article className="arch-panel card-lift group relative h-full overflow-hidden" data-cursor>
                  <div className="flex h-full flex-col p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="arch-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-signal-500/85">
                        {card.eyebrow}
                      </span>
                      <span className="arch-mono arch-tabular text-[9.5px] text-ash-700">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="arch-display mt-3 text-[19px] font-semibold leading-tight tracking-[-0.02em] text-bone sm:text-[21px]">
                      {card.title}
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.7] text-ash-400">{card.body}</p>

                    <div className="mt-auto pt-1">
                      <Viz />
                    </div>
                  </div>

                  {/* Hover: a hairline that draws across the top edge. No bloom, no lift of colour. */}
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-signal-500/70 transition-transform duration-700 ease-out group-hover:scale-x-100"
                    aria-hidden
                  />
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* The tail of the capability list — dense two-column, no miniatures. */}
        <Reveal variant="rise" delay={80} duration={900}>
          <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
            {ALSO.map((item) => (
              <div key={item.title} className="group bg-ink-950 px-5 py-5 transition-colors duration-300 hover:bg-ink-900">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-bone">
                  <span className="size-1 shrink-0 rounded-full bg-ash-700 transition-colors duration-300 group-hover:bg-signal-500" aria-hidden />
                  {item.title}
                </p>
                <p className="mt-1.5 pl-3 text-[12.5px] leading-relaxed text-ash-500">{item.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
