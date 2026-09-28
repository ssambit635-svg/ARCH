'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Reveal } from './reveal';
import { AI_NAME } from '@/lib/brand';

/**
 * Lifecycle — the pinned scroll story.
 *
 * One section, pinned for four viewport-heights, scrubbing through the four moves ARCH makes on
 * every incident: INGEST → RESPOND → PUBLISH → PROVE. Each step swaps in a real artefact — the
 * signed webhook, the timeline, the rendered status page, the hash-chained audit ledger — rather
 * than an abstract illustration, because the credibility of this product *is* its artefacts.
 *
 * Scrubbing is driven straight into the DOM by GSAP. Nothing here goes through React state: a
 * `setState` per animation frame on a section this tall would drop frames on mid-range hardware,
 * and the pinned stage would visibly lag behind the scroll position.
 */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const STEPS = [
  {
    index: '01',
    key: 'ingest',
    title: 'Ingest',
    claim: 'Anything that can POST can page you.',
    body: 'A webhook lands with an HMAC signature, a timestamp and an idempotency key. Bad signatures are rejected and logged before they touch the database. Good ones are deduplicated against open incidents, so one flapping alert becomes one incident — not forty.',
    detail: ['HMAC-SHA256 verified', '±300s timestamp tolerance', 'idempotency keys', 'delivery log retained'],
  },
  {
    index: '02',
    key: 'respond',
    title: 'Respond',
    claim: 'A state machine, not a text field.',
    body: 'Incidents move INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED. Transitions are validated server-side, so two responders in two tabs cannot put an incident into a state that never existed. A stale tab gets a 409 with a human sentence attached.',
    detail: ['legal transitions only', 'optimistic concurrency', 'timeline is the record', 'auto-recorded events'],
  },
  {
    index: '03',
    key: 'publish',
    title: 'Publish',
    claim: 'Customers read a page, not your inbox.',
    body: 'Per-service components, 90-day uptime history, active and past incidents — statically rendered and revalidated on every write, so the public page is fast and anonymous reads never touch auth. Drafts 404 for everyone outside the org.',
    detail: ['static + revalidated', 'anonymous reads', 'publish in one click', 'drafts 404 publicly'],
  },
  {
    index: '04',
    key: 'prove',
    title: 'Prove',
    claim: 'The ledger cannot disagree with the data.',
    body: 'Every write is recorded in an append-only audit log inside the same database transaction as the change itself. There is no window where the two can diverge, and no code path that updates one without the other. Each row carries the hash of the row before it.',
    detail: ['same transaction', 'append-only', 'hash-chained rows', 'admin-only, paginated'],
  },
] as const;

/** Deterministic 90-day uptime history: mostly clean, with one bad week that matches the story. */
function uptimeSeries(serviceIndex: number): number[] {
  return Array.from({ length: 90 }, (_, day) => {
    // A single 3-day incident window around day 62 for the checkout service; noise elsewhere.
    const inIncident = serviceIndex === 0 && day >= 62 && day <= 64;
    if (inIncident) return day === 63 ? 2 : 1;
    const noise = Math.abs(Math.sin((day + serviceIndex * 17) * 12.9898) * 43758.5453) % 1;
    if (noise > 0.985) return 1;
    if (noise > 0.955) return 3; // maintenance
    return 0; // operational
  });
}

const UPTIME_COLOUR = ['#2fbf71', '#ff4438', '#ff8a1f', '#38bdf8'];
const UPTIME_LABEL = ['operational', 'outage', 'degraded', 'maintenance'];

function UptimeBars({ serviceIndex }: { serviceIndex: number }) {
  const series = uptimeSeries(serviceIndex);
  return (
    <div className="flex items-end gap-[2px]" aria-hidden>
      {series.map((state, day) => (
        <span
          key={day}
          className="arch-uptime-seg block h-6 w-[3px] sm:w-[4px]"
          style={{ background: UPTIME_COLOUR[state], opacity: state === 0 ? 0.62 : 1 }}
        />
      ))}
    </div>
  );
}

