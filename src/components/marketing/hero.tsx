'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AmbientVideo } from './ambient-video';
import { StatusChip } from './status-chip';

/**
 * Full-frame cinematic hero - optimized for buttery smooth playback.
 *
 * Old ARCH smooth reveal style: single play, frozen final frame, no jank.
 * Performance fixes:
 * - Removed scale transform (was causing repaint of large video layer -> lag)
 * - Use only translateY with GPU compositing
 * - Increased scrub to 1.0 for smoother pin (less aggressive)
 * - will-change + translateZ(0) on media layer
 * - Poster crossfade handled inside AmbientVideo
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
      // Entrance — the copy rises over the film as it starts playing. Old smooth reveal timing.
      gsap.fromTo(
        '.hero-rise',
        { y: 28, opacity: 0, filter: 'blur(6px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.35,
        }
      );

      // Sticky pin + ultra-smooth parallax - NO scale to avoid video lag
      // Old reveal kept mountain static with only subtle y drift
      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=125%',
            scrub: 1.1,
            pin: true,
            anticipatePin: 1,
            pinSpacing: true,
            fastScrollEnd: true,
          },
        })
        // Only translate, no scale - this was the main lag culprit
        .to(mediaRef.current, { yPercent: -6, ease: 'none', force3D: true }, 0)
        .to(contentRef.current, { yPercent: -28, opacity: 0, filter: 'blur(4px)', ease: 'power1.out' }, 0)
        .to('.mk-scroll-cue', { opacity: 0, y: -10, ease: 'none', duration: 0.3 }, 0)
        .to(veilRef.current, { opacity: 0.92, ease: 'none' }, 0.15);
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
      {/* Film layer — one-shot play, frozen final frame acts as the resting visual.
          Old smooth ARCH reveal: mountain video with poster fallback, GPU accelerated */}
      <div
        ref={mediaRef}
        className="absolute inset-0 will-change-transform [transform:translateZ(0)] [backface-visibility:hidden] [perspective:1000px]"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      >
        <AmbientVideo
          src="/arch-mountain-reveal.mp4"
          poster="/arch-mountain-poster.jpg"
          playOnce
          className="mk-hero-video absolute inset-0 h-full w-full object-cover [image-rendering:-webkit-optimize-contrast] [transform:translateZ(0)] will-change-[transform,opacity] [backface-visibility:hidden]"
        />
        {/* Subtle grain / texture overlay for premium old-reveal feel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.015] mix-blend-soft-light"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Legibility gradients + vignette — keeps the enhanced mountain reveal crisp but lighter for smoothness */}
      <div
        aria-hidden
        className="mk-hero-grad pointer-events-none absolute inset-0 bg-gradient-to-t from-[#04070e]/90 via-[#04070e]/20 to-[#04070e]/25"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 mk-hero-vignette opacity-50" />

      {/* Scrub veil — the hero settles before the next section scrolls across it. Smoother opacity */}
      <div
        ref={veilRef}
        aria-hidden
        className="mk-hero-veil pointer-events-none absolute inset-0 bg-[#04070e] opacity-0 will-change-[opacity]"
      />

      {/* Badge + status display. */}
      <div className="absolute left-4 top-20 z-10 flex flex-col items-start gap-2.5 sm:left-8 sm:top-24">
        <span className="hero-rise mk-hero-pill rounded-full border border-[#1e3454]/60 bg-[#050b16]/80 px-3.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#b8d6ff] backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
          ARCH / Incident operations
        </span>
        <StatusChip />
      </div>

      {/* Copy — minimal: one line, one sub-line, two actions. Polished with better spacing */}
      <div ref={contentRef} className="absolute inset-x-0 bottom-0 z-10 px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12 will-change-transform">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="hero-rise max-w-3xl font-orbitron text-3xl font-bold leading-[1.12] py-0.5 tracking-tight text-white sm:text-4xl lg:text-[2.85rem] [text-wrap:balance]">
            Incident response, under control.
          </h1>
          <p className="hero-rise mt-3.5 max-w-xl text-[13.5px] leading-[1.6] text-zinc-300 sm:text-[15px] [text-wrap:pretty]">
            Alerts, responders, impact, and status — one self-hosted workspace.
          </p>
          <div className="hero-rise mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="mk-hero-cta-primary group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b8ef4] px-5 text-sm font-semibold text-[#040811] shadow-[0_8px_24px_-8px_rgba(59,142,244,0.5)] transition-all duration-300 hover:bg-[#64a8ff] hover:shadow-[0_12px_32px_-8px_rgba(59,142,244,0.6)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started{' '}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <a
              href="#intelligence"
              className="mk-hero-cta-secondary inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-[#050b16]/70 px-5 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-[#3b8ef4]/50 hover:bg-[#0a1528]/80 hover:scale-[1.01] active:scale-[0.99]"
            >
              Explore the platform
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue - smoother animation */}
      <a
        href="#intelligence"
        aria-label="Scroll to explore"
        className="hero-rise mk-scroll-cue absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-400 transition-colors hover:text-white sm:flex will-change-transform"
      >
        <span>Scroll</span>
        <span aria-hidden className="mk-scroll-cue-chevron text-[#3b8ef4]">
          ▾
        </span>
      </a>
    </section>
  );
}
