'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { BrainNode, ServiceStatus } from './topology-scene';
import dynamic from 'next/dynamic';
const TopologyScene = dynamic(() => import('./topology-scene').then((m) => ({ default: m.TopologyScene })), {
  ssr: false,
  loading: () => (
    <div className="relative aspect-[16/10] w-full bg-[#040812]">
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(59,142,244,0.18) 0%, transparent 70%)' }} />
    </div>
  ),
});
import { Container, Heading, SubHeading, cn } from './vui-primitives';
import { GsapTextReveal } from './gsap-reveal';

const BRAIN_NODES: BrainNode[] = [
  {
    id: 'edge-proxy',
    name: 'edge-proxy',
    lobe: 'Prefrontal Edge Gate',
    tier: 'Edge',
    status: 'OPERATIONAL',
    uptime: '99.99%',
    latency: '14ms',
    owner: 'team-edge',
    x: 20,
    y: 44,
    color: '#22d3ee',
    deps: ['api-gateway', 'status-page'],
    summary: 'Anycast TLS termination and DDoS rate-limiting across 34 edge POPs.',
  },
  {
    id: 'api-gateway',
    name: 'api-gateway',
    lobe: 'Frontal Router Cortex',
    tier: 'Edge',
    status: 'OPERATIONAL',
    uptime: '99.98%',
    latency: '32ms',
    owner: 'team-edge',
    x: 27,
    y: 31,
    color: '#22d3ee',
    deps: ['auth-svc', 'checkout-api', 'payments-svc', 'search-index'],
    summary: 'Request routing, JWT verification, and tenant rate-budget enforcement.',
  },
  {
    id: 'auth-svc',
    name: 'auth-svc',
    lobe: 'Broca Identity Enclave',
    tier: 'Core',
    status: 'OPERATIONAL',
    uptime: '99.99%',
    latency: '19ms',
    owner: 'team-identity',
    x: 32,
    y: 53,
    color: '#3b8ef4',
    deps: ['postgres-primary', 'redis-cache'],
    summary: 'Session issuance, PBKDF2-SHA256 verification, and RBAC policy evaluation.',
  },
  {
    id: 'checkout-api',
    name: 'checkout-api',
    lobe: 'Motor Checkout Cortex',
    tier: 'Core',
    status: 'DEGRADED',
    uptime: '99.82%',
    latency: '4,210ms',
    owner: 'team-commerce',
    x: 43,
    y: 23,
    color: '#3b8ef4',
    deps: ['payments-svc', 'postgres-primary', 'redis-cache', 'arch-v1.1'],
    summary: 'Order orchestration experiencing p99 latency spike due to upstream DB lock contention.',
  },
  {
    id: 'arch-v1.1',
    name: 'arch-v1.1',
    lobe: 'Thalamocortical AI Core',
    tier: 'Platform',
    status: 'OPERATIONAL',
    uptime: '99.99%',
    latency: '140ms',
    owner: 'team-sre',
    x: 54,
    y: 35,
    color: '#3b8ef4',
    deps: ['postgres-primary', 'audit-ledger', 'status-page'],
    summary: 'Native incident intelligence engine correlating deploy diffs, SQL locks, and blast radius.',
  },
  {
    id: 'payments-svc',
    name: 'payments-svc',
    lobe: 'Parietal Settlement Bus',
    tier: 'Core',
    status: 'DEGRADED',
    uptime: '99.87%',
    latency: '1,480ms',
    owner: 'team-payments',
    x: 62,
    y: 24,
    color: '#fbbf24',
    deps: ['postgres-primary', 'audit-ledger'],
    summary: 'Idempotent ledger settlement awaiting connection pool release on postgres-primary.',
  },
  {
    id: 'postgres-primary',
    name: 'postgres-primary',
    lobe: 'Hippocampal Primary DB',
    tier: 'Data',
    status: 'MAJOR_OUTAGE',
    uptime: '99.41%',
    latency: '1,840ms',
    owner: 'team-storage',
    x: 48,
    y: 51,
    color: '#f43f5e',
    deps: ['audit-ledger'],
    summary: 'Primary PostgreSQL 16 cluster at 200/200 active connections following migration #418.',
  },
  {
    id: 'redis-cache',
    name: 'redis-cache',
    lobe: 'Temporal Memory Ring',
    tier: 'Data',
    status: 'OPERATIONAL',
    uptime: '99.99%',
    latency: '2.1ms',
    owner: 'team-storage',
    x: 38,
    y: 65,
    color: '#22d3ee',
    deps: [],
    summary: 'Sub-millisecond read-through session cache and deduplication fingerprint window.',
  },
  {
    id: 'search-index',
    name: 'search-index',
    lobe: 'Associative Vector Index',
    tier: 'Data',
    status: 'OPERATIONAL',
    uptime: '99.96%',
    latency: '28ms',
    owner: 'team-search',
    x: 65,
    y: 46,
    color: '#c084fc',
    deps: ['postgres-primary'],
    summary: 'Full-text incident timeline index and historical postmortem similarity search.',
  },
  {
    id: 'status-page',
    name: 'status-page',
    lobe: 'Occipital Status Lobe',
    tier: 'Platform',
    status: 'OPERATIONAL',
    uptime: '100.0%',
    latency: '18ms',
    owner: 'team-sre',
    x: 78,
    y: 38,
    color: '#34d399',
    deps: ['audit-ledger'],
    summary: 'Public 90-day uptime ledger and subscriber advisory broadcaster (/status/arch).',
  },
  {
    id: 'audit-ledger',
    name: 'audit-ledger',
    lobe: 'Cerebellar SHA-256 Ledger',
    tier: 'Platform',
    status: 'OPERATIONAL',
    uptime: '100.0%',
    latency: '9ms',
    owner: 'team-security',
    x: 74,
    y: 58,
    color: '#3b8ef4',
    deps: [],
    summary: 'Append-only cryptographic audit log recording every state transition and actor signature.',
  },
  {
    id: 'webhook-ingest',
    name: 'webhook-ingest',
    lobe: 'Brainstem Telemetry Ingest',
    tier: 'Platform',
    status: 'OPERATIONAL',
    uptime: '99.99%',
    latency: '11ms',
    owner: 'team-sre',
    x: 54,
    y: 76,
    color: '#22d3ee',
    deps: ['arch-v1.1', 'postgres-primary', 'audit-ledger'],
    summary: 'HMAC-SHA256 verified alert intake from Prometheus Alertmanager, Datadog, and Sentry.',
  },
];

