'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Reveal } from './reveal';
import { SketchfabStage, RACK_MODELS } from './sketchfab-stage';
import { EDGES, NODES } from './topology-scene';
import { usePrefersReducedMotion, useViewportWidth } from '@/lib/motion';

/**
 * Topology — blast radius, made interactive.
 *
 * ARCH computes what a change or a failure can touch by walking the service dependency graph. This
 * section hands the visitor that same graph to play with: hover a node in WebGL or a row in the
 * list and one inspector updates from both, which is exactly how the product's own inspector behaves.
 *
 * Two stages, switchable:
 *   graph — the procedural dependency topology, rendered locally, shaped by the incident data
 *   rack  — a real CC-BY Sketchfab model in Sketchfab's own viewer, for material truth
 *
 * The switcher is honest about the trade-off: the graph needs no network and is data-shaped; the
 * rack is a scanned asset and is lazy-mounted only while it is the selected stage.
 */

const TopologyScene = dynamic(() => import('./topology-scene').then((mod) => mod.TopologyScene), {
  ssr: false,
  loading: () => (
    <div className="arch-grid-fine grid size-full place-items-center bg-ink-950">
      <span className="arch-mono text-[10.5px] uppercase tracking-[0.16em] text-ash-600">compiling graph…</span>
    </div>
  ),
});

/** Operational detail per node. In the product this is a real query; here it is a fixed snapshot so
 *  the inspector is never showing a number the graph disagrees with. */
const INFO: Record<string, { region: string; status: 'ok' | 'degraded' | 'down' | 'maint'; p99: string; owner: string }> = {
  cdn: { region: 'global · 42 PoP', status: 'ok', p99: '11 ms', owner: 'platform' },
  lb: { region: 'eu-west-1', status: 'ok', p99: '3 ms', owner: 'platform' },
  gateway: { region: 'eu-west · us-east', status: 'ok', p99: '38 ms', owner: 'edge-team' },
  checkout: { region: 'eu-west-1', status: 'down', p99: '4.21 s', owner: 'payments-squad' },
  payments: { region: 'eu-west-1 · PCI', status: 'degraded', p99: '612 ms', owner: 'payments-squad' },
  auth: { region: 'multi', status: 'ok', p99: '44 ms', owner: 'identity' },
  webhooks: { region: 'eu-west-1', status: 'ok', p99: '19 ms', owner: 'platform' },
  notify: { region: 'eu-west-1', status: 'ok', p99: '—', owner: 'platform' },
  pg: { region: 'eu-west-1 · primary', status: 'degraded', p99: '218 ms', owner: 'data-team' },
  replica: { region: 'eu-west-1', status: 'ok', p99: '96 ms', owner: 'data-team' },
  redis: { region: 'eu-west-1', status: 'ok', p99: '2 ms', owner: 'data-team' },
  queue: { region: 'eu-west-1', status: 'ok', p99: '7 ms', owner: 'platform' },
  arch: { region: 'in-process', status: 'ok', p99: '78 ms', owner: 'arch-v1.1' },
  audit: { region: 'same tx', status: 'ok', p99: '1 ms', owner: 'arch-v1.1' },
};

const STATUS_STYLE: Record<string, { text: string; dot: string; label: string }> = {
  ok: { text: 'text-state-ok', dot: 'bg-state-ok', label: 'operational' },
  degraded: { text: 'text-sev-high', dot: 'bg-sev-high', label: 'degraded' },
  down: { text: 'text-sev-critical', dot: 'bg-sev-critical', label: 'outage' },
  maint: { text: 'text-state-info', dot: 'bg-state-info', label: 'maintenance' },
};

const nodeById = new Map(NODES.map((node) => [node.id, node]));

type View = 'graph' | 'rack';

