'use client';

import { useEffect, useRef, useState } from 'react';

export type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE';

export interface BrainNode {
  id: string;
  name: string;
  lobe: string;
  tier: 'Edge' | 'Core' | 'Data' | 'Platform';
  status: ServiceStatus;
  uptime: string;
  latency: string;
  owner: string;
  /** Normalized coordinates (0..100) registered to /neural-brain.jpeg */
  x: number;
  y: number;
  color: string;
  deps: string[];
  summary: string;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  alpha: number;
}

interface MicroNeuron {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  phase: number;
}

export function TopologyScene({
  nodes,
  selectedId,
  activeSet,
  onSelect,
  cascadeCount = 0,
}: {
  nodes: BrainNode[];
  selectedId: string;
  activeSet: Set<string>;
  onSelect: (id: string) => void;
  cascadeCount?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number; inside: boolean }>({
    x: 0.5,
    y: 0.5,
    inside: false,
  });
  const tiltRef = useRef<{ rx: number; ry: number; targetRx: number; targetRy: number }>({
    rx: 0,
    ry: 0,
    targetRx: 0,
    targetRy: 0,
  });
  const ripplesRef = useRef<Ripple[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tiltStyle, setTiltStyle] = useState({ rx: 0, ry: 0 });

  // Spawn a full-brain synaptic cascade whenever cascadeCount increments or selectedId changes
  useEffect(() => {
    const sel = nodes.find((n) => n.id === selectedId);
    if (!sel) return;
    ripplesRef.current.push({
      x: sel.x / 100,
      y: sel.y / 100,
      r: 4,
      maxR: 260,
      color: sel.color,
      alpha: 0.85,
    });
  }, [selectedId, cascadeCount, nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Generate cortical micro-neurons inside the brain silhouette
    const palette = ['#22d3ee', '#f43f5e', '#FEF62A', '#c084fc', '#38bdf8', '#fb7185'] as const;
    const microNeurons: MicroNeuron[] = Array.from({ length: 68 }, (_, i) => {
      // Concentrate inside the brain ellipse (center ~0.49, 0.46, rx ~0.34, ry ~0.28)
      const angle = (i / 68) * Math.PI * 2 + (i % 5) * 0.4;
      const rad = 0.06 + ((i * 17) % 100) / 100 * 0.28;
      return {
        x: 0.49 + Math.cos(angle) * rad * 1.15,
        y: 0.46 + Math.sin(angle) * rad * 0.88,
        vx: ((i % 7) - 3) * 0.00008,
        vy: ((i % 5) - 2) * 0.00008,
        r: 1.4 + (i % 3) * 0.9,
        color: palette[i % palette.length] ?? '#22d3ee',
        phase: i * 0.7,
      };
    });

    const resize = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(320, rect.height);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Precompute edges between brain nodes
    const edges: Array<{ from: BrainNode; to: BrainNode }> = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    nodes.forEach((n) => {
      n.deps.forEach((depId) => {
        const target = nodeMap.get(depId);
        if (target) edges.push({ from: n, to: target });
      });
    });

    let t = 0;
    const render = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate 3D tilt
      tiltRef.current.rx += (tiltRef.current.targetRx - tiltRef.current.rx) * 0.08;
      tiltRef.current.ry += (tiltRef.current.targetRy - tiltRef.current.ry) * 0.08;

      // 1. Draw subtle ambient cortical micro-neurons & cursor synaptic proximity web
      const px = pointerRef.current.x * width;
      const py = pointerRef.current.y * height;

      for (let i = 0; i < microNeurons.length; i++) {
        const m = microNeurons[i];
        if (!m) continue;
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < 0.16 || m.x > 0.84) m.vx *= -1;
        if (m.y < 0.16 || m.y > 0.84) m.vy *= -1;

        const mx = m.x * width;
        const my = m.y * height;
        const pulse = 0.45 + 0.55 * Math.sin(t * 2.2 + m.phase);

        // Connect to cursor when pointer is inside the brain stage
        if (pointerRef.current.inside) {
          const dist = Math.hypot(mx - px, my - py);
          if (dist < 135) {
            const alpha = (1 - dist / 135) * 0.55;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = m.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        ctx.globalAlpha = 0.35 + pulse * 0.45;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(mx, my, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Synaptic Axons (Edges between ARCH Services on the Brain)
      edges.forEach((edge, idx) => {
        const x1 = (edge.from.x / 100) * width;
        const y1 = (edge.from.y / 100) * height;
        const x2 = (edge.to.x / 100) * width;
        const y2 = (edge.to.y / 100) * height;

        // Curved organic axon control point
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 18 * Math.sin(idx * 1.3);

        const isActive =
          activeSet.has(edge.from.id) &&
          activeSet.has(edge.to.id) &&
          (edge.from.id === selectedId || edge.to.id === selectedId);
        const isInBlast = activeSet.has(edge.from.id) && activeSet.has(edge.to.id);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, edge.from.color);
        grad.addColorStop(1, edge.to.color);

        ctx.strokeStyle = grad;
        ctx.globalAlpha = isActive ? 0.92 : isInBlast ? 0.45 : 0.16;
        ctx.lineWidth = isActive ? 2.2 : isInBlast ? 1.4 : 0.9;
        ctx.stroke();

        // Travelling action-potential synaptic pulse along active axons
        if (isInBlast) {
          const speed = isActive ? 0.55 : 0.32;
          const prog = (t * speed + idx * 0.23) % 1;
          const inv = 1 - prog;
          const sx = inv * inv * x1 + 2 * inv * prog * midX + prog * prog * x2;
          const sy = inv * inv * y1 + 2 * inv * prog * midY + prog * prog * y2;

          ctx.globalAlpha = isActive ? 1 : 0.75;
          ctx.fillStyle = isActive ? '#FEF62A' : edge.from.color;
          ctx.beginPath();
          ctx.arc(sx, sy, isActive ? 3.4 : 2.3, 0, Math.PI * 2);
          ctx.fill();

          // Soft halo around synaptic pulse
          ctx.globalAlpha = 0.28;
          ctx.beginPath();
          ctx.arc(sx, sy, isActive ? 8 : 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 3. Draw Expanding Synaptic Ripples on Click / Cascade
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rp = ripplesRef.current[i];
        if (!rp) continue;
        rp.r += 3.6;
        rp.alpha *= 0.965;
        if (rp.alpha < 0.02 || rp.r > rp.maxR) {
          ripplesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(rp.x * width, rp.y * height, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = rp.alpha;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [nodes, selectedId, activeSet]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    pointerRef.current = { x: nx, y: ny, inside: true };
    const ry = (nx - 0.5) * 10;
    const rx = -(ny - 0.5) * 8;
    tiltRef.current.targetRx = rx;
    tiltRef.current.targetRy = ry;
    setTiltStyle({ rx, ry });
  };

  const handlePointerLeave = () => {
    pointerRef.current.inside = false;
    tiltRef.current.targetRx = 0;
    tiltRef.current.targetRy = 0;
    setTiltStyle({ rx: 0, ry: 0 });
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-full min-h-[460px] sm:min-h-[540px] bg-black overflow-hidden select-none flex items-center justify-center"
    >
      {/* Interactive 3D Parallax Stage containing the uploaded Neural Brain Image + Synaptic Canvas + Cortical Node Pins */}
      <div
        className="relative w-full h-full min-h-[460px] sm:min-h-[540px] transition-transform duration-200 ease-out"
        style={{
          transform: `perspective(1100px) rotateX(${tiltStyle.rx.toFixed(2)}deg) rotateY(${tiltStyle.ry.toFixed(2)}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Uploaded Reference Image: WhatsApp Image 2026-09-29 at 10.20.55.jpeg (/neural-brain.jpeg) */}
        <img
          src="/neural-brain.jpeg"
          alt="ARCH Neural Brain Synaptic Topology"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center opacity-95 scale-[1.03]"
          draggable={false}
        />

        {/* Subtle vignette to blend edges seamlessly into pure #000000 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(62% 58% at 50% 50%, transparent 55%, rgba(0,0,0,0.88) 92%, #000000 100%)',
          }}
        />

        {/* Real-Time Interactive Synaptic Canvas */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full z-10"
        />

        {/* Interactive Cortical Service Nodes Mapped Directly onto the Brain */}
        <div className="absolute inset-0 z-20">
          {nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const isHovered = node.id === hoveredId;
            const inBlast = activeSet.has(node.id);
            const isCrit = node.status === 'MAJOR_OUTAGE';
            const isWarn = node.status === 'DEGRADED' || node.status === 'PARTIAL_OUTAGE';

            return (
              <button
                key={node.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(node.id);
                }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`group absolute flex items-center gap-1.5 cursor-pointer transition-all duration-200 focus:outline-none ${
                  inBlast ? 'opacity-100 z-30' : 'opacity-45 hover:opacity-95 z-20'
                }`}
                aria-label={`Inspect ${node.name} (${node.lobe})`}
              >
                {/* Glowing Synaptic Node Core */}
                <span className="relative flex items-center justify-center">
                  {(isSelected || isCrit) && (
                    <span
                      className="absolute -inset-2.5 rounded-full animate-ping opacity-40"
                      style={{ backgroundColor: isCrit ? '#f43f5e' : '#FEF62A' }}
                    />
                  )}
                  <span
                    className={`relative flex items-center justify-center rounded-full border transition-transform duration-200 ${
                      isSelected
                        ? 'size-5 scale-125 border-white bg-[#FEF62A] shadow-[0_0_20px_rgba(254,246,42,0.9)]'
                        : isCrit
                        ? 'size-4 border-white bg-[#f43f5e] shadow-[0_0_16px_rgba(244,63,94,0.85)]'
                        : isWarn
                        ? 'size-3.5 border-white/80 bg-[#fbbf24] shadow-[0_0_14px_rgba(251,191,36,0.8)]'
                        : 'size-3 border-white/70 shadow-[0_0_12px_rgba(34,211,238,0.75)]'
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? '#FEF62A'
                        : isCrit
                        ? '#f43f5e'
                        : isWarn
                        ? '#fbbf24'
                        : node.color,
                    }}
                  />
                </span>

                {/* Floating Cortical Telemetry Pill */}
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-tight whitespace-nowrap transition-all duration-200 ${
                    isSelected
                      ? 'border-[#FEF62A] bg-black/95 text-[#FEF62A] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.9)]'
                      : isHovered
                      ? 'border-white/40 bg-black/90 text-white'
                      : isCrit
                      ? 'border-crit-500/60 bg-black/85 text-crit-400 font-medium'
                      : 'border-white/15 bg-black/75 text-zinc-200'
                  }`}
                >
                  {node.name}
                  {(isSelected || isHovered || isCrit) && (
                    <span className="ml-1.5 text-[9px] opacity-80">{node.latency}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
