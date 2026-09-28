'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer, Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * ARCH topology — a live service-dependency graph, rendered.
 *
 * This is the hero's 3D layer, and it is not decoration: it is the product's core idea drawn in
 * space. Services are nodes, dependencies are edges, and one node is *on fire*. The failure walks
 * downstream along real edges, lighting each hop — which is exactly what ARCH's blast-radius view
 * computes when a deploy or an alert lands. A viewer reads the whole value proposition in about
 * four seconds without a word of copy.
 *
 * Why procedural geometry rather than a downloaded model:
 *   - It can be *interactive* and *data-shaped*. A static Sketchfab asset can only be looked at.
 *   - It costs ~0 bytes of payload. The graph is generated from a 20-line adjacency list.
 *   - It stays crisp at any DPR, where a baked model would need mipmaps and still alias on edges.
 *
 * Lighting is a procedural studio built from `Lightformer`s inside drei's `<Environment>`. That
 * produces a real IBL cube at runtime — genuine specular roll-off on the metal — with no HDRI
 * download, so an air-gapped install renders identically. The look is machined metal and dark
 * glass under a soft top light: no bloom, no coloured glow.
 */

export type Node = {
  id: string;
  label: string;
  /** Which layer of the stack it sits in — drives vertical placement and the HUD readout. */
  tier: 'edge' | 'service' | 'data' | 'platform';
  position: [number, number, number];
  size?: number;
  /** The node currently failing. Drives the propagation animation. */
  burning?: boolean;
};

type Edge = { from: string; to: string };

/**
 * A plausible ARCH deployment. Tiers flow top → bottom: traffic enters at the edge, fans out across
 * services, and lands on data + platform. Positions are hand-placed for composition — a force
 * layout would be more "correct" and far less legible as a hero.
 */
export const NODES: Node[] = [
  { id: 'cdn', label: 'edge-cdn', tier: 'edge', position: [-3.5, 2.5, -0.6], size: 0.19 },
  { id: 'lb', label: 'lb-primary', tier: 'edge', position: [0.1, 3.05, 0.4], size: 0.22 },
  { id: 'gateway', label: 'api-gateway', tier: 'edge', position: [3.4, 2.35, -0.9], size: 0.2 },

  { id: 'checkout', label: 'checkout-api', tier: 'service', position: [-2.25, 0.55, 1.15], size: 0.27, burning: true },
  { id: 'payments', label: 'payments-svc', tier: 'service', position: [0.35, 0.85, -1.5], size: 0.24 },
  { id: 'auth', label: 'auth-svc', tier: 'service', position: [2.85, 0.35, 0.9], size: 0.23 },
  { id: 'webhooks', label: 'webhook-ingest', tier: 'service', position: [-0.4, -0.35, 2.5], size: 0.21 },
  { id: 'notify', label: 'notify-worker', tier: 'service', position: [3.6, -0.9, -1.4], size: 0.18 },

  { id: 'pg', label: 'postgres-primary', tier: 'data', position: [-1.5, -2.35, -0.35], size: 0.3 },
  { id: 'replica', label: 'replica-eu-west', tier: 'data', position: [1.35, -2.6, 1.2], size: 0.2 },
  { id: 'redis', label: 'redis-cache', tier: 'data', position: [-3.7, -1.5, 1.9], size: 0.17 },
  { id: 'queue', label: 'event-queue', tier: 'data', position: [3.05, -2.9, -0.5], size: 0.19 },

  { id: 'arch', label: 'arch-v1.1', tier: 'platform', position: [0.05, -3.85, -2.1], size: 0.34 },
  { id: 'audit', label: 'audit-ledger', tier: 'platform', position: [-2.9, -3.9, 0.9], size: 0.2 },
];

export const EDGES: Edge[] = [
  { from: 'cdn', to: 'lb' },
  { from: 'lb', to: 'gateway' },
  { from: 'lb', to: 'checkout' },
  { from: 'gateway', to: 'auth' },
  { from: 'gateway', to: 'payments' },
  { from: 'checkout', to: 'payments' },
  { from: 'checkout', to: 'pg' },
  { from: 'checkout', to: 'redis' },
  { from: 'payments', to: 'pg' },
  { from: 'auth', to: 'pg' },
  { from: 'auth', to: 'redis' },
  { from: 'webhooks', to: 'queue' },
  { from: 'webhooks', to: 'checkout' },
  { from: 'queue', to: 'notify' },
  { from: 'pg', to: 'replica' },
  { from: 'pg', to: 'arch' },
  { from: 'queue', to: 'arch' },
  { from: 'arch', to: 'audit' },
  { from: 'replica', to: 'arch' },
];

const SEV = {
  critical: '#ff4438',
  high: '#ff8a1f',
  ok: '#2fbf71',
  signal: '#ffb627',
  idle: '#8b939c',
};

const nodeById = new Map(NODES.map((node) => [node.id, node]));

/**
 * Downstream reachability from the burning node, returned as ordered hops so the animation can
 * light the graph one ring at a time — the way an actual incident spreads.
 */