export function Topology() {
  const reduced = usePrefersReducedMotion();
  const width = useViewportWidth();
  const [view, setView] = useState<View>('graph');
  const [rackIndex, setRackIndex] = useState(0);
  const [inspected, setInspected] = useState<string | null>('checkout');

  const degrees = useMemo(() => {
    const upstream = new Map<string, number>();
    const downstream = new Map<string, number>();
    for (const edge of EDGES) {
      downstream.set(edge.from, (downstream.get(edge.from) ?? 0) + 1);
      upstream.set(edge.to, (upstream.get(edge.to) ?? 0) + 1);
    }
    return { upstream, downstream };
  }, []);

  /**
   * Blast radius: everything reachable from the inspected node, counting dependencies as
   * bidirectional the way a real saturation event travels — a saturated database takes its callers
   * down, and a dead caller stops feeding its dependents.
   */
  const blast = useMemo(() => {
    if (!inspected) return [];
    const adjacency = new Map<string, string[]>();
    for (const edge of EDGES) {
      const forward = adjacency.get(edge.from) ?? [];
      forward.push(edge.to);
      adjacency.set(edge.from, forward);
      const backward = adjacency.get(edge.to) ?? [];
      backward.push(edge.from);
      adjacency.set(edge.to, backward);
    }
    const seen = new Set<string>([inspected]);
    let frontier = [inspected];
    let depth = 0;
    const rings: { id: string; depth: number }[] = [];
    while (frontier.length && depth < 6) {
      depth += 1;
      const next: string[] = [];
      for (const id of frontier) {
        for (const neighbour of adjacency.get(id) ?? []) {
          if (seen.has(neighbour)) continue;
          seen.add(neighbour);
          next.push(neighbour);
          rings.push({ id: neighbour, depth });
        }
      }
      frontier = next;
    }
    return rings;
  }, [inspected]);

  const activeNode = NODES.find((node) => node.id === inspected);
  const activeInfo = inspected ? INFO[inspected] : undefined;
  const activeStatus = activeInfo ? STATUS_STYLE[activeInfo.status] : undefined;
  const rack = RACK_MODELS[rackIndex];
  const render3D = !reduced && width >= 720;

  return (
    <section
      id="topology"
      className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.07] bg-ink-1000"
      aria-label="Service topology and blast radius"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(78% 52% at 22% 8%, rgb(255 68 56 / 0.045), transparent 66%)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-8 lg:mb-16">
          <div className="max-w-[38rem]">
            <Reveal variant="fade">
              <p className="arch-mono mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-500">
                <span className="block h-px w-8 bg-signal-500" aria-hidden />
                topology
              </p>
            </Reveal>
            <Reveal variant="mask" duration={1000}>
              <h2 className="arch-display text-[clamp(2.1rem,4.6vw,3.6rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-bone">
                Know what breaks
                <br />
                before you ship it.
              </h2>
            </Reveal>
            <Reveal variant="rise" delay={120}>
              <p className="mt-6 text-[15px] leading-[1.75] text-ash-400">
                Every service declares what it depends on. ARCH walks that graph in both directions
                the moment an alert or a deploy lands, and tells you the blast radius before you find
                out from a customer. Hover anything — the inspector follows.
              </p>
            </Reveal>
          </div>

          {/* Stage switcher */}
          <Reveal variant="rise" delay={200}>
            <div className="inline-flex rounded-lg border border-white/[0.09] bg-white/[0.02] p-1" role="tablist" aria-label="3D stage">
              {(
                [
                  ['graph', 'Dependency graph', 'local · WebGL'],
                  ['rack', 'Rack', 'Sketchfab · CC BY'],
                ] as [View, string, string][]
              ).map(([key, label, hint]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  data-cursor
                  className={`relative rounded-md px-3.5 py-2 text-left transition-colors duration-300 ${
                    view === key ? 'bg-bone text-ink-1000' : 'text-ash-400 hover:text-bone'
                  }`}
                >
                  <span className="block text-[12.5px] font-semibold leading-tight">{label}</span>
                  <span
                    className={`arch-mono block text-[9px] uppercase tracking-[0.1em] leading-tight ${
                      view === key ? 'text-ink-1000/55' : 'text-ash-600'
                    }`}
                  >
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-8">
          {/* ---- Inspector ---- */}
          <div className="order-2 space-y-4 lg:order-1">
            <div className="arch-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
                <span className="arch-mono text-[9.5px] uppercase tracking-[0.16em] text-ash-500">inspector</span>
                <span className="arch-mono text-[9.5px] tracking-[0.08em] text-ash-600">
                  {activeNode?.tier ?? '—'}
                </span>
              </div>

              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="arch-mono truncate text-[14px] font-semibold text-bone">{activeNode?.label ?? inspected ?? '—'}</p>
                  {activeStatus && (
                    <span className={`arch-mono flex shrink-0 items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] ${activeStatus.text}`}>
                      <span className={`size-1.5 rounded-full ${activeStatus.dot}`} />
                      {activeStatus.label}
                    </span>
                  )}
                </div>

                <dl className="arch-mono mt-4 space-y-2 text-[11px]">
                  {[
                    ['region', activeInfo?.region ?? '—'],
                    ['p99', activeInfo?.p99 ?? '—'],
                    ['owner', activeInfo?.owner ?? '—'],
                    ['depends on', String(degrees.upstream.get(inspected ?? '') ?? 0)],
                    ['depended on by', String(degrees.downstream.get(inspected ?? '') ?? 0)],
                  ].map(([key, value]) => (
                    <div key={key} className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] pb-1.5 last:border-0">
                      <dt className="text-[10px] uppercase tracking-[0.12em] text-ash-600">{key}</dt>
                      <dd className="arch-tabular truncate text-right text-ash-200">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="border-t border-white/[0.07] bg-white/[0.015] px-4 py-3.5">
                <p className="arch-mono mb-2.5 flex items-baseline justify-between text-[9.5px] uppercase tracking-[0.14em] text-ash-500">
                  blast radius
                  <span className="arch-tabular text-[13px] font-bold normal-case tracking-[-0.01em] text-sev-critical">
                    {blast.length}
                  </span>
                </p>
                {blast.length === 0 ? (
                  <p className="text-[11.5px] leading-relaxed text-ash-600">Isolated — nothing depends on this service.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {blast.slice(0, 12).map((hop) => {
                      const status = INFO[hop.id]?.status ?? 'ok';
                      return (
                        <li key={`${hop.id}-${hop.depth}`}>
                          <button
                            type="button"
                            onClick={() => setInspected(hop.id)}
                            data-cursor
                            className="arch-mono flex items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-white/[0.02] px-1.5 py-1 text-[10px] text-ash-300 transition hover:border-white/20 hover:text-bone"
                            title={`hop ${hop.depth} from ${inspected}`}
                          >
                            <span className={`size-1 rounded-full ${STATUS_STYLE[status]?.dot ?? 'bg-ash-500'}`} />
                            {nodeById.get(hop.id)?.label ?? hop.id}
                            <span className="arch-tabular text-ash-700">{hop.depth}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-ash-600">
                  Numbers are hop distance. A dependency graph fails in both directions, so ARCH walks
                  it both ways.
                </p>
              </div>
            </div>

            {/* Rack model picker, only relevant to the Sketchfab stage. */}
            {view === 'rack' && (
              <div className="arch-panel overflow-hidden">
                <p className="arch-mono border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-[9.5px] uppercase tracking-[0.16em] text-ash-500">
                  models · CC BY
                </p>
                <ul className="divide-y divide-white/[0.06]">
                  {RACK_MODELS.map((model, index) => (
                    <li key={model.uid}>
                      <button
                        type="button"
                        onClick={() => setRackIndex(index)}
                        data-cursor
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-250 ${
                          rackIndex === index ? 'bg-white/[0.045]' : 'hover:bg-white/[0.025]'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className={`block truncate text-[12.5px] font-medium ${rackIndex === index ? 'text-bone' : 'text-ash-300'}`}>
                            {model.title}
                          </span>
                          <span className="arch-mono block truncate text-[9.5px] tracking-[0.06em] text-ash-600">
                            {model.author} · {model.detail}
                          </span>
                        </span>
                        <span
                          className={`size-1.5 shrink-0 rounded-full transition-colors ${
                            rackIndex === index ? 'bg-signal-500' : 'bg-white/[0.14]'
                          }`}
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ---- Stage ---- */}
          <div className="order-1 lg:order-2">
            <div className="arch-panel relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
                <span className="arch-mono flex items-center gap-2 text-[9.5px] uppercase tracking-[0.16em] text-ash-500">
                  <span className="size-1.5 animate-pulse-dot rounded-full bg-sev-critical" />
                  {view === 'graph' ? 'dependency graph · live' : 'sketchfab viewer'}
                </span>
                <span className="arch-mono text-[9.5px] tracking-[0.08em] text-ash-600">
                  {view === 'graph' ? `${NODES.length} nodes · ${EDGES.length} edges` : rack?.licence}
                </span>
              </div>

              <div className="relative h-[26rem] sm:h-[32rem] lg:h-[38rem]">
                {/* Both stages stay mounted-then-hidden rather than unmounted, so switching back to
                    the graph does not recompile the WebGL context and stutter. */}
                <div className={`absolute inset-0 ${view === 'graph' ? '' : 'pointer-events-none invisible'}`}>
                  {render3D ? (
                    <TopologyScene interactive className="size-full" onHover={(label) => setInspected(label)} cameraZ={12} />
                  ) : (
                    <GraphFallback onSelect={setInspected} />
                  )}
                </div>
                {rack && (
                  <div className={`absolute inset-0 ${view === 'rack' ? '' : 'pointer-events-none invisible'}`}>
                    <SketchfabStage model={rack} className="size-full" active={view === 'rack'} />
                  </div>
                )}
              </div>
            </div>

            {/* Service list — the same data as a dense table, which is how an operator would really
                scan it. Hover syncs with the inspector above. */}
            <div className="arch-panel mt-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
                <span className="arch-mono text-[9.5px] uppercase tracking-[0.16em] text-ash-500">services</span>
                <span className="arch-mono text-[9.5px] tracking-[0.08em] text-ash-600">{NODES.length} registered</span>
              </div>
              <ul className="divide-y divide-white/[0.055]">
                {NODES.map((node) => {
                  const info = INFO[node.id];
                  const status = info ? STATUS_STYLE[info.status] : STATUS_STYLE.ok!;
                  const isActive = inspected === node.id;
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setInspected(node.id)}
                        onFocus={() => setInspected(node.id)}
                        onClick={() => setInspected(node.id)}
                        data-cursor
                        className={`group relative flex w-full items-center gap-4 px-4 py-2.5 text-left transition-colors duration-200 ${
                          isActive ? 'bg-white/[0.045]' : 'hover:bg-white/[0.025]'
                        }`}
                      >
                        <span
                          className={`absolute inset-y-0 left-0 w-px origin-top bg-signal-500 transition-transform duration-500 ease-out ${
                            isActive ? 'scale-y-100' : 'scale-y-0'
                          }`}
                          aria-hidden
                        />
                        <span className={`size-1.5 shrink-0 rounded-full ${status?.dot ?? 'bg-ash-500'}`} aria-hidden />
                        <span className={`arch-mono min-w-0 flex-1 truncate text-[12px] ${isActive ? 'text-bone' : 'text-ash-300'}`}>
                          {node.label}
                        </span>
                        <span className="arch-mono hidden w-24 shrink-0 truncate text-[10px] tracking-[0.06em] text-ash-600 sm:block">
                          {node.tier}
                        </span>
                        <span className="arch-mono hidden w-40 shrink-0 truncate text-[10px] tracking-[0.04em] text-ash-600 md:block">
                          {info?.region}
                        </span>
                        <span className="arch-mono arch-tabular w-16 shrink-0 text-right text-[11px] text-ash-400">{info?.p99}</span>
                        <span className={`arch-mono w-[74px] shrink-0 text-right text-[9.5px] font-bold uppercase tracking-[0.08em] ${status?.text}`}>
                          {status?.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Below 720px — and for reduced motion — the WebGL graph is replaced by a flat, tappable
 * dependency list. Same information, same inspector, no context to compile.
 */
function GraphFallback({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="arch-grid-fine size-full overflow-y-auto p-4 scroll-thin">
      <p className="arch-mono mb-3 text-[9.5px] uppercase tracking-[0.16em] text-ash-600">dependency graph · flat view</p>
      <ul className="space-y-1.5">
        {EDGES.map((edge) => (
          <li key={`${edge.from}-${edge.to}`} className="arch-mono flex items-center gap-2 text-[11px] text-ash-500">
            <button type="button" onClick={() => onSelect(edge.from)} className="rounded px-1.5 py-0.5 text-ash-300 transition hover:bg-white/[0.06] hover:text-bone">
              {edge.from}
            </button>
            <span className="text-ash-700" aria-hidden>→</span>
            <button type="button" onClick={() => onSelect(edge.to)} className="rounded px-1.5 py-0.5 text-ash-300 transition hover:bg-white/[0.06] hover:text-bone">
              {edge.to}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
