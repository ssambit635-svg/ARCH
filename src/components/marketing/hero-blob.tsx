'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 3D Sculptural Chrome-Cage & Acid-Lime (#FEF62A / #a3e635) Liquid Sphere
 * with Tilted Orbital Wire Rings — matching the SAPFORCE hero reference image.
 */
function SapforceSculpture({
  pointerRef,
  dragRef,
  pulseRef,
  reducedMotion,
}: {
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  dragRef: React.MutableRefObject<{ rotX: number; rotY: number; velX: number; velY: number; active: boolean }>;
  pulseRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const limeCoreRef = useRef<THREE.Mesh>(null);
  const darkCoreRef = useRef<THREE.Mesh>(null);
  const chromeCageRef = useRef<THREE.Group>(null);
  const orbitRing1Ref = useRef<THREE.Mesh>(null);
  const orbitRing2Ref = useRef<THREE.Mesh>(null);
  const orbitRing3Ref = useRef<THREE.Mesh>(null);

  const { limeGeometry, basePositions, baseNormals } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.12, 28);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const norm = geo.attributes.normal as THREE.BufferAttribute;
    const baseP = new Float32Array(pos.array.length);
    const baseN = new Float32Array(norm.array.length);
    baseP.set(pos.array as Float32Array);
    baseN.set(norm.array as Float32Array);
    return { limeGeometry: geo, basePositions: baseP, baseNormals: baseN };
  }, []);

  //Procedural environment cubemap for realistic chrome/liquid reflections
  const envMap = useMemo(() => {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const ny = y / size;
        const nx = x / size;
        const spot1 = Math.exp(-((nx - 0.28) ** 2 + (ny - 0.22) ** 2) * 20);
        const spot2 = Math.exp(-((nx - 0.76) ** 2 + (ny - 0.68) ** 2) * 24);
        const band = Math.max(0, Math.sin(ny * Math.PI * 3) * 0.35);
        const v = Math.min(255, Math.floor((0.08 + spot1 * 0.9 + spot2 * 0.55 + band * 0.25) * 255));
        data[idx] = v;
        data[idx + 1] = Math.min(255, Math.floor(v * 1.02));
        data[idx + 2] = Math.min(255, Math.floor(v * 0.96));
        data[idx + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      limeGeometry.dispose();
      envMap.dispose();
    };
  }, [limeGeometry, envMap]);

  useFrame((state, delta) => {
    const t = reducedMotion ? 1.4 : state.clock.getElapsedTime();
    const pos = limeGeometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const count = pos.count;

    const px = pointerRef.current.x;
    const py = pointerRef.current.y;

    // Inertia decay
    if (!dragRef.current.active) {
      dragRef.current.rotY += dragRef.current.velX;
      dragRef.current.rotX += dragRef.current.velY;
      dragRef.current.velX *= 0.93;
      dragRef.current.velY *= 0.93;
      dragRef.current.rotX = Math.max(-1.1, Math.min(1.1, dragRef.current.rotX));
    }
    pulseRef.current *= Math.pow(0.06, delta);
    const pulseBoost = pulseRef.current;

    // Sculpt organic glossy acid-lime liquid lobes protruding through the dark sphere
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const bx = basePositions[ix] ?? 0;
      const by = basePositions[ix + 1] ?? 0;
      const bz = basePositions[ix + 2] ?? 0;
      const nx = baseNormals[ix] ?? 0;
      const ny = baseNormals[ix + 1] ?? 0;
      const nz = baseNormals[ix + 2] ?? 0;

      const lobe1 = Math.sin(nx * 2.4 + t * 0.85 + px * 1.1) * Math.cos(ny * 2.2 - t * 0.65);
      const lobe2 = Math.sin(nz * 2.8 - t * 0.55 + py * 1.1) * Math.cos(nx * 2.0 + t * 0.45);
      const ridge = Math.cos((nx - ny + nz) * 2.6 + t * 0.7) * (0.12 + pulseBoost * 0.14);

      const d = 1 + lobe1 * 0.22 + lobe2 * 0.18 + ridge;
      arr[ix] = bx * d;
      arr[ix + 1] = by * d;
      arr[ix + 2] = bz * d;
    }

    pos.needsUpdate = true;
    limeGeometry.computeVertexNormals();

    if (rootRef.current) {
      const targetY = t * 0.22 + px * 0.48 + dragRef.current.rotY;
      const targetX = -py * 0.32 + Math.sin(t * 0.35) * 0.08 + dragRef.current.rotX;
      rootRef.current.rotation.y += (targetY - rootRef.current.rotation.y) * Math.min(1, delta * 5);
      rootRef.current.rotation.x += (targetX - rootRef.current.rotation.x) * Math.min(1, delta * 5);
    }

    if (chromeCageRef.current) {
      chromeCageRef.current.rotation.z = Math.sin(t * 0.4) * 0.15;
      chromeCageRef.current.rotation.x = Math.cos(t * 0.3) * 0.12;
    }

    if (orbitRing1Ref.current) {
      orbitRing1Ref.current.rotation.z = t * 0.28;
    }
    if (orbitRing2Ref.current) {
      orbitRing2Ref.current.rotation.z = -t * 0.22;
    }
    if (orbitRing3Ref.current) {
      orbitRing3Ref.current.rotation.y = t * 0.19;
    }
  });

  return (
    <group ref={rootRef}>
      {/* Inner Dark Obsidian Globe (matching the dark matte/glossy base sphere in the reference) */}
      <mesh ref={darkCoreRef}>
        <sphereGeometry args={[1.06, 48, 48]} />
        <meshPhysicalMaterial
          color="#12161f"
          roughness={0.28}
          metalness={0.65}
          clearcoat={0.75}
          clearcoatRoughness={0.2}
          envMap={envMap}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Glossy Acid-Lime / Electric Yellow-Green (#c4f82a / #84cc16) Organic Liquid Lobes */}
      <mesh ref={limeCoreRef} geometry={limeGeometry}>
        <meshPhysicalMaterial
          color="#a8eb12"
          emissive="#3f6212"
          emissiveIntensity={0.28}
          roughness={0.14}
          metalness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.08}
          reflectivity={1}
          envMap={envMap}
          envMapIntensity={1.8}
        />
      </mesh>

      {/* Sculpted Brushed-Chrome Outer Shell Ribbons (matching the silver chrome cage in the reference) */}
      <group ref={chromeCageRef}>
        <mesh rotation={[0.52, 0.35, -0.4]}>
          <torusGeometry args={[1.22, 0.16, 32, 96]} />
          <meshPhysicalMaterial
            color="#e4e4e7"
            roughness={0.12}
            metalness={0.96}
            clearcoat={1}
            clearcoatRoughness={0.06}
            envMap={envMap}
            envMapIntensity={2.4}
          />
        </mesh>

        <mesh rotation={[-0.68, 0.85, 0.55]}>
          <torusGeometry args={[1.19, 0.14, 32, 96]} />
          <meshPhysicalMaterial
            color="#d4d4d8"
            roughness={0.15}
            metalness={0.95}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMap={envMap}
            envMapIntensity={2.2}
          />
        </mesh>

        <mesh rotation={[1.15, -0.45, 0.25]}>
          <torusGeometry args={[1.16, 0.11, 28, 96]} />
          <meshPhysicalMaterial
            color="#f4f4f5"
            roughness={0.1}
            metalness={0.98}
            clearcoat={1}
            envMap={envMap}
            envMapIntensity={2.5}
          />
        </mesh>
      </group>

      {/* Three Tilted Thin Orbital Wire Rings (exact match to the orbital rings in the SAPFORCE reference) */}
      <mesh ref={orbitRing1Ref} rotation={[1.08, 0.42, -0.35]}>
        <torusGeometry args={[1.95, 0.011, 16, 160]} />
        <meshStandardMaterial
          color="#d4f938"
          emissive="#FEF62A"
          emissiveIntensity={0.45}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={orbitRing2Ref} rotation={[0.82, -0.58, 0.48]}>
        <torusGeometry args={[2.12, 0.009, 16, 160]} />
        <meshStandardMaterial
          color="#e4e4e7"
          emissive="#ffffff"
          emissiveIntensity={0.2}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      <mesh ref={orbitRing3Ref} rotation={[1.28, 0.18, 0.75]}>
        <torusGeometry args={[1.76, 0.008, 16, 140]} />
        <meshStandardMaterial
          color="#a3e635"
          emissive="#a3e635"
          emissiveIntensity={0.35}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function canUseWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

export function HeroBlob() {
  const [mounted, setMounted] = useState(false);
  const [webglReady, setWebglReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ rotX: 0, rotY: 0, velX: 0, velY: 0, active: false });
  const lastClientRef = useRef({ x: 0, y: 0 });
  const pulseRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    setWebglReady(canUseWebGL());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointerRef.current.x = nx;
      pointerRef.current.y = ny;

      if (dragRef.current.active) {
        const dx = e.clientX - lastClientRef.current.x;
        const dy = e.clientY - lastClientRef.current.y;
        lastClientRef.current = { x: e.clientX, y: e.clientY };
        const vx = dx * 0.009;
        const vy = dy * 0.009;
        dragRef.current.rotY += vx;
        dragRef.current.rotX = Math.max(-1.1, Math.min(1.1, dragRef.current.rotX + vy));
        dragRef.current.velX = vx * 0.6;
        dragRef.current.velY = vy * 0.6;
      }
    };

    const onUp = () => {
      if (dragRef.current.active) {
        dragRef.current.active = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = true;
    dragRef.current.velX = 0;
    dragRef.current.velY = 0;
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    pulseRef.current = 1;
    setIsDragging(true);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      role="presentation"
      style={{
        width: '100%',
        height: '100%',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        position: 'relative',
      }}
      title="Drag to rotate · Click to pulse"
    >
      {/* Fallback sculptural SVG rendered until WebGL mounts or in headless browsers */}
      {(!mounted || !webglReady) && (
        <svg viewBox="0 0 500 500" className="w-full h-full select-none" aria-hidden>
          <defs>
            <radialGradient id="limeCoreGrad" cx="42%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#FEF62A" />
              <stop offset="45%" stopColor="#84cc16" />
              <stop offset="85%" stopColor="#1a2e05" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
            <linearGradient id="chromeBandGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="38%" stopColor="#a1a1aa" />
              <stop offset="72%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#e4e4e7" />
            </linearGradient>
          </defs>
          {/* Tilted Orbital Rings */}
          <ellipse
            cx="250"
            cy="250"
            rx="225"
            ry="76"
            transform="rotate(-24 250 250)"
            fill="none"
            stroke="#FEF62A"
            strokeOpacity="0.65"
            strokeWidth="1.6"
          />
          <ellipse
            cx="250"
            cy="250"
            rx="238"
            ry="84"
            transform="rotate(28 250 250)"
            fill="none"
            stroke="#e4e4e7"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
          <ellipse
            cx="250"
            cy="250"
            rx="195"
            ry="64"
            transform="rotate(-8 250 250)"
            fill="none"
            stroke="#a3e635"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
          {/* Core Sphere */}
          <circle cx="250" cy="250" r="132" fill="#0f131a" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
          {/* Acid-Lime Liquid Lobes */}
          <circle cx="236" cy="238" r="112" fill="url(#limeCoreGrad)" />
          {/* Sculpted Chrome Cage Bands */}
          <path
            d="M 135 205 C 185 110, 325 115, 365 215 C 395 295, 305 385, 205 365 C 125 345, 105 265, 135 205 Z"
            fill="none"
            stroke="url(#chromeBandGrad)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M 165 145 C 255 120, 365 185, 345 285 C 325 365, 215 390, 150 315 C 105 260, 115 165, 165 145 Z"
            fill="none"
            stroke="url(#chromeBandGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      )}

      {mounted && webglReady && (
        <Canvas
          camera={{ position: [0, 0, 5.1], fov: 38 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 5, 4]} intensity={2.8} color="#ffffff" />
          <directionalLight position={[-4, -2, 3]} intensity={1.8} color="#FEF62A" />
          <pointLight position={[0, 3, 2]} intensity={1.6} color="#a3e635" />
          <SapforceSculpture
            pointerRef={pointerRef}
            dragRef={dragRef}
            pulseRef={pulseRef}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      )}
    </div>
  );
}
