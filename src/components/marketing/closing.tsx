'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from './vui-primitives';
import { GsapTextReveal } from './gsap-reveal';
import { AmbientVideo } from './ambient-video';

/** A single-play, borderless showcase for the ARCH mark - old smooth reveal restored */
function DragonLogoVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        videoWrapRef.current,
        { y: 18, opacity: 0, scale: 0.97, filter: 'blur(8px)' },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 88%',
            once: true,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex size-full items-center justify-center p-6 sm:p-8 [perspective:1000px]"
    >
      <div
        ref={videoWrapRef}
        className="relative w-full max-w-[560px] overflow-visible will-change-transform [transform:translateZ(0)]"
        style={{ aspectRatio: '848 / 478', transform: 'translateZ(0)' }}
      >
        <AmbientVideo
          src="/arch-dragon-reveal.mp4"
          poster="/arch-dragon-poster.jpg"
          defer
          playOnce
          className="h-full w-full object-contain object-center [image-rendering:-webkit-optimize-contrast] [transform:translateZ(0)] will-change-[transform,opacity] [backface-visibility:hidden]"
        />
      </div>
    </div>
  );
}

export function Closing() {
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !ctaRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cta-btn-group',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
          },
        }
      );
    }, ctaRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* ====================================================================
          CTA section with a clean, minimal layout
         ==================================================================== */}
      <section ref={ctaRef} className="relative border-b border-[#182438] bg-[#04070e] overflow-hidden">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 md:min-h-[360px] md:border-x border-[#182438] overflow-hidden">
            {/* Left Column: Heading, Subheading & CTAs */}
            <div className="flex flex-col justify-center gap-5 p-8 md:p-12 lg:p-14">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#182438] bg-[#070d19] px-3 py-1 font-mono text-[11px] font-medium text-[#3b8ef4]">
                <span>INCIDENT RESPONSE</span>
              </div>

              <GsapTextReveal
                as="h2"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight"
              >
                Ready for calmer incident response?
              </GsapTextReveal>

              <p className="font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
                Self-hosted incident response, clear root-cause insights, and public status pages.
              </p>

              <div className="cta-btn-group mt-2 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#3b8ef4] px-5 text-xs font-semibold text-[#04070e] transition-all hover:bg-[#64a8ff] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started →
                </Link>
                <Link
                  href="/status/arch"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#182438] bg-[#070d19] px-5 font-mono text-xs font-medium text-zinc-200 transition-all hover:border-[#3b8ef4]/60 hover:text-white"
                >
                  View Status
                </Link>
              </div>
            </div>

            {/* One-shot logo animation */}
            <div className="mk-dragon-stage flex items-center justify-center min-h-[340px] md:h-full bg-[#060a14] border-t md:border-t-0 md:border-l border-[#182438]">
              <DragonLogoVideo />
            </div>
          </div>
        </Container>
      </section>

      {/* ====================================================================
          Footer
         ==================================================================== */}
      <footer className="relative border-t border-[#182438] bg-[#04070e] pt-16 pb-12 overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 xl:px-20 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
            {/* Brand Column — Dragon Logo + Orbitron Wordmark */}
            <div className="md:col-span-5 space-y-5">
              <Link
                href="/"
                className="inline-flex items-center gap-3 font-orbitron text-2xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity"
              >
                <img
                  src="/dragon-mark.webp"
                  alt="ARCH Dragon Logo"
                  className="h-8 w-auto object-contain"
                />
                <span>
                  ARCH<span className="text-[#3b8ef4]">.</span>
                </span>
              </Link>
              <p className="font-mono text-xs text-zinc-400 max-w-sm leading-relaxed">
                Self-hosted incident response for engineering teams.
              </p>
              <div className="font-mono text-xs text-zinc-500 pt-1">
                © 2026 ARCH Incident Platform · MIT / Self-Hosted
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <h3 className="font-orbitron text-xs font-bold uppercase tracking-wider text-white mb-4">
                  Platform
                </h3>
                <ul className="space-y-2.5 font-mono text-xs text-zinc-400">
                  <li>
                    <a href="#workspace" className="hover:text-white transition-colors">
                      Incident Console
                    </a>
                  </li>
                  <li>
                    <a href="#library-map" className="hover:text-white transition-colors">
                      Architecture Map
                    </a>
                  </li>
                  <li>
                    <a href="#topology" className="hover:text-white transition-colors">
                      Meet the Robot
                    </a>
                  </li>
                  <li>
                    <a href="#lifecycle" className="hover:text-white transition-colors">
                      4-Stage Lifecycle
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-orbitron text-xs font-bold uppercase tracking-wider text-white mb-4">
                  Operations
                </h3>
                <ul className="space-y-2.5 font-mono text-xs text-zinc-400">
                  <li>
                    <Link href="/status/arch" className="hover:text-white transition-colors">
                      Status Page (/status/arch)
                    </Link>
                  </li>
                  <li>
                    <a href="#capabilities" className="hover:text-white transition-colors">
                      5-State Machine
                    </a>
                  </li>
                  <li>
                    <a href="#deploy" className="hover:text-white transition-colors">
                      Docker &amp; Python SDK
                    </a>
                  </li>
                  <li>
                    <Link href="/dashboard" className="hover:text-white transition-colors">
                      Live Dashboard
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-orbitron text-xs font-bold uppercase tracking-wider text-white mb-4">
                  Access
                </h3>
                <ul className="space-y-2.5 font-mono text-xs text-zinc-400">
                  <li>
                    <Link href="/login" className="hover:text-white transition-colors">
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-white transition-colors">
                      Create Workspace
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://github.com/ssambit635-svg/ARCH"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      GitHub Repository
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Watermark Text — sized and padded so letters never cut off */}
          <div className="w-full flex justify-center items-center overflow-visible select-none pointer-events-none mt-4 py-2">
            <span className="mk-watermark font-orbitron text-[clamp(3.25rem,13vw,11.5rem)] font-black tracking-tight leading-[1.15] px-4 bg-gradient-to-b from-[#162238]/80 via-[#0d1626]/50 to-transparent bg-clip-text text-transparent">
              ARCH.
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
