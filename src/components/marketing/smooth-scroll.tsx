'use client';

import { useEffect } from 'react';

/**
 * A single, slow glide for the whole page.
 *
 * The wheel no longer moves the document: it moves a target, and the document eases toward that
 * target every frame. The result is the long, weighted scroll of a site that expects to be read
 * rather than skimmed — and because the real scroll position is still what moves, scroll-linked
 * animation (everything GSAP ScrollTrigger owns), the sticky navbar and the browser's own
 * scrollbar stay in step with it.
 *
 * What it deliberately does not do:
 *   - No scroll-jacking of any other input. Keyboard, the scrollbar, find-in-page, focus
 *     scrolling and anchor jumps all keep their native behaviour; the loop simply re-syncs to
 *     whatever position the browser reached.
 *   - No hijack on touch. Momentum scrolling on a phone is already the good version of this,
 *     and fighting it produces the rubber-banding everyone hates.
 *   - No hijack under `prefers-reduced-motion`. A visitor who asked for less movement gets the
 *     browser's own scrolling back immediately.
 *   - No fixed-height wrapper. The document's real height never changes, so nothing that
 *     measures it (ScrollTrigger included) has to be told twice.
 */

/** Fraction of the remaining distance covered per frame. Lower is slower. */
const EASE = 0.068;
/** How far one wheel notch travels, before the glide. Below 1 the page feels heavier. */
const GAIN = 0.78;
/** Below this many pixels of remaining distance the glide snaps and the loop stops. */
const SETTLE = 0.12;
/** Space left above an in-page target when an anchor link is followed. */
const ANCHOR_OFFSET = 96;

export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (reduced.matches || !finePointer.matches) return;

    let target = window.scrollY;
    let current = target;
    let lastApplied = Math.round(target);
    let running = false;
    let frame = 0;

    const limit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clamp = (value: number) => Math.min(Math.max(value, 0), limit());

    const tick = () => {
      const remaining = target - current;
      if (Math.abs(remaining) < SETTLE) {
        current = target;
        window.scrollTo(0, current);
        lastApplied = Math.round(current);
        running = false;
        return;
      }
      current += remaining * EASE;
      window.scrollTo(0, current);
      lastApplied = Math.round(current);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    // Anything that moves the page by other means (keyboard, scrollbar drag, find-in-page,
    // an element being focused) wins: the glide adopts the new position instead of dragging
    // the visitor back to where it thought they were.
    const adopt = (value: number) => {
      current = value;
      target = value;
      lastApplied = Math.round(value);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return;
      // A sideways gesture belongs to the element under the pointer, not to the page.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const node = event.target instanceof Element ? event.target : null;
      // Panels with their own scrollbar keep it.
      if (node?.closest('[data-mk-native-scroll]')) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      target = clamp(target + event.deltaY * unit * GAIN);
      start();
    };

    const onScroll = () => {
      if (running) return;
      if (Math.abs(window.scrollY - lastApplied) > 2) adopt(window.scrollY);
    };

    const onResize = () => {
      target = clamp(target);
      adopt(window.scrollY);
    };

    // In-page links glide instead of teleporting, at the same speed as everything else.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const destination = document.querySelector(hash);
      if (!(destination instanceof HTMLElement)) return;
      event.preventDefault();
      target = clamp(destination.getBoundingClientRect().top + window.scrollY - ANCHOR_OFFSET);
      start();
      window.history.replaceState(null, '', hash);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
