'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container, Heading, SubHeading, cn } from './vui-primitives';

type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3';
type Status = 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';

interface SampleIncident {
  id: string;
  code: string;
  title: string;
  severity: Severity;
  status: Status;
  service: string;
  region: string;
  commander: string;
  commanderRole: string;
  startedAt: string;
  mtta: string;
  dedupedFrom: number;
  summary: string;
  hypothesis: {
    confidence: number;
    rootCause: string;
    evidence: string[];
    action: string;
  };
  timeline: Array<{
    time: string;
    actor: string;
    kind: 'alert' | 'ai' | 'action' | 'status';
    text: string;
  }>;
}

const INCIDENTS: SampleIncident[] = [
  {
    id: 'inc-204',
    code: 'INC-204',
    title: 'Checkout API p99 latency > 4.2s across eu-central-1',
    severity: 'SEV-1',
    status: 'IDENTIFIED',
    service: 'checkout-api',
    region: 'eu-central-1',
    commander: 'Elena Vance',
    commanderRole: 'Primary SRE',
    startedAt: '03:12 UTC',
    mtta: '01m 14s',
    dedupedFrom: 14,
    summary:
      'Connection pool saturation on pg-primary-02 following deploy v2.18.4. Migration #418 holds an unindexed lock on orders_ledger.',
    hypothesis: {
      confidence: 87,
      rootCause:
        'Deploy v2.18.4 introduced an unindexed foreign-key scan on orders_ledger during peak settlement.',
      evidence: [
        'pg_stat_activity shows 198/200 active connections waiting on RelationLock',
        'Deploy v2.18.4 rolled out 6 minutes prior to first alert spike',
        'Replica lag on pg-read-03 climbed from 12ms to 1,840ms',
      ],
      action:
        'Rollback checkout-api to v2.18.3 and terminate long-running PIDs > 30s on pg-primary-02.',
    },
    timeline: [
      {
        time: '03:12:04',
        actor: 'webhook/prometheus',
        kind: 'alert',
        text: '14 firing alerts deduplicated into INC-204 · paged @elena.vance',
      },
      {
        time: '03:12:19',
        actor: 'ARCH V1.1',
        kind: 'ai',
        text: 'Correlated deploy v2.18.4 with pg-primary-02 connection pool saturation (87% confidence).',
      },
      {
        time: '03:13:18',
        actor: 'elena.vance',
        kind: 'action',
        text: 'Acknowledged incident · transitioned status to IDENTIFIED · initiated rollback of v2.18.4.',
      },
      {
        time: '03:14:42',
        actor: 'status-page',
        kind: 'status',
        text: 'Published public advisory to /status/arch · subscribers notified.',
      },
    ],
  },
  {
    id: 'inc-203',
    code: 'INC-203',
    title: 'Webhook delivery queue backlog on ingest-worker-04',
    severity: 'SEV-2',
    status: 'MONITORING',
    service: 'webhook-ingest',
    region: 'us-east-1',
    commander: 'Marcus Chen',
    commanderRole: 'Platform Lead',
    startedAt: '01:44 UTC',
    mtta: '02m 08s',
    dedupedFrom: 6,
    summary:
      'Downstream retry storm from a partner endpoint caused queue depth to exceed 25k messages. Rate-limiting policy applied.',
    hypothesis: {
      confidence: 92,
      rootCause:
        'Partner webhook endpoint began returning HTTP 502 with 10s timeouts, exhausting worker concurrency.',
      evidence: [
        'Queue depth rose from 180 to 26,400 over 9 minutes',
        '94% of in-flight jobs belong to tenant org_88f19a',
      ],
      action:
        'Isolate tenant org_88f19a to dedicated circuit-breaker queue and drain main worker pool.',
    },
    timeline: [
      {
        time: '01:44:11',
        actor: 'webhook/datadog',
        kind: 'alert',
        text: '6 queue-depth alerts grouped into INC-203 · routed to @marcus.chen',
      },
      {
        time: '01:45:02',
        actor: 'ARCH V1.1',
        kind: 'ai',
        text: 'Identified single-tenant retry amplification on org_88f19a (92% confidence).',
      },
      {
        time: '01:48:30',
        actor: 'marcus.chen',
        kind: 'action',
        text: 'Applied per-tenant circuit breaker · queue draining at 1,400 msg/s.',
      },
    ],
  },
  {
    id: 'inc-201',
    code: 'INC-201',
    title: 'TLS certificate auto-renewal stalled on edge-proxy-eu',
    severity: 'SEV-3',
    status: 'RESOLVED',
    service: 'edge-proxy',
    region: 'eu-west-1',
    commander: 'Priya Nair',
    commanderRole: 'Infra Engineer',
    startedAt: 'Yesterday',
    mtta: '03m 40s',
    dedupedFrom: 3,
    summary:
      'ACME DNS-01 challenge timed out due to stale TXT record TTL. Secondary issuer completed renewal.',
    hypothesis: {
      confidence: 95,
      rootCause:
        'Primary DNS provider API rate-limited TXT record propagation during batch renewal.',
      evidence: [
        'cert-manager retry #3 succeeded after switching to backup resolver',
        'Zero TLS handshakes failed; 18 days of validity remained',
      ],
      action: 'Stagger certificate renewal cron windows across edge regions.',
    },
    timeline: [
      {
        time: '19:04:12',
        actor: 'webhook/alertmanager',
        kind: 'alert',
        text: 'CertManagerRenewalStalled grouped into INC-201',
      },
      {
        time: '19:11:45',
        actor: 'priya.nair',
        kind: 'action',
        text: 'Verified backup issuer rotation · marked incident RESOLVED.',
      },
    ],
  },
];

