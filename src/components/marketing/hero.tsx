'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AmbientVideo } from './ambient-video';
import { StatusChip } from './status-chip';

/**
 * Full-frame cinematic hero.
 *
 * The mountain reveal film IS the hero: it fills the viewport, autoplays exactly once and
 * freezes on its final frame until refresh. While the film holds the frame, GSAP pins the
 * whole section so the peak stays stuck to the viewport and the scroll drives a parallax
 * scrub — the footage drifts and darkens while the copy lifts away, and the next section
 * glides over the settled frame.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Entrance — the copy rises over the film as it starts playing.
      gsap.fromTo(
        '.hero-rise',
        { y: 34, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: 'power3.out', delay: 0.3 }
      );

      // Sticky pin + subtle parallax: the mountain stays stuck while the page keeps scrolling.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=110%',
            scrub: 0.55,
            pin: true,
            anticipatePin: 1,
          },
        })
        .to(mediaRef.current, { scale: 1.06, yPercent: -3, ease: 'none' }, 0)
        .to(contentRef.current, { yPercent: -36, opacity: 0, ease: 'power1.in' }, 0)
        .to('.mk-scroll-cue', { opacity: 0, ease: 'none', duration: 0.25 }, 0)
        .to(veilRef.current, { opacity: 1, ease: 'none' }, 0);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="mk-hero relative h-screen overflow-hidden bg-[#04070e]"
      style={{ height: '100svh' }}
    >
      {/* Film layer — one-shot play, frozen final frame acts as the resting visual. */}
      <div ref={mediaRef} className="absolute inset-0 will-change-transform [transform:translateZ(0)]">
        <AmbientVideo
          src="/arch-mountain-reveal.mp4"
          poster="/arch-mountain-poster.jpg"
          playOnce
          className="mk-hero-video absolute inset-0 h-full w-full [image-rendering:-webkit-optimize-contrast]"
        />
      </div>

      {/* Legibility gradients + vignette — keeps the enhanced mountain reveal crisp. */}
      <div aria-hidden className="mk-hero-grad pointer-events-none absolute inset-0 bg-gradient-to-t from-[#04070e]/85 via-[#04070e]/10 to-[#04070e]/18" />
      <div aria-hidden className="pointer-events-none absolute inset-0 mk-hero-vignette opacity-55" />

      {/* Scrub veil — the hero settles before the next section scrolls across it. */}
      <div ref={veilRef} aria-hidden className="mk-hero-veil pointer-events-none absolute inset-0 bg-[#04070e] opacity-0" />

      {/* Badge + status display. */}
      <div className="absolute left-4 top-20 z-10 flex flex-col items-start gap-2 sm:left-8 sm:top-24">
        <span className="hero-rise mk-hero-pill rounded-full border border-[#1e3454]/70 bg-[#050b16]/75 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#b8d6ff] backdrop-blur-sm">
          ARCH / Incident operations
        </span>
        <StatusChip />
      </div>

      {/* Copy — minimal: one line, one sub-line, two actions. */}
      <div ref={contentRef} className="absolute inset-x-0 bottom-0 z-10 px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="hero-rise max-w-3xl font-orbitron text-3xl font-bold leading-[1.15] py-0.5 tracking-tight text-white sm:text-4xl lg:text-5xl">
            Incident response, under control.
          </h1>
          <p className="hero-rise mt-3 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Alerts, responders, impact, and status — one self-hosted workspace.
          </p>
          <div className="hero-rise mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="mk-hero-cta-primary inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3b8ef4] px-5 text-sm font-semibold text-[#040811] transition-colors hover:bg-[#64a8ff]"
            >
              Get Started <span aria-hidden>→</span>
            </Link>
            <a
              href="#intelligence"
              className="mk-hero-cta-secondary inline-flex h-11 items-center justify-center rounded-lg border border-white/25 bg-[#050b16]/60 px-5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:border-[#3b8ef4] hover:bg-[#0a1528]/80"
            >
              Explore the platform
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue. */}
      <a
        href="#intelligence"
        aria-label="Scroll to explore"
        className="hero-rise mk-scroll-cue absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-400 transition-colors hover:text-white sm:flex"
      >
        <span>Scroll</span>
        <span aria-hidden className="mk-scroll-cue-chevron text-[#3b8ef4]">▾</span>
      </a>
    </section>
  );
}
