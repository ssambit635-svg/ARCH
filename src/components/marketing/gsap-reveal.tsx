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
 */
export function MarketingMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
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

        // Headings mask in, once, when they approach the viewport.
        for (const heading of select('[data-mk-heading]').filter(upcoming)) {
          if (revealedElements.has(heading)) continue;
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
                duration: 0.8,
                stagger: { amount: 0.2 },
                ease: 'power4.out',
                clearProps: 'transform,opacity',
                onComplete: () => {
                  revealed = true;
                  revealedElements.add(heading);
                },
                scrollTrigger: { trigger: heading, start: 'top 92%', once: true },
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
          gsap.fromTo(unread, { y: compact ? 14 : 22, opacity: 0 }, {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: { amount: Math.min(0.3, unread.length * 0.06) },
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            onComplete: () => unread.forEach((element) => revealedElements.add(element)),
            ...(inHero
              ? { delay: 0.12 }
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

        root.dataset.mkMotion = 'ready';
        refreshLayout();
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
  }, []);

  return <div ref={rootRef} className="mk">{children}</div>;
}
