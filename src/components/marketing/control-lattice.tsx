'use client';

import { useEffect, useRef } from 'react';

/**
 * The living field behind "Built to stay in your control".
 *
 * A drifting lattice of nodes with signals travelling between them — the same
 * idea as the animated cortex on an AI product's hero, painted here in the
 * section's own ink and ember. It is decoration: it carries no information, is
 * hidden from assistive tech, freezes to a single frame for reduced motion, and
 * stops drawing entirely when it scrolls away or the tab is hidden.
 *
 * `field` is the whole-section backdrop; `topology` is the smaller graph inside
 * the service window, clustered around the three service pills.
 */

type Rgb = readonly [number, number, number];
type Variant = 'field' | 'topology';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  drift: number;
  phase: number;
  anchorX?: number;
  anchorY?: number;
};

type Pulse = { a: number; b: number; t: number; speed: number };

const INK: Rgb = [37, 38, 41];
const WARM: Rgb = [255, 245, 238];
const EMBER: Rgb = [242, 85, 51];
const EMBER_LIGHT: Rgb = [255, 241, 230];
const TAU = Math.PI * 2;
/** How far the cursor reaches into the lattice, in CSS pixels. */
const CURSOR_REACH = 168;

/** The service pills inside the window, as fractions of the stage. */
const ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0.57, 0.24],
  [0.33, 0.6],
  [0.72, 0.42],
  [0.5, 0.47],
];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const paint = (color: Rgb, alpha: number): string =>
  `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${Math.max(0, alpha)})`;

