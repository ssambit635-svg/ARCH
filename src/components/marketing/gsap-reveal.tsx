'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface GsapTextRevealProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  threshold?: string;
}

/**
 * High-end cinematic GSAP text reveal.
 * Splits text into words wrapped in padded overflow-hidden containers so descenders
 * (g, y, p, q) and geometric display serifs are never clipped.
 */
export function GsapTextReveal({
  children,
  as: Component = 'div',
  className = '',
  delay = 0,
  stagger = 0.04,
  duration = 0.8,
  threshold = 'top 88%',
}: GsapTextRevealProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const words = containerRef.current.querySelectorAll('.gsap-reveal-word');
    if (!words.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        {
          yPercent: 110,
          opacity: 0,
          rotateX: -20,
          skewY: 3,
        },
        {
          yPercent: 0,
          opacity: 1,
          rotateX: 0,
          skewY: 0,
          duration,
          stagger,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: threshold,
            once: true,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [delay, duration, stagger, threshold]);

  const words = children.split(' ');

  return (
    <Component ref={containerRef as any} className={`gsap-text-reveal-container leading-[1.18] ${className}`}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-top py-[0.14em] -my-[0.14em] px-[0.03em] -mx-[0.03em] mr-[0.26em] last:mr-0"
        >
          <span className="gsap-reveal-word inline-block will-change-transform">
            {word}
          </span>
        </span>
      ))}
    </Component>
  );
}

interface GsapFadeUpProps {
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article' | 'p' | 'span';
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  threshold?: string;
}

export function GsapFadeUp({
  children,
  as: Component = 'div',
  className = '',
  delay = 0,
  duration = 0.7,
  y = 30,
  threshold = 'top 88%',
}: GsapFadeUpProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !ref.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        {
          y,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ref.current,
            start: threshold,
            once: true,
          },
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [delay, duration, threshold, y]);

  return (
    <Component ref={ref as any} className={className}>
      {children}
    </Component>
  );
}