/* ---- Artefact 01 · the signed webhook ---------------------------------- */

function IngestArtefact() {
  return (
    <div className="arch-mono overflow-hidden rounded-xl border border-white/[0.08] bg-ink-950 text-[11.5px] leading-[1.75] sm:text-[12.5px]">
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-2">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-ash-500">
          <span className="size-1.5 rounded-full bg-sev-critical" /> request
        </span>
        <span className="text-[10px] tracking-[0.1em] text-ash-600">POST /api/webhooks/ingest/wh_9f2a</span>
      </div>
      <div className="space-y-px px-4 py-3.5">
        {[
          ['host', 'arch.acme.dev'],
          ['x-arch-signature', 'sha256=7c1f9b…e9a2'],
          ['x-arch-timestamp', '1759046382'],
          ['x-arch-idempotency-key', 'grafana-8842117'],
          ['content-type', 'application/json'],
        ].map(([key, value]) => (
          <p key={key} className="truncate">
            <span className="text-ash-500">{key}:</span> <span className="text-ash-200">{value}</span>
          </p>
        ))}
      </div>
      <pre className="overflow-x-auto border-y border-white/[0.07] bg-ink-1000/60 px-4 py-3.5 text-[11px] leading-[1.7] text-ash-300 sm:text-[12px]">
        <code>{`{
  "source":     "grafana",
  "severity":   "CRITICAL",
  "title":      "checkout-api p99 latency 4.21s",
  "service":    "checkout-api",
  "region":     "eu-west-1",
  "fired_at":   "2026-09-28T09:19:42Z"
}`}</code>
      </pre>
      <div className="space-y-1 px-4 py-3.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <span className="rounded-[4px] border border-state-ok/30 bg-state-ok/10 px-1.5 py-px text-[10px] font-bold tracking-[0.08em] text-state-ok">
            201 CREATED
          </span>
          <span className="text-ash-300">incident INC-418 opened</span>
        </p>
        <p className="text-[11px] text-ash-500">
          signature <span className="text-state-ok">verified</span> · timestamp drift{' '}
          <span className="arch-tabular text-ash-300">2.4s</span> · dedupe{' '}
          <span className="text-ash-300">0 matches</span> · audit{' '}
          <span className="text-signal-300">sealed 4182</span>
        </p>
      </div>
    </div>
  );
}

/* ---- Artefact 02 · the timeline ---------------------------------------- */

const TIMELINE = [
  { at: '09:19:42', actor: 'webhook.ingest', kind: 'system', text: 'INC-418 created · severity CRITICAL · dedupe 0 matches' },
  { at: '09:19:44', actor: 'arch-v1.1', kind: 'ai', text: 'triage draft — HIGH→CRITICAL, assign @ada, similar: INC-311 (0.87)' },
  { at: '09:19:51', actor: 'ada.lovelace', kind: 'human', text: 'acknowledged · assigned self · opened war-room #inc-418' },
  { at: '09:21:07', actor: 'ada.lovelace', kind: 'state', text: 'INVESTIGATING → IDENTIFIED · “pool saturated on pg-primary”' },
  { at: '09:24:33', actor: 'arch-v1.1', kind: 'ai', text: 'verified fix draft #214 — pool 10→40 · sandbox evidence attached' },
  { at: '09:26:10', actor: 'm.okonkwo', kind: 'human', text: 'approved #214 · draft PR opened against a91f3c2' },
  { at: '09:31:58', actor: 'ci.sandbox', kind: 'system', text: '214/214 tests pass · blast radius 3 downstream services' },
  { at: '09:34:22', actor: 'ada.lovelace', kind: 'state', text: 'IDENTIFIED → MONITORING · status page updated' },
  { at: '09:52:03', actor: 'ada.lovelace', kind: 'state', text: 'MONITORING → RESOLVED · postmortem drafted from timeline' },
];