const STATUS_STEPS: Status[] = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'];

export function IncidentPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string>(INCIDENTS[0]!.id);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Status>>({});
  const [tab, setTab] = useState<'timeline' | 'hypothesis' | 'postmortem'>('timeline');

  const active = INCIDENTS.find((i) => i.id === selectedId) ?? INCIDENTS[0]!;
  const currentStatus = statusOverrides[active.id] ?? active.status;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

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
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
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
          {/* Header Row */}
          <div className="workspace-reveal flex flex-col gap-4 border-b border-[#222] px-5 py-10 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
                <span className="size-1.5 rounded-full bg-[#FEF62A]" />
                <span>LIVE WAR ROOM · INTERACTIVE CONSOLE PREVIEW</span>
              </div>
              <Heading as="h2" variant="big" className="text-left">
                One Workspace for{' '}
                <span className="bg-gradient-to-b from-zinc-400 via-zinc-200 to-white bg-clip-text text-transparent">
                  Every Severity
                </span>
              </Heading>
              <SubHeading className="mt-2 max-w-2xl text-left">
                Select an incident in the queue, transition its state machine, or inspect the root-cause hypothesis and postmortem draft below.
              </SubHeading>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                <span>Open Full Console</span>
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/status/arch"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#222] bg-[#0d0e12] px-3.5 font-mono text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
              >
                <span className="size-1.5 rounded-full bg-ok-400 animate-pulse-dot" />
                <span>/status/arch</span>
              </Link>
            </div>
          </div>

          {/* Interactive Console Shell */}
          <div className="workspace-reveal bg-[#08090c]">
            {/* Browser Chrome Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222] bg-[#0b0c10] px-4 py-2.5 font-mono text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="ml-2 text-zinc-300">
                  arch.internal / dashboard / incidents / <strong className="text-white">{active.code}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[#FEF62A]">
                  ARCH V1.1 READY
                </span>
                <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-zinc-400">
                  SAMPLE DATA
                </span>
              </div>
            </div>

            {/* 12-Column Split: Left Queue (4 cols) + Right Active Incident (8 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#222]">
              {/* Left Queue */}
              <div className="lg:col-span-4 flex flex-col justify-between bg-[#06070a] p-4">
                <div>
                  <div className="flex items-center justify-between pb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    <span>Active Queue ({INCIDENTS.length})</span>
                    <span>Deduplicated</span>
                  </div>
                  <div className="space-y-2">
                    {INCIDENTS.map((inc) => {
                      const isSel = inc.id === active.id;
                      const st = statusOverrides[inc.id] ?? inc.status;
                      return (
                        <button
                          key={inc.id}
                          type="button"
                          onClick={() => setSelectedId(inc.id)}
                          className={cn(
                            'w-full text-left rounded-xl border p-3.5 transition-all cursor-pointer',
                            isSel
                              ? 'border-[#FEF62A]/70 bg-[#111319] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                              : 'border-[#222] bg-[#0a0b0f] hover:border-zinc-700'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                            <span className="font-semibold text-white">{inc.code}</span>
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                inc.severity === 'SEV-1'
                                  ? 'bg-crit-500/15 text-crit-400 border border-crit-500/30'
                                  : inc.severity === 'SEV-2'
                                  ? 'bg-warn-500/15 text-warn-400 border border-warn-500/30'
                                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                              )}
                            >
                              {inc.severity} · {st}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs font-medium text-zinc-200 line-clamp-2">
                            {inc.title}
                          </p>
                          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                            <span>
                              {inc.service} · {inc.region}
                            </span>
                            <span className="text-zinc-400">{inc.dedupedFrom} alerts → 1</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-[#222] bg-[#0b0c10] p-3 font-mono text-[11px] text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>POST /api/webhooks/alerts</span>
                    <span className="text-ok-400">200 OK</span>
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    HMAC-SHA256 signature verified · idempotency window 15m
                  </div>
                </div>
              </div>

              {/* Right Active Incident Detail */}
              <div className="lg:col-span-8 p-5 md:p-6 flex flex-col justify-between">
                <div>
                  {/* Top Title & Commander */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#222] pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="rounded border border-[#FEF62A]/50 bg-[#FEF62A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#FEF62A]">
                          {active.code}
                        </span>
                        <span className="text-zinc-400">{active.service}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400">{active.region}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400 tnum">MTTA {active.mtta}</span>
                      </div>
                      <h3 className="mt-2 font-orbitron text-lg md:text-xl font-bold text-white">
                        {active.title}
                      </h3>
                    </div>

                    <div className="rounded-xl border border-[#222] bg-[#0c0d12] px-3 py-2 text-right font-mono text-xs">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Incident Commander
                      </div>
                      <div className="font-sans font-medium text-white">{active.commander}</div>
                      <div className="text-[10px] text-zinc-400">{active.commanderRole}</div>
                    </div>
                  </div>

                  {/* Interactive State Machine Stepper */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#222] bg-[#0b0c10] p-2.5">
                    <span className="px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                      State Machine:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_STEPS.map((st) => {
                        const isCurrent = currentStatus === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setStatusOverrides((prev) => ({ ...prev, [active.id]: st }))
                            }
                            className={cn(
                              'rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold transition-all cursor-pointer',
                              isCurrent
                                ? 'bg-[#FEF62A] text-black shadow-[0_0_16px_rgba(254,246,42,0.25)]'
                                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
                            )}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* View Tabs */}
                  <div className="mt-4 flex items-center gap-2 border-b border-[#222] pb-2.5 font-mono text-xs">
                    {(
                      [
                        ['timeline', 'Timeline & Audit'],
                        ['hypothesis', `ARCH V1.1 Hypothesis (${active.hypothesis.confidence}%)`],
                        ['postmortem', 'Postmortem Draft'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer',
                          tab === key
                            ? 'bg-white text-black font-semibold'
                            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Body */}
                  <div className="mt-4">
                    {tab === 'timeline' && (
                      <div className="space-y-2.5">
                        {active.timeline.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-xl border border-[#222] bg-[#0b0c10] p-3 text-xs"
                          >
                            <span className="font-mono text-[11px] text-zinc-500 tnum shrink-0">
                              {item.time}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'rounded px-1.5 py-0.5 font-mono text-[10px] font-medium',
                                    item.kind === 'ai'
                                      ? 'bg-[#FEF62A]/15 text-[#FEF62A] border border-[#FEF62A]/30'
                                      : item.kind === 'alert'
                                      ? 'bg-crit-500/15 text-crit-400 border border-crit-500/30'
                                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                  )}
                                >
                                  {item.actor}
                                </span>
                              </div>
                              <p className="mt-1.5 text-zinc-200 leading-relaxed">{item.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tab === 'hypothesis' && (
                      <div className="rounded-xl border border-[#222] bg-[#0b0c10] p-4 space-y-3">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="text-[#FEF62A] font-semibold">
                            ✦ ARCH V1.1 · ROOT-CAUSE HYPOTHESIS
                          </span>
                          <span className="rounded bg-[#FEF62A] px-2 py-0.5 text-[10px] font-bold text-black">
                            {active.hypothesis.confidence}% CONFIDENCE
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white">
                          {active.hypothesis.rootCause}
                        </p>
                        <ul className="space-y-1.5 font-mono text-xs text-zinc-300">
                          {active.hypothesis.evidence.map((ev, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#FEF62A]">→</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
                          <span className="text-zinc-500 uppercase mr-2">Recommended Action:</span>
                          {active.hypothesis.action}
                        </div>
                      </div>
                    )}

                    {tab === 'postmortem' && (
                      <div className="rounded-xl border border-[#222] bg-[#0b0c10] p-4 font-mono text-xs space-y-2.5 text-zinc-300">
                        <div className="text-[11px] uppercase tracking-wider text-[#FEF62A]">
                          # Postmortem — {active.code}: {active.title}
                        </div>
                        <p className="font-sans text-xs text-zinc-300 leading-relaxed">
                          <strong className="text-white">Summary:</strong> {active.summary}
                        </p>
                        <p className="font-sans text-xs text-zinc-300 leading-relaxed">
                          <strong className="text-white">Remediation:</strong> {active.hypothesis.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#222] pt-4 font-mono text-[11px] text-zinc-500">
                  <span>All transitions logged to append-only SHA-256 audit ledger</span>
                  <Link href="/login" className="text-zinc-200 hover:text-[#FEF62A]">
                    Sign in to run full workflow →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