function usePropagationRings(): string[][] {
  return useMemo(() => {
    const origin = NODES.find((node) => node.burning);
    if (!origin) return [];
    const adjacency = new Map<string, string[]>();
    for (const edge of EDGES) {
      const list = adjacency.get(edge.from) ?? [];
      list.push(edge.to);
      adjacency.set(edge.from, list);
      // Dependencies fail in both directions in practice: a saturated database takes its callers
      // down with it, so the ring walk treats the graph as undirected.
      const reverse = adjacency.get(edge.to) ?? [];
      reverse.push(edge.from);
      adjacency.set(edge.to, reverse);
    }

    const rings: string[][] = [];
    const seen = new Set<string>([origin.id]);
    let frontier = [origin.id];
    while (frontier.length && rings.length < 5) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const neighbour of adjacency.get(id) ?? []) {
          if (seen.has(neighbour)) continue;
          seen.add(neighbour);
          next.push(neighbour);
        }
      }
      if (!next.length) break;
      rings.push(next);
      frontier = next;
    }
    return rings;
  }, []);
}

/** One service node: a machined octahedron on a hairline gimbal ring. */
function ServiceNode({
  node,
  heat,
  interactive,
  onHover,
}: {
  node: Node;
  /** 0 = nominal, 1 = fully involved in the incident. Eased in by the ring scheduler. */
  heat: number;
  interactive: boolean;
  onHover: (id: string | null) => void;
}) {
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);
  const size = node.size ?? 0.22;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (core.current) {
      // Nominal nodes breathe slowly; an involved node shivers — a small high-frequency term on
      // top of the drift, which reads as "unstable" without needing a particle system.
      core.current.rotation.y = t * (0.16 + heat * 0.5) + seed;
      core.current.rotation.x = Math.sin(t * 0.31 + seed) * 0.22 + heat * Math.sin(t * 7.5) * 0.05;
      const scale = size * (1 + Math.sin(t * 0.85 + seed) * 0.035 + heat * 0.16);
      core.current.scale.setScalar(scale);
    }

    if (ring.current) {
      ring.current.rotation.z = t * (0.22 + heat * 0.7) + seed;
      ring.current.rotation.x = Math.PI / 2.35 + Math.sin(t * 0.2 + seed) * 0.12;
    }

    if (material.current) {
      // Heat drives colour AND emission. Emissive is a material property — the node genuinely
      // lights its neighbours in the IBL pass, rather than a CSS box-shadow faking it.
      const idle = new THREE.Color(SEV.idle);
      const hot = new THREE.Color(node.burning ? SEV.critical : SEV.high);
      material.current.color.copy(idle).lerp(hot, Math.min(1, heat * 1.15));
      material.current.emissive.copy(hot);
      material.current.emissiveIntensity = heat * (node.burning ? 1.5 : 0.75);
      material.current.roughness = 0.34 - heat * 0.14;
      material.current.metalness = 0.86;
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={core}
        onPointerOver={
          interactive
            ? (event) => {
                event.stopPropagation();
                onHover(node.id);
              }
            : undefined
        }
        onPointerOut={interactive ? () => onHover(null) : undefined}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial ref={material} color={SEV.idle} metalness={0.86} roughness={0.34} flatShading />
      </mesh>

      {/* Gimbal ring — gives each node a silhouette you can read at 40px, and catches the top light. */}
      <mesh ref={ring}>
        <torusGeometry args={[size * 1.95, size * 0.055, 8, 44]} />
        <meshStandardMaterial
          color="#c9ced5"
          metalness={0.95}
          roughness={0.28}
          transparent
          opacity={0.3 + heat * 0.4}
        />
      </mesh>

      {/* Tier plinth: platform-tier nodes sit on a disc, which is how the HUD tells them apart. */}
      {node.tier === 'platform' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -size * 2.4, 0]}>
          <ringGeometry args={[size * 2.1, size * 2.35, 48]} />
          <meshBasicMaterial color={SEV.signal} transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/** A packet travelling an edge — the "requests are still flowing" cue. */
function Packet({ from, to, delay, heat }: { from: THREE.Vector3; to: THREE.Vector3; delay: number; heat: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!ref.current || !material.current) return;
    const t = state.clock.elapsedTime;
    // Each packet runs its own phase so the graph never pulses in lockstep — lockstep reads as a
    // screensaver, staggered phases read as traffic.
    const progress = ((t * 0.22 + delay) % 1 + 1) % 1;
    ref.current.position.lerpVectors(from, to, progress);
    // Arc slightly off the straight edge so packets are visible against it.
    ref.current.position.y += Math.sin(progress * Math.PI) * 0.13;
    const scale = 0.028 + heat * 0.02;
    ref.current.scale.setScalar(scale * (0.6 + Math.sin(progress * Math.PI) * 0.7));
    material.current.opacity = Math.sin(progress * Math.PI) * (0.35 + heat * 0.5);
    material.current.color.set(heat > 0.4 ? SEV.high : '#dfe3e8');
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial ref={material} color="#dfe3e8" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

/** Camera parallax that follows the pointer, damped — the scene feels held, not bolted down. */
function PointerRig({ strength = 1 }: { strength?: number }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    const damp = 1 - Math.pow(0.0016, delta);
    target.current.x += (state.pointer.x * strength - target.current.x) * damp;
    target.current.y += (state.pointer.y * strength * 0.6 - target.current.y) * damp;
    camera.position.x = target.current.x * 1.15;
    camera.position.y = -target.current.y * 0.8;
    camera.lookAt(0, -0.2, 0);
  });

  return null;
}

