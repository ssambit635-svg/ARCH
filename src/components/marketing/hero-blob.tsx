'use client';

import { Component, useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { usePrefersReducedMotion, useViewportWidth } from '@/lib/motion';

/**
 * ARCH hero — the load-bearing object.
 *
 * The hero used to carry a decorative network graphic; it now carries this: a machined chrome
 * body with two glossy blue cores breaking its surface, wrapped in three hairline orbits. It is
 * the product's claim — the structure holds, and the signal inside it keeps beating — drawn as
 * an object you can turn over in your hands.
 *
 * Why procedural geometry and not a downloaded model:
 *   - It is *interactive*. Drag spins it with inertia, hover parallaxes it, a tap makes the
 *     cores swell. A static asset can only be looked at.
 *   - It costs ~0 bytes of payload: three spheres, three tori, four light cards.
 *   - It stays crisp at any DPR, and it can never 404.
 *
 * Lighting is a procedural studio built from `Lightformer`s inside drei's `<Environment>`: one
 * real IBL cube rendered once at boot (`frames={1}`), so the metal gets genuine specular roll-off
 * with no HDRI download — an air-gapped install renders identically. No bloom and no coloured
 * glow: depth comes from light behaving like light.
 */

/* ---- The rig -------------------------------------------------------------------------------
 * One mutable object shared between the DOM handlers and the render loop. Rotation lives
 * outside React state on purpose: a `setState` per pointer move would re-render the tree 120
 * times a second and the spin would visibly lag the finger. The loop reads and damps this
 * object instead, so React renders once and the GPU does the rest. */
type Rig = {
  dragging: boolean;
  /** Pointer id we captured, so a second finger never hijacks the spin. */
  pointerId: number | null;
  lastX: number;
  lastY: number;
  moved: number;
  velX: number;
  velY: number;
  rotX: number;
  rotY: number;
  /** Hover parallax, -1..1 across the object. */
  hoverX: number;
  hoverY: number;
  /** Tap envelope: 1 on tap, damped back to 0. */
  pulse: number;
  /** Page scroll in px, for the slow drift. */
  scroll: number;
};

/** The one uniform we drive imperatively; drei's distort material exposes it as a property. */
type DistortLike = { distort: number };

const CHROME_DISTORT = 0.38;
const LIQUID_DISTORT = [0.5, 0.6];

function BlobStage({
  rig,
  reduced,
  detail,
}: {
  rig: React.RefObject<Rig>;
  reduced: boolean;
  detail: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const rings = useRef<THREE.Group>(null!);
  const chromeMesh = useRef<THREE.Mesh>(null!);
  const liquidMeshes = useRef<(THREE.Mesh | null)[]>([null, null]);

  useFrame((_state, delta) => {
    // Clamp delta so a backgrounded tab does not resume with a four-second jump.
    const d = Math.min(delta, 1 / 20);
    const r = rig.current;
    if (!r) return;

    if (!r.dragging) {
      r.rotY += r.velY;
      r.rotX += r.velX;
      const decay = Math.pow(0.935, d * 60);
      r.velX *= decay;
      r.velY *= decay;
      if (!reduced) r.rotY += d * 0.16; // idle drift, so the object is never dead
    }
    r.rotX = THREE.MathUtils.clamp(r.rotX, -0.9, 0.9);
    r.pulse *= Math.pow(0.9, d * 60);

    // Pointer parallax layers on top of the drag rotation; it never fights it.
    const targetY = r.rotY + r.hoverX * 0.24 + r.scroll * 0.00035;
    const targetX = r.rotX + r.hoverY * 0.17;
    const k = 1 - Math.exp(-d * 7);

    const g = group.current;
    if (g) {
      g.rotation.y += (targetY - g.rotation.y) * k;
      g.rotation.x += (targetX - g.rotation.x) * k;
      const s = 1 + r.pulse * 0.075;
      g.scale.set(s, s, s);
    }
    if (rings.current && !reduced) rings.current.rotation.y += d * 0.09;

    const chrome = chromeMesh.current?.material as unknown as DistortLike | undefined;
    if (chrome) chrome.distort = CHROME_DISTORT + r.pulse * 0.3;
    liquidMeshes.current.forEach((mesh, index) => {
      const material = mesh?.material as unknown as DistortLike | undefined;
      const base = LIQUID_DISTORT[index];
      if (material && base !== undefined) material.distort = base + r.pulse * 0.34;
    });
  });

  return (
    <group ref={group}>
      {/* The machined body: steel, low roughness, lit entirely by the studio. */}
      <mesh ref={chromeMesh}>
        <sphereGeometry args={[1.3, detail, detail]} />
        <MeshDistortMaterial
          distort={CHROME_DISTORT}
          speed={reduced ? 0 : 1.1}
          color="#b9c9d8"
          metalness={0.94}
          roughness={0.17}
          envMapIntensity={1.15}
        />
      </mesh>

      {/* Two glossy cores breaking the surface — the signal inside the structure. */}
      <mesh
        position={[0.68, 0.36, 0.56]}
        ref={(mesh) => {
          liquidMeshes.current[0] = mesh;
        }}
      >
        <sphereGeometry args={[0.66, 64, 64]} />
        <MeshDistortMaterial
          distort={LIQUID_DISTORT[0]}
          speed={reduced ? 0 : 1.7}
          color="#1f6feb"
          metalness={0.15}
          roughness={0.06}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={1.4}
        />
      </mesh>
      <mesh
        position={[-0.6, -0.47, 0.64]}
        ref={(mesh) => {
          liquidMeshes.current[1] = mesh;
        }}
      >
        <sphereGeometry args={[0.52, 64, 64]} />
        <MeshDistortMaterial
          distort={LIQUID_DISTORT[1]}
          speed={reduced ? 0 : 2.1}
          color="#3b8ef0"
          metalness={0.1}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Three hairline orbits. Light streaks, not glows: basic material, no bloom. */}
      <group ref={rings}>
        <mesh rotation={[Math.PI / 2.15, 0.32, 0.08]}>
          <torusGeometry args={[1.84, 0.0055, 6, 256]} />
          <meshBasicMaterial color="#dbeafe" transparent opacity={0.8} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 1.72, -0.55, 0.16]}>
          <torusGeometry args={[1.96, 0.0045, 6, 256]} />
          <meshBasicMaterial color="#a9cdf6" transparent opacity={0.55} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2.6, 0.9, -0.12]}>
          <torusGeometry args={[1.66, 0.004, 6, 256]} />
          <meshBasicMaterial color="#e6f0fd" transparent opacity={0.4} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** One IBL cube, rendered once: soft top key, cool fill, blue rim, floor bounce. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={3.1} color="#ffffff" position={[0, 6, 2]} scale={[9, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.5} color="#bcd8ff" position={[-7, 1, -4]} scale={[6, 6, 1]} rotation-y={Math.PI / 3} />
      <Lightformer form="rect" intensity={2.2} color="#2f7ee0" position={[6.5, -1.5, 4]} scale={[5, 3, 1]} rotation-y={-Math.PI / 4} />
      <Lightformer form="ring" intensity={0.9} color="#ffffff" position={[0, -6.5, 0]} scale={[8, 8, 1]} rotation-x={Math.PI / 2} />
    </Environment>
  );
}

