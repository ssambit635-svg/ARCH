'use client';

import { useEffect, useState } from 'react';

/**
 * Motion preferences, resolved once and shared.
 *
 * Every signature animation on the marketing surface — the pinned scroll story, the WebGL hero,
 * the scramble decode, the magnetic cursor — is gated on this. A visitor with vestibular
 * sensitivity gets the same *content* and the same hierarchy, statically composed, with reveals
 * resolved to their end state so nothing is stranded off-screen.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return reduced;
}

/** True only on devices with a real pointer — gates cursor replacement and hover-only affordances. */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const apply = () => setFine(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return fine;
}

/** Viewport width, so heavy scenes can opt out on small screens instead of dropping frames. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(1440);

  useEffect(() => {
    const apply = () => setWidth(window.innerWidth);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  return width;
}

/** The house easing. One curve everywhere is what makes a site feel authored rather than assembled. */
export const EASE = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  /** Slight overshoot, used only for physical things settling into place. */
  settle: [0.34, 1.32, 0.4, 1] as const,
};
