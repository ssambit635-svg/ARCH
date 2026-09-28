'use client';

import { useEffect, useRef, useState } from 'react';
import type { ComponentType, CSSProperties, ElementType, ReactNode, Ref } from 'react';
import { useBooted } from './boot-gate';

/**
 * What the polymorphic wrapper is allowed to forward.
 *
 * `as="li"` and `as="span"` both need to keep working, but a bare `ElementType` makes TypeScript
 * resolve every prop to `never`. Naming the four things this component sets restores checking on
 * them, and anything else the caller needs can go through `className`.
 */
type RevealTagProps = {
  ref?: Ref<HTMLElement>;
  className?: string;
  style?: CSSProperties;
  'data-shown'?: string;
  children?: ReactNode;
};

/**
 * Scroll reveal primitive.
 *
 * Deliberately an IntersectionObserver flipping a single `data-shown` attribute rather than a
 * scroll handler: the browser does the hit-testing off the main thread, and the actual transition
 * lives in CSS so it stays on the compositor. GSAP is reserved for the sequences that genuinely
 * need scrubbing (the pinned lifecycle story, the topology camera).
 *
 * `once` defaults to true. A reveal that re-hides on the way back up reads as a bug on a page this
 * dense, and it re-fires the transition every time someone overshoots with a trackpad.
 */

type Variant = 'rise' | 'mask' | 'fade' | 'clip' | 'none';

const hidden: Record<Variant, string> = {
  rise: 'opacity-0 translate-y-6',
  mask: 'opacity-0 [clip-path:inset(0_0_100%_0)]',
  fade: 'opacity-0',
  clip: 'opacity-0 [clip-path:inset(0_100%_0_0)]',
  none: '',
};

const shown: Record<Variant, string> = {
  rise: 'opacity-100 translate-y-0',
  mask: 'opacity-100 [clip-path:inset(0_0_0%_0)]',
  fade: 'opacity-100',
  clip: 'opacity-100 [clip-path:inset(0_0%_0_0)]',
  none: '',
};

export function Reveal({
  children,
  as: Tag = 'div',
  variant = 'rise',
  delay = 0,
  duration = 900,
  className = '',
  once = true,
  threshold = 0.18,
  rootMargin = '0px 0px -8% 0px',
  onShown,
}: {
  children: ReactNode;
  as?: ElementType;
  variant?: Variant;
  /** Milliseconds. Used for staggering a grid without one observer per child. */
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
  onShown?: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [isShown, setIsShown] = useState(false);
  const booted = useBooted();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Reduced motion resolves straight to the end state: nothing may be stranded off-screen.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsShown(true);
      onShown?.();
      return;
    }

    // Otherwise hold until the boot curtain lifts, so the hero's reveal is actually witnessed.
    if (!booted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            if (!once) setIsShown(false);
            continue;
          }
          setIsShown(true);
          onShown?.();
          if (once) observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // `onShown` is intentionally not a dependency: callers pass inline closures, and re-subscribing
    // the observer on every render would restart reveals mid-transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, once, threshold, rootMargin]);

  const Rendered = Tag as unknown as ComponentType<RevealTagProps>;

  return (
    <Rendered
      ref={ref}
      data-shown={isShown ? 'true' : 'false'}
      className={`${isShown ? shown[variant] : hidden[variant]} ${className}`}
      style={{
        transitionProperty: 'opacity, transform, clip-path',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: isShown ? undefined : 'opacity, transform',
      }}
    >
      {children}
    </Rendered>
  );
}

/**
 * Staggered group: one observer on the parent, incremental delay per child.
 * Cheaper than N observers and keeps a grid visibly "dealing out" left-to-right, top-to-bottom.
 */
export function RevealGroup({
  children,
  as: Tag = 'div',
  variant = 'rise',
  step = 70,
  duration = 850,
  className = '',
  threshold = 0.12,
}: {
  children: ReactNode[];
  as?: ElementType;
  variant?: Variant;
  step?: number;
  duration?: number;
  className?: string;
  threshold?: number;
}) {
  const Rendered = Tag as unknown as ComponentType<RevealTagProps>;

  return (
    <Rendered className={className}>
      {children.map((child, index) => (
        <Reveal key={index} variant={variant} delay={index * step} duration={duration} threshold={threshold}>
          {child}
        </Reveal>
      ))}
    </Rendered>
  );
}