function Graph({ interactive, onHover }: { interactive: boolean; onHover: (label: string | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const rings = usePropagationRings();
  const [heats, setHeats] = useState<Record<string, number>>({});

  // Ring scheduler: every ~1.15s the next ring of dependents heats up, then the whole graph cools
  // back down and the incident starts again. The loop is the story — alert, spread, contain.
  const schedule = useRef({ ring: -1, clock: 0 });
  const heatRef = useRef<Record<string, number>>({});

  useFrame((_, delta) => {
    const step = schedule.current;
    step.clock += delta;

    if (step.clock > 1.15) {
      step.clock = 0;
      step.ring += 1;
      if (step.ring > rings.length) {
        step.ring = -1;
        heatRef.current = {};
      } else if (step.ring >= 0) {
        const ring = rings[step.ring] ?? [];
        for (const id of ring) {
          heatRef.current[id] = Math.max(0.28, 1 - step.ring * 0.19);
        }
      }
      setHeats({ ...heatRef.current });
    }

    if (group.current) {
      // A slow yaw the whole time, so the composition is never flat-on for long.
      group.current.rotation.y += delta * 0.055;
      group.current.rotation.x = Math.sin(group.current.rotation.y * 0.5) * 0.06;
    }
  });

  const origin = NODES.find((node) => node.burning);

  return (
    <group ref={group}>
      {EDGES.map((edge, index) => {
        const a = nodeById.get(edge.from);
        const b = nodeById.get(edge.to);
        if (!a || !b) return null;
        const from = new THREE.Vector3(...a.position);
        const to = new THREE.Vector3(...b.position);
        const involved =
          (heats[a.id] ?? 0) > 0.05 || (heats[b.id] ?? 0) > 0.05 || a.burning || b.burning;

        return (
          <group key={`${edge.from}-${edge.to}`}>
            <Line
              points={[from, to]}
              color={involved ? SEV.high : '#5b636d'}
              lineWidth={involved ? 1.5 : 0.85}
              transparent
              opacity={involved ? 0.78 : 0.3}
              dashed={false}
            />
            <Packet from={from} to={to} delay={index * 0.137} heat={involved ? 1 : 0} />
          </group>
        );
      })}

      {NODES.map((node) => (
        <ServiceNode
          key={node.id}
          node={node}
          heat={node.burning ? 1 : (heats[node.id] ?? 0)}
          interactive={interactive}
          onHover={onHover}
        />
      ))}

      {/* Ground reference: a hairline grid far below the graph, so the nodes read as suspended in a
          room rather than floating in a void. Cheap, and it sells the depth. */}
      <gridHelper args={[26, 26, '#2a2f36', '#191d22']} position={[0, -5.6, 0]} />

      {origin && (
        <pointLight position={origin.position} color={SEV.critical} intensity={heats[origin.id] ? 3.2 : 0} distance={7} />
      )}
    </group>
  );
}

/** Procedural studio: soft key from above, cool rim from behind, warm fill from the front-left. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.6} color="#ffffff" position={[0, 6, 2]} scale={[9, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.1} color="#cfe0ff" position={[-7, 1, -5]} scale={[6, 6, 1]} rotation-y={Math.PI / 3} />
      <Lightformer form="rect" intensity={1.5} color="#ffb627" position={[6, -1.5, 4]} scale={[5, 3, 1]} rotation-y={-Math.PI / 4} />
      <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, -6, 0]} scale={[8, 8, 1]} rotation-x={Math.PI / 2} />
    </Environment>
  );
}

export function TopologyScene({
  interactive = false,
  className = '',
  onHover,
  cameraZ = 11.5,
}: {
  interactive?: boolean;
  className?: string;
  onHover?: (id: string | null) => void;
  cameraZ?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const handleHover = onHover ?? setHovered;

  return (
    <div className={`relative ${className}`}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.4, cameraZ], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <ambientLight intensity={0.24} />
        <directionalLight position={[4, 7, 5]} intensity={1.15} color="#ffffff" />
        <directionalLight position={[-6, -3, -4]} intensity={0.4} color="#9fb3c4" />

        <Studio />
        <Graph interactive={interactive} onHover={handleHover} />
        <PointerRig strength={interactive ? 1.25 : 0.85} />
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* Hover readout — mono, hairline, bottom-left, like a viewport HUD. */}
      {interactive && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10">
          <div
            className={`arch-mono flex items-center gap-2 rounded-[6px] border border-white/[0.09] bg-ink-950/85 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-ash-200 backdrop-blur transition-all duration-300 ${
              hovered ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
            }`}
          >
            <span className="size-1.5 rounded-full bg-sev-critical" />
            {hovered ? (nodeById.get(hovered)?.label ?? hovered) : ''}
          </div>
        </div>
      )}
    </div>
  );
}