const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export function ControlLattice({ variant = 'field' }: { variant?: Variant }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const random = (min: number, max: number) => min + Math.random() * (max - min);

    let width = 1;
    let height = 1;
    let linkDistance = 140;
    let particles: Particle[] = [];
    let pulses: Pulse[] = [];
    let linkedPairs: number[] = [];
    let frameId = 0;
    let last = 0;
    let running = false;
    let onScreen = true;
    let pointer: { x: number; y: number } | null = null;

    const makeParticle = (x: number, y: number, anchorX?: number, anchorY?: number): Particle => ({
      x,
      y,
      anchorX,
      anchorY,
      vx: random(-0.14, 0.14),
      vy: random(-0.14, 0.14),
      radius: variant === 'topology' ? random(1.1, 2) : random(0.9, 1.8),
      drift: random(0.15, 0.5),
      phase: random(0, TAU),
    });

    const spawnPulse = (pulse: Pulse): Pulse => {
      pulse.t = 0;
      pulse.speed = variant === 'topology' ? random(0.005, 0.011) : random(0.003, 0.008);
      if (particles.length < 2) {
        pulse.a = 0;
        pulse.b = 0;
        return pulse;
      }
      // Prefer a pair the lattice has actually joined, so signals travel along
      // drawn edges instead of cutting across empty space.
      if (linkedPairs.length >= 2) {
        const index = Math.floor(Math.random() * Math.floor(linkedPairs.length / 2)) * 2;
        pulse.a = linkedPairs[index] ?? 0;
        pulse.b = linkedPairs[index + 1] ?? 0;
        return pulse;
      }
      const a = Math.floor(Math.random() * particles.length);
      let b = Math.floor(Math.random() * particles.length);
      if (b === a) b = (b + 1) % particles.length;
      pulse.a = a;
      pulse.b = b;
      return pulse;
    };

    const seed = () => {
      linkedPairs = [];
      if (variant === 'topology') {
        particles = [];
        for (const [ax, ay] of ANCHORS) {
          for (let index = 0; index < 4; index += 1) {
            particles.push(makeParticle(ax * width + random(-24, 24), ay * height + random(-20, 20), ax, ay));
          }
        }
        for (let index = 0; index < 7; index += 1) {
          particles.push(makeParticle(random(0, width), random(0, height)));
        }
        pulses = Array.from({ length: 7 }, () => spawnPulse({ a: 0, b: 0, t: 0, speed: 0 }));
        return;
      }
      const count = Math.min(96, Math.max(24, Math.round((width * height) / 16000)));
      particles = Array.from({ length: count }, () => makeParticle(random(0, width), random(0, height)));
      pulses = Array.from({ length: 12 }, () => spawnPulse({ a: 0, b: 0, t: 0, speed: 0 }));
    };

    // Ink on the cream half of the field, warm white once it has turned coral.
    const tintAt = (y: number): Rgb =>
      variant === 'topology' ? INK : mix(INK, WARM, smoothstep(0.4, 0.86, y / Math.max(1, height)));

    const draw = (now: number) => {
      const step = last ? Math.min(40, now - last) / 16.667 : 1;
      last = now;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.phase += 0.006 * step * particle.drift;
        if (particle.anchorX !== undefined && particle.anchorY !== undefined) {
          const targetX = particle.anchorX * width + Math.cos(particle.phase) * 26;
          const targetY = particle.anchorY * height + Math.sin(particle.phase * 1.3) * 20;
          particle.x += (targetX - particle.x) * 0.014 * step;
          particle.y += (targetY - particle.y) * 0.014 * step;
        } else {
          particle.x += particle.vx * step;
          particle.y += particle.vy * step;
          if (particle.x < -24) particle.x = width + 24;
          else if (particle.x > width + 24) particle.x = -24;
          if (particle.y < -24) particle.y = height + 24;
          else if (particle.y > height + 24) particle.y = -24;
        }
      }

      // The cursor joins the lattice: it links to whatever is near it and pulls
      // gently, so the field answers back when you move across the section.
      if (pointer) {
        for (const particle of particles) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > CURSOR_REACH || distance < 1) continue;
          const fade = 1 - distance / CURSOR_REACH;
          context.strokeStyle = paint(tintAt(particle.y), 0.3 * fade * fade);
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
          if (particle.anchorX === undefined) {
            particle.x += (dx / distance) * 0.16 * step * fade;
            particle.y += (dy / distance) * 0.16 * step * fade;
          }
        }
        context.strokeStyle = paint(tintAt(pointer.y), 0.22);
        context.beginPath();
        context.arc(pointer.x, pointer.y, 3.4, 0, TAU);
        context.stroke();
      }

      linkedPairs.length = 0;
      const linkAlpha = variant === 'topology' ? 0.18 : 0.14;
      context.lineWidth = 1;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i]!;
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > linkDistance) continue;
          const fade = 1 - distance / linkDistance;
          context.strokeStyle = paint(tintAt((a.y + b.y) / 2), linkAlpha * fade * fade);
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
          if (linkedPairs.length < 480) linkedPairs.push(i, j);
        }
      }

      for (const particle of particles) {
        context.fillStyle = paint(tintAt(particle.y), 0.4);
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, TAU);
        context.fill();
      }

      for (const pulse of pulses) {
        const from = particles[pulse.a];
        const to = particles[pulse.b];
        if (!from || !to) continue;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        pulse.t += pulse.speed * step;
        if (pulse.t >= 1 || Math.sqrt(dx * dx + dy * dy) > linkDistance * 1.7) {
          spawnPulse(pulse);
          continue;
        }
        const x = from.x + dx * pulse.t;
        const y = from.y + dy * pulse.t;
        const ember =
          variant === 'topology' ? EMBER : mix(EMBER, EMBER_LIGHT, smoothstep(0.35, 0.85, y / Math.max(1, height)));
        // Fade the signal in and out along the edge, so it reads as a packet
        // being passed rather than a dot blinking on and off.
        const envelope = Math.sin(Math.PI * pulse.t);
        context.fillStyle = paint(ember, 0.18 * envelope);
        context.beginPath();
        context.arc(x, y, 4.4, 0, TAU);
        context.fill();
        context.fillStyle = paint(ember, 0.85 * envelope);
        context.beginPath();
        context.arc(x, y, 1.5, 0, TAU);
        context.fill();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const shortest = Math.min(width, height);
      linkDistance =
        variant === 'topology'
          ? Math.min(200, Math.max(120, shortest * 0.46))
          : Math.min(152, Math.max(96, shortest * 0.32));
      seed();
      last = 0;
      draw(0);
    };

    const loop = (now: number) => {
      draw(now);
      frameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || motionQuery.matches) return;
      running = true;
      last = 0;
      frameId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frameId);
    };

    const sync = () => {
      if (onScreen && !document.hidden && !motionQuery.matches) start();
      else stop();
    };

    resize();

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    let intersectionObserver: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry?.isIntersecting ?? true;
          sync();
        },
        { rootMargin: '160px' },
      );
      intersectionObserver.observe(canvas);
    }

    const surface = canvas.parentElement ?? canvas;
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    // Only where there is a real cursor to follow; touch devices keep the calm
    // field without a stray tap pinning it.
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (finePointer) {
      surface.addEventListener('pointermove', onPointerMove, { passive: true });
      surface.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }

    const onVisibility = () => sync();
    const onMotionChange = () => {
      if (motionQuery.matches) {
        stop();
        last = 0;
        draw(0);
      } else {
        sync();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener?.('change', onMotionChange);

    return () => {
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (finePointer) {
        surface.removeEventListener('pointermove', onPointerMove);
        surface.removeEventListener('pointerleave', onPointerLeave);
      }
      motionQuery.removeEventListener?.('change', onMotionChange);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={variant === 'topology' ? 'mk-control-lattice mk-control-lattice--topology' : 'mk-control-lattice'}
      aria-hidden="true"
    />
  );
}
