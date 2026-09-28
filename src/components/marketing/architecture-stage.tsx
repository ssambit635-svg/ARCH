'use client';

import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { usePrefersReducedMotion } from '@/lib/motion';
import { AI_NAME } from '@/lib/brand';
import { Sparkline } from '@/components/ui/sparkline';

export interface ArchitectureNode {
  id: string;
  name: string;
  tier: 'edge' | 'services' | 'data' | 'kernel';
  status: 'ok' | 'degraded' | 'down';
  rps: string;
  p99: string;
  errorRate: string;
  memory: string;
  description: string;
  downstream: string[];
  upstream: string[];
}

export const ARCH_NODES: ArchitectureNode[] = [
  // Tier 1: Ingress & Edge
  {
    id: 'edge-cdn',
    name: 'Global Edge CDN (Anycast)',
    tier: 'edge',
    status: 'ok',
    rps: '48.2k/s',
    p99: '8ms',
    errorRate: '0.001%',
    memory: '42%',
    description: 'Cloudflare / Fastly Anycast edge network with DDoS mitigation and HTTP/3 termination.',
    downstream: ['api-gateway', 'ssl-proxy'],
    upstream: [],
  },
  {
    id: 'api-gateway',
    name: 'API Mesh Gateway',
    tier: 'edge',
    status: 'ok',
    rps: '34.8k/s',
    p99: '14ms',
    errorRate: '0.04%',
    memory: '56%',
    description: 'Envoy-based API gateway routing traffic to downstream microservices with rate-limiting.',
    downstream: ['checkout-api', 'payments-svc', 'auth-vault'],
    upstream: ['edge-cdn'],
  },

  // Tier 2: Microservices Mesh
  {
    id: 'checkout-api',
    name: 'checkout-api (Core Service)',
    tier: 'services',
    status: 'down',
    rps: '12.4k/s',
    p99: '4.21s',
    errorRate: '8.42%',
    memory: '91%',
    description: 'Handles cart checkout transactions and order state machine. Experiencing thread starvation.',
    downstream: ['pg-primary', 'redis-cache', 'payments-svc'],
    upstream: ['api-gateway'],
  },
  {
    id: 'payments-svc',
    name: 'Payment Orchestrator',
    tier: 'services',
    status: 'degraded',
    rps: '6.8k/s',
    p99: '610ms',
    errorRate: '1.85%',
    memory: '68%',
    description: 'PCI-DSS isolated payment processing engine with idempotent webhook retries.',
    downstream: ['pg-primary', 'event-queue'],
    upstream: ['api-gateway', 'checkout-api'],
  },
  {
    id: 'auth-vault',
    name: 'Identity & Auth Vault',
    tier: 'services',
    status: 'ok',
    rps: '18.1k/s',
    p99: '22ms',
    errorRate: '0.00%',
    memory: '48%',
    description: 'Session signing, JWT tokens, RBAC permissions, and multi-tenant isolation.',
    downstream: ['redis-cache', 'pg-primary'],
    upstream: ['api-gateway'],
  },

  // Tier 3: Resilient Data Clusters
  {
    id: 'pg-primary',
    name: 'PostgreSQL 16 Primary Cluster',
    tier: 'data',
    status: 'degraded',
    rps: '14.2k/s',
    p99: '218ms',
    errorRate: '0.8%',
    memory: '84%',
    description: 'Primary ACID database. Connection pool saturated (10/10 active connections, 42 queries queued).',
    downstream: ['pg-replica', 'arch-engine'],
    upstream: ['checkout-api', 'payments-svc', 'auth-vault'],
  },
  {
    id: 'redis-cache',
    name: 'Redis Cluster L2 Cache',
    tier: 'data',
    status: 'ok',
    rps: '42.9k/s',
    p99: '1.2ms',
    errorRate: '0.00%',
    memory: '38%',
    description: 'Distributed in-memory caching cluster with 99.4% hit-rate and sub-millisecond lookups.',
    downstream: [],
    upstream: ['checkout-api', 'auth-vault'],
  },
  {
    id: 'event-queue',
    name: 'Event Bus & Kafka Queue',
    tier: 'data',
    status: 'ok',
    rps: '16.5k/s',
    p99: '4ms',
    errorRate: '0.00%',
    memory: '45%',
    description: 'Durable event log for background asynchronous notification jobs and telemetry ingestion.',
    downstream: ['arch-engine'],
    upstream: ['payments-svc'],
  },

  // Tier 4: ARCH Autonomous Incident Core
  {
    id: 'arch-engine',
    name: 'ARCH V1.1 On-Call Engine',
    tier: 'kernel',
    status: 'ok',
    rps: 'Realtime',
    p99: '6ms',
    errorRate: '0.00%',
    memory: '18MB',
    description: 'Compiled on-device deterministic incident engine. Performs 5-100ms blast radius analysis and triage.',
    downstream: ['audit-ledger'],
    upstream: ['pg-primary', 'event-queue'],
  },
  {
    id: 'audit-ledger',
    name: 'Merkle Audit Hash-Ledger',
    tier: 'kernel',
    status: 'ok',
    rps: '100% sealed',
    p99: '0.8ms',
    errorRate: '0.00%',
    memory: '22MB',
    description: 'Append-only SHA-256 hash-chained transaction ledger sealing every write in the same DB transaction.',
    downstream: [],
    upstream: ['arch-engine'],
  },
];

