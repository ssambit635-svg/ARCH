'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * One motion owner for the landing page, not one scroll listener per component.
 *
 * All content is readable in SSR and in no-JS mode; GSAP only enhances it after mount.
 * `matchMedia` reverts every tween, split and trigger on a preference or breakpoint change,
 * and the context cleans up on navigation. Deliberately absent: pinned scroll-jacking.
 * Sections move a few pixels, headings mask in, and everything settles.
 *
 * Motion is wrapped in a single try/catch by the component below: a plugin that fails to
 * register or a tween that throws disables the animation, never the page. Before this, an
 * exception inside the layout effect unmounted the marketing tree and a visitor saw a blank
 * document even though the server had rendered every word.
 */
function setupMotion(root: HTMLElement): () => void {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  let disposed = false;
  let refreshFrame = 0;
  const revealedElements = new WeakSet<HTMLElement>();
  const refreshLayout = () => {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => {
      if (!disposed) ScrollTrigger.refresh();
    });
  };

  const context = gsap.context(() => {
    const media = gsap.matchMedia();
    media.add({
      animate: '(prefers-reduced-motion: no-preference)',
      reduced: '(prefers-reduced-motion: reduce)',
      compact: '(max-width: 760px)',
    }, (match) => {
      if (!match.conditions?.animate) {
        root.dataset.mkMotion = 'reduced';
        return;
      }

      const compact = Boolean(match.conditions.compact);
      const select = <T extends HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
      const upcoming = (element: HTMLElement) => element.getBoundingClientRect().bottom > 0;

      // Headings mask in, once, when they approach the viewport. The hero headline is one of
      // them: it sits above the trigger line on load, so it is uncovered as the page opens
      // rather than waiting for a scroll that has not happened yet.
      for (const heading of select('[data-mk-heading]').filter(upcoming)) {
        if (revealedElements.has(heading)) continue;
        const inHero = Boolean(heading.closest('.mk-hero'));
        let revealed = false;
        SplitText.create(heading, {
          type: 'lines,words',
          mask: 'lines',
          linesClass: 'mk-split-line',
          wordsClass: 'mk-split-word',
          autoSplit: true,
          aria: 'auto',
          onSplit: (split) => {
            // A late font metric must never replay a heading the visitor has already read.
            if (revealed) return gsap.set(split.words, { clearProps: 'transform,opacity' });
            return gsap.fromTo(split.words, {
              yPercent: 110,
              opacity: 0,
            }, {
              yPercent: 0,
              opacity: 1,
              duration: 1.05,
              stagger: { amount: 0.28 },
              ease: 'power4.out',
              clearProps: 'transform,opacity',
              onComplete: () => {
                revealed = true;
                revealedElements.add(heading);
              },
              ...(inHero
                ? { delay: 0.08 }
                : { scrollTrigger: { trigger: heading, start: 'top 92%', once: true } }),
            });
          },
        });
      }

      const reveal = (targets: HTMLElement[], trigger: HTMLElement) => {
        const unread = targets.filter((element) => !revealedElements.has(element));
        if (!unread.length || !upcoming(trigger)) return;
        // Hero content never waits on a scroll position: on short viewports the call to
        // action sits below the trigger line and would stay invisible on load.
        const inHero = Boolean(trigger.closest('.mk-hero'));
        gsap.fromTo(unread, { y: compact ? 14 : 24, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: { amount: Math.min(0.36, unread.length * 0.08) },
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          onComplete: () => unread.forEach((element) => revealedElements.add(element)),
          ...(inHero
            ? { delay: 0.14 }
            : { scrollTrigger: { trigger, start: 'top 92%', once: true } }),
        });
      };

      for (const element of select('[data-mk-reveal]')) reveal([element], element);
      for (const group of select('[data-mk-stagger]')) {
        const items = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
        if (compact && group.dataset.mkStagger === 'rows') {
          for (const item of items) reveal([item], item);
        } else {
          reveal(items, group);
        }
      }

      // The closing headline is uncovered rather than faded: a clip-path curtain rises from
      // the baseline. Text is never transparent, so a dropped trigger cannot hide the sentence.
      for (const curtain of select('[data-mk-curtain]').filter(upcoming)) {
        gsap.fromTo(curtain, { clipPath: 'inset(0% 0% 100% 0%)', y: compact ? 12 : 26 }, {
          clipPath: 'inset(0% 0% 0% 0%)',
          y: 0,
          duration: 0.95,
          ease: 'power4.out',
          scrollTrigger: { trigger: curtain, start: 'top 88%', once: true },
          clearProps: 'clipPath,transform',
        });
      }

      // Product panels rise into place without ever being hidden, so they stay interactive.
      for (const panel of select('[data-mk-panel]').filter(upcoming)) {
        gsap.fromTo(panel, { y: compact ? 14 : 34 }, {
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: panel,
            start: 'top 98%',
            end: 'top 62%',
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });
      }

      // Each band's atmosphere drifts a little slower than the page, so the dawn behind the
      // copy reads as weather rather than wallpaper. One transform driven by a custom
      // property, scrubbed — no layout, and nothing at all under reduced motion.
      for (const band of select<HTMLElement>('.mk-atmos')) {
        gsap.fromTo(band, { '--mk-atmos-y': '-38px' }, {
          '--mk-atmos-y': '38px',
          ease: 'none',
          scrollTrigger: {
            trigger: band,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      }

      // The painted mountain-and-lake horizon in the footer drifts gently as the close enters.
      for (const footer of select<HTMLElement>('.mk-footer')) {
        gsap.fromTo(footer, { '--mk-footer-sky-y': '-28px' }, {
          '--mk-footer-sky-y': '28px',
          ease: 'none',
          scrollTrigger: {
            trigger: footer,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      }

      // The closing wordmark drifts up as the page ends.
      for (const wordmark of select('[data-mk-wordmark]')) {
        gsap.fromTo(wordmark, { yPercent: 18, opacity: 0.4 }, {
          yPercent: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: wordmark.parentElement,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });
      }

      // Failsafe. A scroll trigger that never fires (a stale layout after a late image, a
      // throttled rAF loop on a slow device, a browser that drops ScrollTrigger's refresh)
      // must not leave copy permanently transparent. Anything still at zero opacity inside the
      // viewport after three seconds is handed back to the page, whether or not it was hugged
      // by the observer.
      const failsafe = window.setTimeout(() => {
        for (const element of select<HTMLElement>('[data-mk-reveal], [data-mk-stagger] > *, [data-mk-curtain], .mk-split-word')) {
          const rect = element.getBoundingClientRect();
          const visible = rect.bottom > 0 && rect.top < window.innerHeight;
          if (!visible) continue;
          if (Number.parseFloat(getComputedStyle(element).opacity) > 0.99) continue;
          gsap.set(element, { clearProps: 'opacity,transform,clipPath' });
          revealedElements.add(element);
        }
      }, 3000);

      root.dataset.mkMotion = 'ready';
      refreshLayout();
      return () => window.clearTimeout(failsafe);
    });
    return () => media.revert();
  }, root);

  // Native disclosure changes and late font metrics must not leave stale scroll bounds.
  root.addEventListener('toggle', refreshLayout, true);
  void document.fonts?.ready.then(refreshLayout);
  return () => {
    disposed = true;
    cancelAnimationFrame(refreshFrame);
    root.removeEventListener('toggle', refreshLayout, true);
    context.revert();
    delete root.dataset.mkMotion;
  };
}

export function MarketingMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cleanup: (() => void) | undefined;
    try {
      cleanup = setupMotion(root);
    } catch (error) {
      // Motion is an enhancement, never a dependency. If a plugin fails to load or a tween
      // throws, the page keeps the markup it was server-rendered with instead of unmounting
      // to an empty document — a visitor loses an animation, not the site.
      console.warn('[mk] motion unavailable — the page stays fully visible.', error);
      root.dataset.mkMotion = 'off';
      return;
    }
    return cleanup;
  }, []);

  return <div ref={rootRef} className="mk">{children}</div>;
}