const STATUS_META: Record<
  ServiceStatus,
  { label: string; badge: string; dot: string }
> = {
  OPERATIONAL: {
    label: 'Operational',
    badge: 'border-ok-500/30 bg-ok-500/10 text-ok-400',
    dot: 'bg-ok-400',
  },
  DEGRADED: {
    label: 'Degraded',
    badge: 'border-warn-500/35 bg-warn-500/15 text-warn-400',
    dot: 'bg-warn-400',
  },
  PARTIAL_OUTAGE: {
    label: 'Partial outage',
    badge: 'border-warn-500/35 bg-warn-500/15 text-warn-400',
    dot: 'bg-warn-400',
  },
  MAJOR_OUTAGE: {
    label: 'Major outage',
    badge: 'border-crit-500/40 bg-crit-500/15 text-crit-400',
    dot: 'bg-crit-400',
  },
};

export function Topology() {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string>('postgres-primary');
  const [tierFilter, setTierFilter] = useState<'ALL' | BrainNode['tier']>('ALL');
  const [cascadeCount, setCascadeCount] = useState(0);
  const [isCascading, setIsCascading] = useState(false);

  const selected = useMemo(
    () => BRAIN_NODES.find((s) => s.id === selectedId) ?? BRAIN_NODES[0]!,
    [selectedId]
  );

  // Compute upstream + downstream synaptic blast radius for the selected cortical node
  const { upstream, downstream, activeSet } = useMemo(() => {
    const down = new Set<string>(selected.deps);
    const up = new Set<string>();
    for (const s of BRAIN_NODES) {
      if (s.deps.includes(selected.id)) up.add(s.id);
    }
    const all = new Set<string>([selected.id, ...down, ...up]);
    return { upstream: up, downstream: down, activeSet: all };
  }, [selected]);

  const filteredNodes = useMemo(
    () =>
      tierFilter === 'ALL'
        ? BRAIN_NODES
        : BRAIN_NODES.filter((n) => n.tier === tierFilter),
    [tierFilter]
  );

  const triggerSynapticCascade = () => {
    if (isCascading) return;
    setIsCascading(true);
    const sequence = [
      'webhook-ingest',
      'postgres-primary',
      'checkout-api',
      'payments-svc',
      'arch-v1.1',
      'status-page',
      'audit-ledger',
      'postgres-primary',
    ];
    sequence.forEach((nodeId, idx) => {
      window.setTimeout(() => {
        setSelectedId(nodeId);
        setCascadeCount((c) => c + 1);
        if (idx === sequence.length - 1) {
          setIsCascading(false);
        }
      }, idx * 420);
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.neural-reveal',
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
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
      id="topology"
      ref={sectionRef}
      className="relative border-b border-[#222] bg-[#050608] overflow-hidden"
    >
      <Container>
        <div className="md:border-x border-[#222]">
          {/* Section Header */}
          <div className="neural-reveal flex flex-col gap-5 border-b border-[#222] px-5 py-10 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
                <span className="size-1.5 rounded-full bg-[#3b8ef4]" />
                <span>SERVICE DEPENDENCY MAP</span>
              </div>
              <GsapTextReveal as="h2" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight text-left">
                Explore Service Dependencies
              </GsapTextReveal>
              <p className="mt-2 max-w-2xl text-left font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Select a service to trace dependencies and incident impact.
              </p>
            </div>

            {/* Interactive Controls: Lobe Filters + Synaptic Cascade Trigger */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-[#222] bg-[#0b0c10] p-1 font-mono text-[11px]">
                {(['ALL', 'Edge', 'Core', 'Data', 'Platform'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 transition-colors cursor-pointer',
                      tierFilter === tier
                        ? 'bg-white text-black font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    {tier === 'ALL' ? 'All (12)' : tier}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={triggerSynapticCascade}
                disabled={isCascading}
                className="inline-flex items-center gap-2 rounded-xl border border-[#3b8ef4]/60 bg-[#3b8ef4] px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-[0_10px_28px_rgba(59,142,244,0.2)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <span>⚡</span>
                <span>{isCascading ? 'Cascading Synapse...' : 'Pulse Map'}</span>
              </button>
            </div>
          </div>

          {/* ================================================================
              Interactive Neural Brain Stage + Right-Hand Cortical Inspector
             ================================================================ */}
          <div className="neural-reveal grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#222] border-b border-[#222]">
            {/* Left 8 Columns: Pure #000000 Neural Brain Interactive Stage */}
            <div className="lg:col-span-8 relative bg-black">
              {/* Top Overlay Telemetry Bar */}
              <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 border-b border-[#222] bg-[#050608]/90 px-4 py-2.5 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="size-2 rounded-full bg-[#3b8ef4] animate-pulse-dot" />
                  <span>CORTEX LOCK:</span>
                  <span className="font-semibold text-white">{selected.name}</span>
                  <span className="text-zinc-500">({selected.lobe})</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#22d3ee]" /> Operational
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#fbbf24]" /> Degraded
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#f43f5e]" /> Major Outage
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#3b8ef4]" /> Selected Focus
                  </span>
                </div>
              </div>

              {/* Neural Brain Interactive Canvas + Image */}
              <TopologyScene
                nodes={BRAIN_NODES}
                selectedId={selectedId}
                activeSet={activeSet}
                onSelect={setSelectedId}
                cascadeCount={cascadeCount}
              />

              {/* Bottom Stage Caption */}
              <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 border-t border-[#222] bg-[#050608]/95 px-4 py-2.5 font-mono text-[11px] text-zinc-400">
                <span>
                  Move pointer across the brain to excite local cortical filaments · Click any node to isolate blast radius
                </span>
                <span className="text-zinc-300 tnum">
                  Active synaptic path: <strong className="text-[#3b8ef4]">{activeSet.size}</strong> / {BRAIN_NODES.length} nodes
                </span>
              </div>
            </div>

            {/* Right 4 Columns: Vengeance UI Cortical Node Inspector */}
            <aside
              aria-label="Selected neural node details"
              className="lg:col-span-4 flex flex-col justify-between bg-[#08090c] p-5 md:p-6"
            >
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-[#222] pb-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#3b8ef4]">
                      {selected.tier} Tier · {selected.lobe}
                    </div>
                    <h3 className="mt-1 font-orbitron text-xl font-bold text-white">
                      {selected.name}
                    </h3>
                    <div className="mt-0.5 font-mono text-xs text-zinc-500">
                      owner: {selected.owner}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${STATUS_META[selected.status].badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${STATUS_META[selected.status].dot}`} />
                    {STATUS_META[selected.status].label}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-zinc-300">
                  {selected.summary}
                </p>

                {/* Metrics Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[#222] bg-[#0d0e13] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      90-Day Uptime
                    </div>
                    <div className="mt-1 font-orbitron text-lg font-bold text-white tnum">
                      {selected.uptime}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#222] bg-[#0d0e13] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      p99 Latency
                    </div>
                    <div
                      className={`mt-1 font-orbitron text-lg font-bold tnum ${
                        selected.status === 'MAJOR_OUTAGE'
                          ? 'text-crit-400'
                          : selected.status === 'DEGRADED'
                          ? 'text-[#3b8ef4]'
                          : 'text-white'
                      }`}
                    >
                      {selected.latency}
                    </div>
                  </div>
                </div>

                {/* Upstream Callers */}
                <div className="mt-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Upstream Services ({upstream.size})
                  </div>
                  {upstream.size === 0 ? (
                    <div className="mt-2 rounded-lg border border-[#222] bg-[#0b0c10] px-3 py-2 font-mono text-xs text-zinc-500">
                      Entry-point receptor — no upstream callers
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...upstream].map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedId(id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-200 transition-colors hover:border-[#3b8ef4] hover:text-[#3b8ef4] cursor-pointer"
                        >
                          <span>←</span>
                          <span>{id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Downstream Dependencies */}
                <div className="mt-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Downstream Services ({downstream.size})
                  </div>
                  {downstream.size === 0 ? (
                    <div className="mt-2 rounded-lg border border-[#222] bg-[#0b0c10] px-3 py-2 font-mono text-xs text-zinc-500">
                      Terminal datastore — zero downstream dependencies
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...downstream].map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedId(id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-200 transition-colors hover:border-[#3b8ef4] hover:text-[#3b8ef4] cursor-pointer"
                        >
                          <span>→</span>
                          <span>{id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Inspector Action */}
              <div className="mt-6 border-t border-[#222] pt-4 flex items-center justify-between gap-2">
                <Link
                  href="/status/arch"
                  className="font-mono text-xs text-zinc-300 hover:text-[#3b8ef4] transition-colors"
                >
                  Open public status ledger →
                </Link>
                <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  SYNCED
                </span>
              </div>
            </aside>
          </div>

          {/* ================================================================
              Synchronized Cortical Service Matrix Table
             ================================================================ */}
          <div className="neural-reveal overflow-x-auto bg-[#06070a]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222] font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  <th className="py-3 px-5">Service Node</th>
                  <th className="py-3 px-4">Cortical Region</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">90d Uptime</th>
                  <th className="py-3 px-5 text-right">p99 Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18191e] text-xs">
                {filteredNodes.map((s) => {
                  const isSel = s.id === selectedId;
                  const inBlast = activeSet.has(s.id);
                  const meta = STATUS_META[s.status];
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSel
                          ? 'bg-[#3b8ef4]/[0.07]'
                          : inBlast
                          ? 'bg-white/[0.02] hover:bg-white/[0.04]'
                          : 'opacity-60 hover:opacity-100 hover:bg-white/[0.03]'
                      )}
                    >
                      <td className="py-2.5 px-5 font-mono font-medium text-white flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: isSel ? '#3b8ef4' : s.color }}
                        />
                        <span>{s.name}</span>
                        {isSel && (
                          <span className="rounded bg-[#3b8ef4] px-1.5 py-0.2 font-mono text-[9px] font-bold text-white">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-400">{s.lobe}</td>
                      <td className="py-2.5 px-4 font-mono text-zinc-500">{s.tier}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] ${meta.badge}`}
                        >
                          <span className={`size-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-zinc-300 tnum">
                        {s.uptime}
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono text-zinc-200 tnum">
                        {s.latency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </section>
  );
}
