'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

/**
 * ARCH Architecture & Service Topology — 3D System Visual.
 *
 * Modernized with clean architectural geometry, machined dark slate slabs,
 * precision status indicators, and classic corporate blue lighting.
 * No messy random threads — instead, clean bus traces and crisp server modules.
 */

export type ServiceNodeData = {
  id: string;
  label: string;
  tier: 'edge' | 'service' | 'data' | 'kernel';
  position: [number, number, number];
  size?: [number, number, number];
  status?: 'ok' | 'degraded' | 'down';
  rps?: string;
  latency?: string;
};

export const SYSTEM_NODES: ServiceNodeData[] = [
  // Edge Tier (Top)
  { id: 'cdn', label: 'edge-cdn-global', tier: 'edge', position: [-3.2, 2.4, -0.4], size: [0.8, 0.22, 0.5], status: 'ok', rps: '48.2k', latency: '8ms' },
  { id: 'lb', label: 'lb-anycast-primary', tier: 'edge', position: [0.0, 2.6, 0.2], size: [0.9, 0.22, 0.5], status: 'ok', rps: '48.2k', latency: '2ms' },
  { id: 'gateway', label: 'api-gateway-mesh', tier: 'edge', position: [3.2, 2.4, -0.4], size: [0.8, 0.22, 0.5], status: 'ok', rps: '36.5k', latency: '14ms' },

  // Service Tier (Middle)
  { id: 'checkout', label: 'checkout-api', tier: 'service', position: [-2.4, 0.5, 0.6], size: [0.9, 0.26, 0.6], status: 'down', rps: '12.1k', latency: '4.21s' },
  { id: 'payments', label: 'payments-svc', tier: 'service', position: [0.2, 0.7, -1.0], size: [0.85, 0.24, 0.55], status: 'degraded', rps: '8.4k', latency: '410ms' },
  { id: 'auth', label: 'auth-vault', tier: 'service', position: [2.6, 0.5, 0.5], size: [0.85, 0.24, 0.55], status: 'ok', rps: '18.9k', latency: '22ms' },
  { id: 'webhooks', label: 'webhook-ingest', tier: 'service', position: [-0.4, -0.3, 1.8], size: [0.8, 0.22, 0.5], status: 'ok', rps: '5.2k', latency: '16ms' },

  // Data Tier (Lower)
  { id: 'pg', label: 'postgres-primary', tier: 'data', position: [-1.6, -2.0, -0.2], size: [1.1, 0.3, 0.7], status: 'degraded', rps: '14.2k', latency: '218ms' },
  { id: 'replica', label: 'replica-eu-west', tier: 'data', position: [1.4, -2.1, 0.8], size: [0.9, 0.25, 0.6], status: 'ok', rps: '9.8k', latency: '44ms' },
  { id: 'redis', label: 'redis-l2-cache', tier: 'data', position: [-3.4, -1.4, 1.3], size: [0.8, 0.22, 0.5], status: 'ok', rps: '28.1k', latency: '1ms' },
  { id: 'queue', label: 'event-queue-bus', tier: 'data', position: [2.8, -2.2, -0.6], size: [0.85, 0.22, 0.55], status: 'ok', rps: '15.0k', latency: '5ms' },

  // Platform Kernel
  { id: 'arch', label: 'arch-engine-v1.1', tier: 'kernel', position: [0.0, -3.4, -1.2], size: [1.3, 0.35, 0.8], status: 'ok', rps: '100%', latency: '6ms' },
  { id: 'audit', label: 'merkle-audit-ledger', tier: 'kernel', position: [-2.6, -3.3, 0.5], size: [0.95, 0.26, 0.6], status: 'ok', rps: '100%', latency: '1ms' },
];

export const SYSTEM_EDGES: { from: string; to: string }[] = [
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
  { from: 'pg', to: 'replica' },
  { from: 'pg', to: 'arch' },
  { from: 'queue', to: 'arch' },
  { from: 'arch', to: 'audit' },
];

export type Node = ServiceNodeData;
export const NODES = SYSTEM_NODES;
export const EDGES = SYSTEM_EDGES;

const STATUS_COLORS = {
  ok: '#10b981',
  degraded: '#f59e0b',
  down: '#ef4444',
  blue: '#3b82f6',
  slate: '#1e293b',
  edge: '#334155',
};

const nodeMap = new Map(SYSTEM_NODES.map((n) => [n.id, n]));