/** If WebGL is unavailable the page must still read as a designed page, not a hole. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="arch-blob-fallback" aria-hidden="true">
          <span className="arch-blob-fallback-core" />
          <span className="arch-blob-fallback-ring" />
          <span className="arch-blob-fallback-ring is-two" />
        </div>
      );
    }
    return this.props.children;
  }
}

export function HeroBlob({ className = '' }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const width = useViewportWidth();
  const compact = width > 0 && width < 768;
  const [touched, setTouched] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  const rig = useRef<Rig>({
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    moved: 0,
    velX: 0,
    velY: 0,
    rotX: -0.12,
    rotY: 0.5,
    hoverX: 0,
    hoverY: 0,
    pulse: 0,
    scroll: 0,
  });

  // Page scroll feeds the drift: one passive listener, rAF-batched.
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      rig.current.scroll = window.scrollY;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const r = rig.current;
    if (r.pointerId !== null) return;
    r.dragging = true;
    r.pointerId = event.pointerId;
    r.lastX = event.clientX;
    r.lastY = event.clientY;
    r.moved = 0;
    r.velX = 0;
    r.velY = 0;
    hostRef.current?.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const r = rig.current;
    const host = hostRef.current;
    if (!host) return;

    // Parallax is derived from position inside the object, so it also works on touch.
    const box = host.getBoundingClientRect();
    r.hoverX = ((event.clientX - box.left) / box.width) * 2 - 1;
    r.hoverY = ((event.clientY - box.top) / box.height) * 2 - 1;

    if (!r.dragging || event.pointerId !== r.pointerId) return;
    const dx = event.clientX - r.lastX;
    const dy = event.clientY - r.lastY;
    r.lastX = event.clientX;
    r.lastY = event.clientY;
    r.moved += Math.abs(dx) + Math.abs(dy);
    r.rotY += dx * 0.008;
    r.rotX = THREE.MathUtils.clamp(r.rotX + dy * 0.006, -0.9, 0.9);
    // Velocity is smoothed so a flick throws the object instead of nudging it.
    r.velY = r.velY * 0.6 + dx * 0.008 * 0.4;
    r.velX = r.velX * 0.6 + dy * 0.006 * 0.4;
    if (r.moved > 6) setTouched(true);
  }, []);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const r = rig.current;
    if (event.pointerId !== r.pointerId) return;
    r.dragging = false;
    r.pointerId = null;
    if (hostRef.current?.hasPointerCapture(event.pointerId)) {
      hostRef.current.releasePointerCapture(event.pointerId);
    }
    // A press that never travelled is a tap: the cores swell.
    if (r.moved < 6) {
      r.pulse = 1;
      setTouched(true);
    }
  }, []);

  const onPointerLeave = useCallback(() => {
    const r = rig.current;
    r.hoverX = 0;
    r.hoverY = 0;
  }, []);

  return (
    <div className={`arch-blob ${className}`}>
      <div
        ref={hostRef}
        className="arch-blob-host"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onPointerLeave}
        role="img"
        aria-label="Interactive render of the ARCH core: a machined steel body with two glossy blue cores inside three hairline orbits. Drag to rotate, tap to pulse."
      >
        <SceneBoundary>
          <Canvas
            dpr={[1, compact ? 1.5 : 1.9]}
            camera={{ position: [0, 0, 6.5], fov: 34 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.setClearAlpha(0);
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.08;
            }}
          >
            <Studio />
            <BlobStage rig={rig} reduced={reduced} detail={compact ? 96 : 128} />
            <AdaptiveDpr pixelated />
          </Canvas>
        </SceneBoundary>
      </div>

      <p className={`arch-blob-hint arch-mono${touched ? ' is-spent' : ''}`} aria-hidden="true">
        <span className="arch-blob-hint-dot" />
        drag to rotate · tap to pulse
      </p>
    </div>
  );
}

export default HeroBlob;
