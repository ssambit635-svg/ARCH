'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

declare global {
  interface Window {
    __archLenis?: Lenis;
  }
}

/**
 * Lenis smooth scroll, driven off the GSAP ticker.
 *
 * Two details that are easy to get wrong and expensive when you do:
 *
 *   1. Lenis and ScrollTrigger must share ONE rAF loop. If ScrollTrigger reads scroll position on
 *      its own tick while Lenis is still lerping towards it, pinned sections visibly lag one frame
 *      behind the page — the classic "jittery pin". Feeding `lenis.raf` from `gsap.ticker` and
 *      calling `ScrollTrigger.update` in Lenis' own scroll event keeps them phase-locked.
 *   2. `lagSmoothing(0)` disables GSAP's catch-up behaviour. On a dropped frame GSAP would otherwise
 *      fast-forward every tween, which reads as a lurch during a fast flick.
 *
 * The instance is published on `window.__archLenis` so anchor links and the command palette can
 * `scrollTo` through it instead of fighting the transform with a native jump.
 */
export function useLenis(enabled = true) {
  const ready = useRef(false);

  useEffect(() => {
    if (!enabled || ready.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    ready.current = true;

    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.6,
      smoothWheel: true,
      // Momentum scroll on iOS makes pinned sections overshoot their scrub range.
      syncTouch: false,
      infinite: false,
    });

    window.__archLenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => {
      // GSAP's ticker reports seconds; Lenis wants milliseconds.
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Anchor links route through Lenis so the easing matches a wheel scroll.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -84, duration: 1.35 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
      delete window.__archLenis;
      ready.current = false;
    };
  }, [enabled]);
}

/** Smoothly scroll to a hash target through Lenis, falling back to native behaviour. */
export function scrollToHash(hash: string, offset = -84) {
  if (typeof window === 'undefined') return;
  const target = document.querySelector(hash);
  if (!target) return;
  if (window.__archLenis) {
    window.__archLenis.scrollTo(target as HTMLElement, { offset, duration: 1.35 });
  } else {
    (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