function ArchitecturalServer({
  node,
  isSelected,
  onSelect,
}: {
  node: ServiceNodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const size = node.size || [0.8, 0.24, 0.5];

  const statusColor =
    node.status === 'down'
      ? STATUS_COLORS.down
      : node.status === 'degraded'
        ? STATUS_COLORS.degraded
        : STATUS_COLORS.ok;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // subtle floating breathing motion
    const hoverY = hovered ? 0.08 : 0;
    meshRef.current.position.y = node.position[1] + Math.sin(t * 1.5 + node.position[0]) * 0.03 + hoverY;

    if (glowRef.current && node.status === 'down') {
      const scale = 1 + Math.sin(t * 5) * 0.08;
      glowRef.current.scale.set(scale, 1, scale);
    }
  });

  return (
    <group position={[node.position[0], 0, node.position[2]]}>
      {/* Machined Server Slab */}
      <mesh
        ref={meshRef}
        position={[0, node.position[1], 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={hovered || isSelected ? '#1e293b' : '#0f172a'}
          metalness={0.9}
          roughness={0.25}
          emissive={hovered ? '#1d4ed8' : '#030712'}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Top Status Light Bar */}
      <mesh position={[0, node.position[1] + size[1] / 2 + 0.01, size[2] / 2 - 0.06]}>
        <boxGeometry args={[size[0] * 0.85, 0.02, 0.04]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* Status LED Dot */}
      <mesh position={[size[0] / 2 - 0.1, node.position[1] + size[1] / 2 + 0.02, -size[2] / 2 + 0.1]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* Outage Beacon Ring for Down Nodes */}
      {node.status === 'down' && (
        <mesh ref={glowRef} position={[0, node.position[1] - size[1] / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size[0] * 0.6, size[0] * 0.72, 32]} />
          <meshBasicMaterial color={STATUS_COLORS.down} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Kernel Highlight Plinth */}
      {node.tier === 'kernel' && (
        <mesh position={[0, node.position[1] - size[1] / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size[0] * 1.25, size[2] * 1.3]} />
          <meshBasicMaterial color={STATUS_COLORS.blue} transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function DataBusTrace({ from, to }: { from: ServiceNodeData; to: ServiceNodeData }) {
  const lineGeometry = useMemo(() => {
    const p1 = new THREE.Vector3(from.position[0], from.position[1], from.position[2]);
    const p2 = new THREE.Vector3(to.position[0], to.position[1], to.position[2]);
    
    // Smooth orthogonal architectural bus route
    const midY = (p1.y + p2.y) / 2;
    const points = [
      p1,
      new THREE.Vector3(p1.x, midY, p1.z),
      new THREE.Vector3(p2.x, midY, p2.z),
      p2,
    ];
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
  }, [from, to]);

  const isAffected = from.status === 'down' || to.status === 'down';

  return (
    <primitive object={new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: isAffected ? '#ef4444' : '#2563eb',
        transparent: true,
        opacity: isAffected ? 0.6 : 0.22,
        linewidth: 1,
      })
    )} />
  );
}

function CameraRig({ strength = 0.8 }: { strength?: number }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    const damp = 1 - Math.pow(0.002, delta);
    target.current.x += (state.pointer.x * strength - target.current.x) * damp;
    target.current.y += (state.pointer.y * strength * 0.5 - target.current.y) * damp;
    camera.position.x = target.current.x * 1.2;
    camera.position.y = -target.current.y * 0.8;
    camera.lookAt(0, -0.3, 0);
  });

  return null;
}

export function TopologyScene({
  className = '',
  cameraZ = 12.0,
  interactive = true,
  selectedId,
  onSelectNode,
  onHover,
}: {
  className?: string;
  cameraZ?: number;
  interactive?: boolean;
  selectedId?: string | null;
  onSelectNode?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const [selected, setSelected] = useState<string>(selectedId ?? 'checkout');

  const handleSelect = (id: string) => {
    setSelected(id);
    if (onSelectNode) onSelectNode(id);
    if (onHover) onHover(id);
  };

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, cameraZ], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <AdaptiveDpr pixelated />
        <ambientLight intensity={0.65} />
        <directionalLight position={[6, 8, 5]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-6, -4, -4]} intensity={0.5} color="#3b82f6" />

        <Environment>
          <Lightformer form="rect" intensity={1.5} position={[0, 8, 2]} scale={10} color="#3b82f6" />
          <Lightformer form="rect" intensity={0.8} position={[-8, 0, -2]} scale={6} color="#ffffff" />
        </Environment>

        {interactive && <CameraRig />}

        <group position={[0, 0.4, 0]}>
          {/* Data Bus Traces */}
          {SYSTEM_EDGES.map((edge) => {
            const f = nodeMap.get(edge.from);
            const t = nodeMap.get(edge.to);
            if (!f || !t) return null;
            return <DataBusTrace key={`${edge.from}-${edge.to}`} from={f} to={t} />;
          })}

          {/* Architectural Server Modules */}
          {SYSTEM_NODES.map((node) => (
            <ArchitecturalServer
              key={node.id}
              node={node}
              isSelected={selected === node.id}
              onSelect={handleSelect}
            />
          ))}
        </group>
      </Canvas>
    </div>
  );
}