const KIND_STYLE: Record<string, { dot: string; label: string }> = {
  system: { dot: 'bg-ash-500', label: 'text-ash-400' },
  ai: { dot: 'bg-signal-500', label: 'text-signal-300' },
  human: { dot: 'bg-ash-200', label: 'text-ash-200' },
  state: { dot: 'bg-state-ok', label: 'text-state-ok' },
};

const MACHINE = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;

function RespondArtefact() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-ink-950">
      {/* The state machine rail — the spine of the whole product. */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
        {MACHINE.map((state, index) => (
          <div key={state} className="flex shrink-0 items-center gap-1.5">
            <span
              className={`arch-mono rounded-[4px] border px-2 py-[3px] text-[9.5px] font-bold tracking-[0.1em] ${
                index === 3
                  ? 'border-state-ok/35 bg-state-ok/10 text-state-ok'
                  : 'border-white/[0.09] bg-white/[0.02] text-ash-500'
              }`}
            >
              {state}
            </span>
            {index < MACHINE.length - 1 && <span className="text-ash-700" aria-hidden>→</span>}
          </div>
        ))}
      </div>

      <ol className="max-h-[19rem] overflow-y-auto px-4 py-3 scroll-thin sm:max-h-none">
        {TIMELINE.map((entry) => {
          const style = KIND_STYLE[entry.kind] ?? KIND_STYLE.system!;
          return (
            <li key={`${entry.at}-${entry.actor}`} className="group relative flex gap-3 pb-3 last:pb-0">
              {/* Rail */}
              <span className="relative flex w-2 shrink-0 justify-center pt-1.5">
                <span className={`size-1.5 rounded-full ${style.dot}`} />
                <span className="absolute top-3.5 bottom-[-0.75rem] w-px bg-white/[0.08]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="arch-mono flex flex-wrap items-baseline gap-x-2 text-[10.5px]">
                  <span className="arch-tabular text-ash-600">{entry.at}</span>
                  <span className={`font-semibold tracking-[0.04em] ${style.label}`}>{entry.actor}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ash-300">{entry.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---- Artefact 03 · the public status page ------------------------------ */

const SERVICES = [
  { name: 'api-gateway', note: 'edge · 4 regions' },
  { name: 'checkout-api', note: 'eu-west · us-east' },
  { name: 'payments-svc', note: 'PCI scope' },
  { name: 'auth-svc', note: 'session + oauth' },
  { name: 'webhook-ingest', note: 'public endpoint' },
  { name: 'status-renderer', note: 'static + isr' },
];

const SERVICE_STATE = ['operational', 'outage', 'operational', 'operational', 'operational', 'operational'];

function PublishArtefact() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-ink-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="arch-mono text-[10px] uppercase tracking-[0.14em] text-ash-500">status.acme.dev</span>
          <span className="arch-mono rounded-[4px] border border-sev-critical/30 bg-sev-critical/10 px-1.5 py-px text-[9.5px] font-bold tracking-[0.08em] text-sev-critical">
            partial outage
          </span>
        </div>
        <span className="arch-mono text-[10px] tracking-[0.08em] text-ash-600">revalidated 12s ago</span>
      </div>

      <div className="border-b border-white/[0.07] px-4 py-3.5">
        <p className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-bone">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-sev-critical" aria-hidden />
          INC-418 · checkout-api degraded in eu-west-1
        </p>
        <p className="text-[12px] leading-relaxed text-ash-400">
          Elevated latency on checkout. Connection pool saturation identified; a fix is deployed and
          we are monitoring. Payments and auth are unaffected.
        </p>
        <p className="arch-mono mt-2 text-[10px] tracking-[0.06em] text-ash-600">
          opened 09:19 UTC · update 3 of 4 · monitoring
        </p>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {SERVICES.map((service, index) => (
          <div key={service.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="arch-mono truncate text-[12px] text-ash-200">{service.name}</p>
              <p className="arch-mono truncate text-[9.5px] tracking-[0.06em] text-ash-600">{service.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <UptimeBars serviceIndex={index} />
              <span
                className="arch-mono w-[74px] shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ color: UPTIME_COLOUR[SERVICE_STATE[index] === 'outage' ? 1 : 0] }}
              >
                {SERVICE_STATE[index]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
        <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-600">90-day history</span>
        <span className="flex items-center gap-3">
          {UPTIME_LABEL.slice(0, 3).map((label, index) => (
            <span key={label} className="arch-mono flex items-center gap-1.5 text-[9.5px] tracking-[0.06em] text-ash-600">
              <span className="size-1.5 rounded-[1px]" style={{ background: UPTIME_COLOUR[index] }} aria-hidden />
              {label}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/* ---- Artefact 04 · the audit ledger ------------------------------------ */

const LEDGER = [
  { seq: '4182', at: '09:19:42.441', actor: 'webhook.ingest', action: 'incident.create', target: 'INC-418', prev: '9a2c', hash: '7f11' },
  { seq: '4183', at: '09:19:44.907', actor: 'arch-v1.1', action: 'triage.draft', target: 'INC-418', prev: '7f11', hash: 'b3d8' },
  { seq: '4184', at: '09:19:51.002', actor: 'ada.lovelace', action: 'incident.assign', target: 'INC-418', prev: 'b3d8', hash: 'c40e' },
  { seq: '4185', at: '09:21:07.318', actor: 'ada.lovelace', action: 'incident.transition', target: 'IDENTIFIED', prev: 'c40e', hash: '51af' },
  { seq: '4186', at: '09:26:10.774', actor: 'm.okonkwo', action: 'fix.approve', target: 'draft#214', prev: '51af', hash: 'e902' },
  { seq: '4187', at: '09:34:22.109', actor: 'ada.lovelace', action: 'status.publish', target: 'status.acme.dev', prev: 'e902', hash: '2cd7' },
  { seq: '4188', at: '09:52:03.556', actor: 'ada.lovelace', action: 'incident.resolve', target: 'INC-418', prev: '2cd7', hash: 'a44f' },
];

function ProveArtefact() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-ink-950">
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
        <span className="arch-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-ash-500">
          <span className="size-1.5 rounded-full bg-signal-500" /> audit_ledger · append-only
        </span>
        <span className="arch-mono text-[10px] tracking-[0.08em] text-ash-600">7 of 4,188 rows</span>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <table className="arch-mono w-full min-w-[38rem] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-left text-[9.5px] uppercase tracking-[0.12em] text-ash-600">
              <th className="px-4 py-2 font-semibold">seq</th>
              <th className="px-3 py-2 font-semibold">timestamp</th>
              <th className="px-3 py-2 font-semibold">actor</th>
              <th className="px-3 py-2 font-semibold">action</th>
              <th className="px-3 py-2 font-semibold">target</th>
              <th className="px-4 py-2 text-right font-semibold">prev → hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {LEDGER.map((row) => (
              <tr key={row.seq} className="transition-colors duration-200 hover:bg-white/[0.03]">
                <td className="arch-tabular px-4 py-2 text-ash-600">{row.seq}</td>
                <td className="arch-tabular whitespace-nowrap px-3 py-2 text-ash-400">{row.at}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ash-200">{row.actor}</td>
                <td className="whitespace-nowrap px-3 py-2 text-signal-300">{row.action}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ash-300">{row.target}</td>
                <td className="arch-tabular whitespace-nowrap px-4 py-2 text-right">
                  <span className="text-ash-600">{row.prev}</span>
                  <span className="mx-1 text-ash-700">→</span>
                  <span className="text-state-ok">{row.hash}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <p className="text-[12px] leading-relaxed text-ash-400">
          Written inside the same transaction as the change itself. There is no code path that
          commits one without the other, and no window in which they can disagree.
        </p>
      </div>
    </div>
  );
}

const ARTEFACTS = [IngestArtefact, RespondArtefact, PublishArtefact, ProveArtefact];

export function Lifecycle() {
  const root = useRef<HTMLDivElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const copies = useRef<(HTMLDivElement | null)[]>([]);
  const markers = useRef<(HTMLLIElement | null)[]>([]);
  const bar = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Static fallback: unpin and stack the steps so the content is all reachable by normal scroll.
      node.dataset.staticFallback = 'true';
      panels.current.forEach((panel) => {
        if (panel) gsap.set(panel, { opacity: 1, y: 0, position: 'relative', scale: 1 });
      });
      copies.current.forEach((copy, index) => {
        if (!copy) return;
        gsap.set(copy, { opacity: 1, y: 0, position: 'relative', minHeight: 0 });
        copy.setAttribute('aria-hidden', 'false');
        copy.dataset.index = String(index);
      });
      return;
    }

    const ctx = gsap.context(() => {
      panels.current.forEach((panel, index) => {
        if (!panel) return;
        gsap.set(panel, {
          opacity: index === 0 ? 1 : 0,
          y: index === 0 ? 0 : 46,
          scale: index === 0 ? 1 : 0.985,
        });
      });

      // The copy in the left column has to breathe with the artefact on the right — same timings,
      // slightly shorter travel so the words settle before the panel does.
      copies.current.forEach((copy, index) => {
        if (copy) gsap.set(copy, { opacity: index === 0 ? 1 : 0, y: index === 0 ? 0 : 20 });
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: stage.current,
          start: 'top top+=72',
          end: `+=${STEPS.length * 105}%`,
          scrub: 0.75,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Which step owns the viewport right now. Written to the DOM directly so the index
            // rail and the progress bar stay in phase with the scrub without a React render.
            const step = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length + 0.0001));
            markers.current.forEach((marker, index) => {
              if (!marker) return;
              marker.dataset.active = index === step ? 'true' : 'false';
            });
            copies.current.forEach((copy, index) => {
              if (copy) copy.setAttribute('aria-hidden', index === step ? 'false' : 'true');
            });
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });

      STEPS.forEach((_, index) => {
        if (index === 0) return;
        const outgoing = panels.current[index - 1];
        const incoming = panels.current[index];
        if (!outgoing || !incoming) return;

        const at = (index - 1) / STEPS.length;
        timeline.to(
          outgoing,
          { opacity: 0, y: -56, scale: 0.985, duration: 1 / STEPS.length, ease: 'none' },
          at,
        );
        timeline.fromTo(
          incoming,
          { opacity: 0, y: 56, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 1 / STEPS.length, ease: 'none' },
          at,
        );

        const outgoingCopy = copies.current[index - 1];
        const incomingCopy = copies.current[index];
        if (outgoingCopy) {
          timeline.to(outgoingCopy, { opacity: 0, y: -20, duration: 1 / STEPS.length, ease: 'none' }, at);
        }
        if (incomingCopy) {
          timeline.fromTo(
            incomingCopy,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 1 / STEPS.length, ease: 'none' },
            at,
          );
        }
      });
    }, node);

    // Fonts and the hero's 3D canvas both shift layout after mount; refresh so the pin lands right.
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 600);

    return () => {
      window.clearTimeout(refresh);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="lifecycle"
      ref={root}
      className="relative scroll-mt-20 border-t border-white/[0.07] bg-ink-1000 data-[static-fallback=true]:pt-16"
      aria-label="How ARCH handles an incident"
    >
      <div ref={stage} className="relative min-h-[100svh] w-full overflow-hidden">
        <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(90% 60% at 12% 20%, rgb(59 130 246 / 0.04), transparent 62%)' }}
          aria-hidden
        />

        <div className="relative mx-auto grid min-h-[100svh] max-w-[1400px] grid-cols-1 items-center gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-16 lg:py-28">
          {/* ---- Left: the index rail and the copy for the active step ---- */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal variant="fade">
              <p className="arch-mono mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-500">
                <span className="block h-px w-8 bg-signal-500" aria-hidden />
                the four moves
              </p>
            </Reveal>

            <ol className="mb-8 space-y-0.5" aria-label="Lifecycle steps">
              {STEPS.map((step, index) => (
                <li
                  key={step.key}
                  ref={(element) => {
                    markers.current[index] = element;
                  }}
                  data-active={index === 0 ? 'true' : 'false'}
                  className="group relative flex items-baseline gap-3.5 border-b border-white/[0.06] py-3 transition-colors duration-500 first:border-t first:border-white/[0.06] data-[active=true]:border-signal-500/25"
                >
                  {/* Active step gets a sodium rule drawn in from the left. */}
                  <span
                    className="absolute inset-y-0 -left-4 w-px origin-top scale-y-0 bg-signal-500 transition-transform duration-700 ease-out group-data-[active=true]:scale-y-100"
                    aria-hidden
                  />
                  <span className="arch-mono arch-tabular w-6 shrink-0 text-[11px] font-bold tracking-[0.08em] text-ash-700 transition-colors duration-500 group-data-[active=true]:text-signal-500">
                    {step.index}
                  </span>
                  <span className="arch-display text-[22px] font-medium leading-tight tracking-[-0.02em] text-ash-600 transition-colors duration-500 group-data-[active=true]:text-bone sm:text-[26px]">
                    {step.title}
                  </span>
                </li>
              ))}
            </ol>

            {/* Copy for every step, stacked; only the active one is in the accessibility tree at a
                time so a screen reader is not read four descriptions of the same section. */}
            <div className="relative min-h-[13rem]">
              {STEPS.map((step, index) => (
                <div
                  key={step.key}
                  ref={(element) => {
                    copies.current[index] = element;
                  }}
                  className="absolute inset-0"
                  data-step-copy={index}
                  aria-hidden={index !== 0}
                >
                  <p className="arch-display text-[19px] font-medium leading-snug tracking-[-0.02em] text-bone sm:text-[21px]">
                    {step.claim}
                  </p>
                  <p className="mt-3 max-w-[34rem] text-[14px] leading-[1.75] text-ash-400">{step.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {step.detail.map((item) => (
                      <li
                        key={item}
                        className="arch-mono rounded-[5px] border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[10px] tracking-[0.05em] text-ash-400"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Right: the pinned artefact stage ---- */}
          <div className="relative min-h-[24rem] lg:min-h-[30rem]">
            {STEPS.map((step, index) => {
              const Artefact = ARTEFACTS[index];
              if (!Artefact) return null;
              return (
                <div
                  key={step.key}
                  ref={(element) => {
                    panels.current[index] = element;
                  }}
                  className="absolute inset-0 will-change-transform"
                  style={{ opacity: index === 0 ? 1 : 0 }}
                >
                  <div className="arch-panel arch-sheen relative h-full overflow-hidden p-4 sm:p-5">
                    <div className="mb-3.5 flex items-center justify-between gap-3">
                      <span className="arch-mono text-[10px] uppercase tracking-[0.16em] text-ash-500">
                        {step.index} · {step.title}
                      </span>
                      <span className="arch-mono text-[10px] tracking-[0.08em] text-ash-600">
                        {index === 1 ? AI_NAME : 'live artefact'}
                      </span>
                    </div>
                    <Artefact />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section progress — a hairline that fills as the story scrubs. */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/[0.07]" aria-hidden>
          <div ref={bar} className="h-full origin-left scale-x-0 bg-signal-500" />
        </div>
      </div>
    </section>
  );
}
