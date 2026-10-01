'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * One motion owner for the landing page, not one scroll listener per component.
 * The film is deliberately excluded. All content is readable in SSR/no-JS mode;
 * GSAP only enhances it after mount. matchMedia reverts every tween, split and
 * trigger on preference/breakpoint changes, and the context cleans up on navigation.
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
        compact: '(max-width: 759px)',
      }, (match) => {
        if (!match.conditions?.animate) {
          root.dataset.mkMotion = 'reduced';
          return;
        }

        const compact = Boolean(match.conditions.compact);
        const select = <T extends HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
        const upcoming = (element: HTMLElement) => element.getBoundingClientRect().bottom > 0;

        // Pin only the interlude, never the film or interactive product previews.
        // Mobile keeps natural scrolling with smaller depth offsets.
        for (const story of select('[data-mk-story]')) {
          const stage = story.querySelector<HTMLElement>('.mk-story-stage');
          if (!stage) continue;
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: story,
              start: compact ? 'top bottom' : 'top top',
              end: compact ? 'bottom top' : '+=110%',
              pin: compact ? false : stage,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
          timeline.fromTo(story.querySelector('[data-mk-depth="back"]'),
            { yPercent: -12, rotation: -15 }, { yPercent: 18, rotation: 20, ease: 'none' }, 0);
          timeline.fromTo(story.querySelector('[data-mk-depth="front"]'),
            { yPercent: 24, scale: 0.85 }, { yPercent: -30, scale: 1.15, ease: 'none' }, 0);
          timeline.fromTo(story.querySelector('[data-mk-depth="copy"]'),
            { y: compact ? 24 : 65 }, { y: compact ? -24 : -65, ease: 'none' }, 0);
        }

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
              // Font loading/resizing must never replay a heading the visitor has read.
              if (revealed) return gsap.set(split.words, { clearProps: 'transform,opacity' });
              return gsap.fromTo(split.words, {
                yPercent: 115,
                rotation: compact ? 0 : 1.5,
                opacity: 0,
              }, {
                yPercent: 0,
                rotation: 0,
                opacity: 1,
                duration: 0.85,
                stagger: { amount: 0.22 },
                ease: 'power4.out',
                clearProps: 'transform,opacity',
                onComplete: () => {
                  revealed = true;
                  revealedElements.add(heading);
                },
                scrollTrigger: { trigger: heading, start: 'top 90%', once: true },
              });
            },
          });
        }

        const reveal = (targets: HTMLElement[], trigger: HTMLElement) => {
          const unread = targets.filter((element) => !revealedElements.has(element));
          if (!unread.length || !upcoming(trigger)) return;
          gsap.fromTo(unread, { y: compact ? 18 : 28, opacity: 0 }, {
            y: 0,
            opacity: 1,
            duration: 0.75,
            stagger: { amount: Math.min(0.36, unread.length * 0.07) },
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            onComplete: () => unread.forEach((element) => revealedElements.add(element)),
            scrollTrigger: { trigger, start: 'top 90%', once: true },
          });
        };

        for (const element of select('[data-mk-reveal]')) reveal([element], element);
        for (const group of select('[data-mk-stagger]')) {
          const items = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
          // Stacked mobile articles reveal individually, not before they enter view.
          if (compact && group.dataset.mkStagger === 'rows') {
            for (const item of items) reveal([item], item);
          } else {
            reveal(items, group);
          }
        }

        for (const panel of select('[data-mk-panel]').filter(upcoming)) {
          // No opacity hiding: interactive previews remain usable throughout the scrub.
          gsap.fromTo(panel, { y: compact ? 18 : 44, scale: compact ? 1 : 0.985 }, {
            y: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              start: 'top 96%',
              end: 'top 56%',
              scrub: 0.45,
              invalidateOnRefresh: true,
            },
          });
        }

        for (const track of select('[data-mk-progress]')) {
          const workflow = track.closest<HTMLElement>('.mk-lifecycle-grid');
          if (!workflow) continue;
          gsap.fromTo(track, { scaleY: 0 }, {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: workflow,
              start: 'top 76%',
              end: 'bottom 48%',
              scrub: 0.35,
              invalidateOnRefresh: true,
            },
          });
        }

        for (const wordmark of select('[data-mk-wordmark]')) {
          gsap.fromTo(wordmark, { yPercent: 28, opacity: 0.45 }, {
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