const TIERS = [
  { id: 'edge', label: 'Tier 01: Ingress & Edge Gateway', zOffset: 120 },
  { id: 'services', label: 'Tier 02: Distributed Microservices Mesh', zOffset: 60 },
  { id: 'data', label: 'Tier 03: High-Availability Data Clusters', zOffset: 0 },
  { id: 'kernel', label: 'Tier 04: ARCH Autonomous Incident Core', zOffset: -60 },
] as const;

export function ArchitectureStage({ className = '' }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [activeNodeId, setActiveNodeId] = useState<string>('checkout-api');
  const [exploded, setExploded] = useState<boolean>(true);
  const [isSimulatingFix, setIsSimulatingFix] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'isometric' | 'matrix' | 'graph'>('isometric');

  // Interactive 3D tilt tracking
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef({ x: 0, y: 0, tiltX: 0, tiltY: 0 });

  const activeNode = ARCH_NODES.find((n) => n.id === activeNodeId) ?? ARCH_NODES[2]!;

  // Mouse / Pointer Parallax
  const handlePointerMove = (e: React.PointerEvent) => {
    if (reduced || isDragging) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Math.max(-15, Math.min(15, -ny * 22)),
      y: Math.max(-20, Math.min(20, nx * 28)),
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tiltX: tilt.x,
      tiltY: tilt.y,
    };
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTilt({
      x: Math.max(-25, Math.min(25, dragStart.current.tiltX - dy * 0.15)),
      y: Math.max(-35, Math.min(35, dragStart.current.tiltY + dx * 0.2)),
    });
  };

  // Simulated Fix Lifecycle
  const triggerSimulation = () => {
    if (isSimulatingFix) return;
    setIsSimulatingFix(true);
    setSimStep(1); // Diagnosing

    setTimeout(() => setSimStep(2), 1200); // Verified Test Run
    setTimeout(() => setSimStep(3), 2600); // Applying Fix
    setTimeout(() => {
      setSimStep(4); // Resolved
      setTimeout(() => {
        setIsSimulatingFix(false);
        setSimStep(0);
      }, 3500);
    }, 4200);
  };

  // Sparkline generator
  const sparkData = useMemo(() => {
    if (activeNode.status === 'down') {
      return [12, 14, 15, 18, 45, 98, 120, 115, 128, 140, 155, 160];
    }
    if (activeNode.status === 'degraded') {
      return [30, 32, 28, 45, 62, 58, 64, 70, 68, 72, 75, 71];
    }
    return [10, 12, 11, 10, 13, 11, 12, 10, 11, 12, 11, 10];
  }, [activeNode.status]);

  return (
    <div
      ref={containerRef}
      onPointerMove={isDragging ? handleDragMove : handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`relative select-none overflow-hidden rounded-2xl border border-white/[0.09] bg-ink-950/90 backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      {/* Top Header Console Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-blue-600" />
          </div>
          <div>
            <span className="arch-mono text-[11px] font-bold uppercase tracking-[0.15em] text-bone">
              Mission Control Matrix
            </span>
            <span className="arch-mono ml-2.5 hidden text-[10px] tracking-[0.08em] text-ash-400 sm:inline">
              4 Tiers · 10 Active Nodes · Realtime Blast Radius
            </span>
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExploded(!exploded)}
            className={`arch-mono rounded-md border px-2.5 py-1 text-[10.5px] uppercase tracking-[0.1em] transition-all ${
              exploded
                ? 'border-blue-500/50 bg-blue-500/15 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                : 'border-white/[0.1] bg-white/[0.03] text-ash-400 hover:text-bone'
            }`}
          >
            {exploded ? '3D Exploded' : '3D Collapsed'}
          </button>

          <button
            onClick={triggerSimulation}
            disabled={isSimulatingFix}
            className={`arch-mono flex items-center gap-1.5 rounded-md border px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] transition-all ${
              isSimulatingFix
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 animate-pulse'
                : 'border-blue-500/40 bg-blue-600/20 text-blue-200 hover:bg-blue-600/35 hover:text-white'
            }`}
          >
            {isSimulatingFix ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {simStep === 1 && 'Triage Running…'}
                {simStep === 2 && 'Sandboxed Test…'}
                {simStep === 3 && 'Fix Applied…'}
                {simStep === 4 && '100% Operational'}
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-blue-400" />
                Simulate Triage Fix
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 3D Interactive Stage (Columns 1-8) */}
        <div className="relative min-h-[380px] p-6 sm:min-h-[460px] lg:col-span-8">
          {/* Subtle Grid Background */}
          <div className="arch-grid-blue pointer-events-none absolute inset-0 opacity-40" />

          {/* 3D Isometric Viewport Container */}
          <div
            className="relative flex size-full items-center justify-center"
            style={{
              perspective: '1200px',
            }}
          >
            <div
              className="relative w-full max-w-[560px] transition-transform duration-500 ease-out"
              style={{
                transform: `rotateX(${50 + tilt.x}deg) rotateZ(${-32 + tilt.y}deg) translateY(-20px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {TIERS.map((tier, tierIdx) => {
                const tierNodes = ARCH_NODES.filter((n) => n.tier === tier.id);
                const isElevationActive = exploded ? tier.zOffset * 0.95 : 0;

                return (
                  <div
                    key={tier.id}
                    className="relative mb-6 rounded-xl border border-white/[0.12] bg-slate-900/80 p-4 shadow-2xl backdrop-blur-md transition-all duration-700 ease-out hover:border-blue-500/40 hover:bg-slate-900/95"
                    style={{
                      transform: `translateZ(${isElevationActive}px)`,
                      boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Layer Header Label */}
                    <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className="arch-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ash-400">
                        {tier.label}
                      </span>
                      <span className="arch-mono text-[9px] uppercase tracking-[0.1em] text-blue-400">
                        Z+{isElevationActive}px
                      </span>
                    </div>

                    {/* Nodes in this Tier */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {tierNodes.map((node) => {
                        const isSelected = activeNodeId === node.id;
                        const isNodeDown =
                          simStep === 4 ? false : isSimulatingFix && node.id === 'checkout-api' ? simStep < 3 : node.status === 'down';
                        const isNodeDegraded =
                          simStep === 4 ? false : isSimulatingFix && node.id === 'pg-primary' ? simStep < 3 : node.status === 'degraded';

                        return (
                          <button
                            key={node.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveNodeId(node.id);
                            }}
                            className={`group relative flex flex-col items-start rounded-lg border p-2.5 text-left transition-all duration-300 ${
                              isSelected
                                ? 'border-blue-500 bg-blue-950/40 shadow-[0_0_18px_rgba(59,130,246,0.3)]'
                                : 'border-white/[0.08] bg-slate-950/60 hover:border-white/20 hover:bg-slate-900/80'
                            }`}
                          >
                            {/* Status Indicator Bar */}
                            <div className="mb-1.5 flex w-full items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={`size-2 rounded-full ${
                                    isNodeDown
                                      ? 'bg-red-500 animate-ping'
                                      : isNodeDegraded
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400'
                                  }`}
                                />
                                <span
                                  className={`size-2 -ml-3.5 rounded-full ${
                                    isNodeDown
                                      ? 'bg-red-500'
                                      : isNodeDegraded
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400'
                                  }`}
                                />
                                <span className="arch-mono text-[8.5px] uppercase tracking-[0.08em] text-ash-400">
                                  {isNodeDown ? 'OUTAGE' : isNodeDegraded ? 'WARN' : 'NOMINAL'}
                                </span>
                              </span>
                              <span className="arch-mono text-[9px] text-ash-500">{node.rps}</span>
                            </div>

                            {/* Node Title */}
                            <span className="arch-mono truncate text-[11px] font-bold text-bone group-hover:text-blue-300">
                              {node.name.split(' ')[0]}
                            </span>

                            {/* Latency badge */}
                            <span
                              className={`arch-mono mt-1 text-[9.5px] font-medium ${
                                isNodeDown ? 'text-red-400 font-bold' : isNodeDegraded ? 'text-amber-300' : 'text-ash-400'
                              }`}
                            >
                              p99: {isNodeDown && simStep === 4 ? '18ms' : node.p99}
                            </span>

                            {/* Active selection glow border */}
                            {isSelected && (
                              <span
                                className="absolute inset-0 rounded-lg border border-blue-400/60 pointer-events-none"
                                aria-hidden
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Hint Banner */}
          <div className="pointer-events-none absolute bottom-4 left-6 flex items-center gap-2 arch-mono text-[10px] uppercase tracking-[0.12em] text-ash-500">
            <span className="size-1.5 rounded-full bg-blue-500" />
            <span>Interactive 3D Stage · Drag to Rotate · Click Node to Inspect</span>
          </div>
        </div>

        {/* Right Inspector Telemetry Card (Columns 9-12) */}
        <div className="flex flex-col border-t border-white/[0.08] bg-slate-950/80 p-5 sm:p-6 lg:border-l lg:border-t-0 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <span className="arch-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-blue-400">
              Live Telemetry HUD
            </span>
            <span
              className={`arch-mono rounded px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] ${
                activeNode.status === 'down'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : activeNode.status === 'degraded'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {activeNode.status === 'down' ? 'SEV-1 ACTIVE' : activeNode.status === 'degraded' ? 'ELEVATED' : 'OPERATIONAL'}
            </span>
          </div>

          <div className="mt-4">
            <h4 className="arch-display text-[17px] font-bold text-bone">{activeNode.name}</h4>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ash-400">{activeNode.description}</p>
          </div>

          {/* Real-time Metrics Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/[0.07] py-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-500">Throughput</span>
              <p className="arch-display arch-tabular mt-1 text-[18px] font-bold text-bone">{activeNode.rps}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-500">P99 Latency</span>
              <p
                className={`arch-display arch-tabular mt-1 text-[18px] font-bold ${
                  activeNode.status === 'down' ? 'text-red-400' : 'text-bone'
                }`}
              >
                {activeNode.p99}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-500">Error Rate</span>
              <p
                className={`arch-display arch-tabular mt-1 text-[18px] font-bold ${
                  activeNode.status === 'down' ? 'text-red-400' : 'text-bone'
                }`}
              >
                {activeNode.errorRate}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-500">Memory / Load</span>
              <p className="arch-display arch-tabular mt-1 text-[18px] font-bold text-bone">{activeNode.memory}</p>
            </div>
          </div>

          {/* Latency History Graph */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-500">Latency Waveform</span>
              <span className="arch-mono text-[9px] text-blue-400">Last 60s</span>
            </div>
            <div className="mt-2 rounded-lg border border-white/[0.06] bg-ink-1000/60 p-3">
              <Sparkline points={sparkData} width={260} height={40} strokeWidth={2} />
            </div>
          </div>

          {/* Blast Radius Dependencies */}
          <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-3">
            <span className="arch-mono text-[9.5px] uppercase tracking-[0.12em] text-ash-500">Blast Radius Links</span>
            <div className="flex flex-wrap gap-1.5">
              {activeNode.downstream.length > 0 ? (
                activeNode.downstream.map((dep) => (
                  <span
                    key={dep}
                    className="arch-mono rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[9.5px] text-blue-300"
                  >
                    ↓ {dep}
                  </span>
                ))
              ) : (
                <span className="arch-mono text-[9.5px] text-ash-500">Terminal Node</span>
              )}
            </div>
          </div>

          {/* AI Autonomous Diagnosis Chip */}
          <div className="mt-auto pt-4">
            <div className="rounded-xl border border-blue-500/25 bg-blue-950/25 p-3">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-blue-400" />
                <span className="arch-mono text-[10px] font-bold uppercase tracking-[0.14em] text-blue-300">
                  {AI_NAME} Advisory
                </span>
              </div>
              <p className="arch-mono mt-1.5 text-[11px] leading-relaxed text-ash-300">
                {activeNode.status === 'down'
                  ? 'Root Cause: pg connection pool 10/10 saturated. Recommended: pool_size 10→40.'
                  : activeNode.status === 'degraded'
                    ? 'Upstream dependency latency cascade. Downstream queue healthy.'
                    : 'All service SLO targets operating within nominal error budget.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
