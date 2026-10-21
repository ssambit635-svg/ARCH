'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { DotGrid } from './dot-grid';

interface GetStartedActionProps {
  href: string;
  label?: string;
  className?: string;
}

/**
 * The hero's ink action, and the one piece of choreography on the page that is allowed to be
 * theatrical. Where the Aceternity block only rotated its yellow dot box a quarter turn, this
 * swaps the whole button: the sunbeam square travels to the right edge and the label takes its
 * place on the left, so hovering the call to action reads as a deliberate movement rather than
 * a twitch.
 *
 * The swap is measured, not guessed — the two halves are moved by each other's real width plus
 * the real gap, so the button keeps its footprint in every font and at every breakpoint, and
 * nothing reflows underneath it.
 *
 * Degradation, in order:
 *   - No JavaScript / no GSAP: the CSS hover still rotates the dot box. The label simply stays
 *     where it is, and the button is a normal ink button.
 *   - Reduced motion: no travel at all, only the existing CSS transition.
 *   - Touch: there is no hover to answer, so the button rests in its default arrangement.
 */
export function GetStartedAction({ href, label = 'Get started', className = 'mk-button mk-button--ink' }: GetStartedActionProps) {
  const rootRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const chip = root.querySelector<HTMLElement>('.mk-dots');
    const text = root.querySelector<HTMLElement>('.mk-action-label');
    if (!chip || !text) return;

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
    if (!canHover.matches || !motion.matches) return;

    let swapped = false;

    const measure = () => {
      const styles = getComputedStyle(root);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '12') || 12;
      return { gap, chip: chip.offsetWidth, text: text.offsetWidth };
    };

    const run = (next: boolean, instant = false) => {
      const { gap, chip: chipWidth, text: textWidth } = measure();
      const duration = instant ? 0 : next ? 0.78 : 0.62;
      // Out: the label clears the square's old seat first, then the square lands — a hand-off
      // rather than two things sliding in lockstep.
      gsap.to(text, {
        x: next ? -(chipWidth + gap) : 0,
        duration: duration * (next ? 1 : 0.9),
        delay: next ? 0 : 0.04,
        ease: next ? 'expo.inOut' : 'power4.out',
        overwrite: 'auto',
      });
      const travel: gsap.TweenVars = {
        x: next ? textWidth + gap : 0,
        rotate: next ? 180 : 0,
        borderRadius: next ? '50%' : '6px',
        duration: next ? 0.92 : 0.66,
        delay: next ? 0.06 : 0,
        ease: next ? 'expo.inOut' : 'power4.out',
        overwrite: 'auto',
      };
      // Coming home the square also drops the breath of scale it picked up on the way out, so
      // an interrupted hover can never leave it stranded mid-swap.
      gsap.to(chip, next ? travel : { ...travel, scale: 1 });
      // A breath of scale carries the square across; it settles back before it stops.
      if (next) {
        gsap.to(chip, {
          scale: 1.14,
          duration: duration * 0.5,
          delay: 0.06,
          ease: 'sine.out',
          yoyo: true,
          repeat: 1,
          overwrite: false,
        });
      }
      root.classList.toggle('is-swapped', next);
      swapped = next;
    };

    const enter = () => run(true);
    const leave = () => run(false);
    // A font that lands late, or a breakpoint change, must not leave the two halves offset.
    const settle = () => run(swapped, true);

    root.addEventListener('pointerenter', enter);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('focus', enter);
    root.addEventListener('blur', leave);
    window.addEventListener('resize', settle);

    return () => {
      root.removeEventListener('pointerenter', enter);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('focus', enter);
      root.removeEventListener('blur', leave);
      window.removeEventListener('resize', settle);
      gsap.killTweensOf([chip, text]);
      gsap.set([chip, text], { clearProps: 'transform,borderRadius' });
    };
  }, []);

  return (
    <Link ref={rootRef} href={href} className={className}>
      <DotGrid />
      <span className="mk-action-label">{label}</span>
    </Link>
  );
}
