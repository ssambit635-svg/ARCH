'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container, Heading, SubHeading } from './vui-primitives';
import { GsapTextReveal, GsapFadeUp } from './gsap-reveal';

/**
 * Official ARCH Logo Video Showcase by Flow AI.
 * Replaces the static isometric square with the authentic dragon animation video.
 */
function DragonLogoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { scale: 0.92, opacity: 0, y: 24 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center size-full p-4 md:p-8 select-none overflow-hidden"
    >
      {/* Ambient background glow matching the dragon's electric blue and yellow accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-44 w-44 rounded-full bg-blue-600/20 blur-[70px] animate-pulse" />
        <div className="absolute h-32 w-32 rounded-full bg-[#FEF62A]/10 blur-[50px]" />
      </div>

      {/* Video Container Card */}
      <div className="relative z-10 w-full max-w-[460px] rounded-2xl border border-white/10 bg-[#08090d]/95 p-2.5 sm:p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_30px_70px_-15px_rgba(59,130,246,0.3)]">
        {/* Header bar with Flow AI badge & indicator */}
        <div className="mb-2 flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#FEF62A] shadow-[0_0_8px_#FEF62A]" />
            <span className="font-mono text-[10px] tracking-wider text-zinc-300 uppercase font-medium">
              Official Identity · Flow AI
            </span>
          </div>
          <span className="rounded border border-blue-500/40 bg-blue-950/60 px-2 py-0.5 font-mono text-[9px] font-semibold text-blue-400">
            DRAGON LOGO
          </span>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/[0.06]">
          <video
            ref={videoRef}
            src="/arch-logo-animation.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Footer meta info */}
        <div className="mt-2.5 flex items-center justify-between px-2 pb-0.5 font-mono text-[10px] text-zinc-400">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="inline-block size-1.5 rounded-full bg-blue-400" />
            ARCH Brand Motion
          </span>
          <span className="text-zinc-500">Self-Hosted Incident Platform</span>
        </div>
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
          CTA Section: Clean Minimalist Layout with Official Flow AI Logo Video
         ==================================================================== */}
      <section ref={ctaRef} className="relative border-b border-[#222] bg-[#050608] overflow-hidden">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222] md:border-x border-[#222] md:min-h-[420px] overflow-hidden">
            {/* Left Column: Heading, Subheading & CTAs */}
            <div className="flex flex-col justify-center gap-5 p-8 md:p-12 lg:p-14">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/40 px-3 py-1 font-mono text-[11px] font-medium text-blue-300">
                <span className="size-1.5 rounded-full bg-[#FEF62A]" />
                <span>ARCH V1.1 INCIDENT INTELLIGENCE</span>
              </div>

              <GsapTextReveal as="h2" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Ready to elevate your incident operations?
              </GsapTextReveal>

              <p className="font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
                Deploy in four commands. Deduplicate alert storms, trace neural service topologies, and maintain 90-day public status pages without SaaS lock-in.
              </p>

              <div className="cta-btn-group mt-2 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-5 text-xs font-semibold text-black transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started →
                </Link>
                <Link
                  href="/status/arch"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#222] bg-[#111216] px-5 font-mono text-xs font-medium text-zinc-200 transition-all hover:border-zinc-700 hover:text-white"
                >
                  Browse Status Page
                </Link>
              </div>
            </div>

            {/* Right Column: Flow AI Official Logo Video */}
            <div className="flex items-center justify-center min-h-[340px] md:h-full bg-[#08090d]/60">
              <DragonLogoVideo />
            </div>
          </div>
        </Container>
      </section>

      {/* ====================================================================
          Architectural Minimalist Footer with Dragon Emblem
         ==================================================================== */}
      <footer className="relative border-t border-[#222] bg-[#050608] pt-16 pb-12 overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 xl:px-20 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
            {/* Brand Column — Dragon Logo + Orbitron Wordmark */}
            <div className="md:col-span-5 space-y-5">
              <Link
                href="/"
                className="inline-flex items-center gap-3 font-orbitron text-2xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity"
              >
                <img
                  src="/dragon-mark.png"
                  alt="ARCH Dragon Logo"
                  className="h-8 w-auto object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                />
                <span>
                  ARCH<span className="text-[#FEF62A]">.</span>
                </span>
              </Link>
              <p className="font-mono text-xs text-zinc-400 max-w-sm leading-relaxed">
                Self-hosted incident response, native neural blast-radius intelligence, and public status pages for high-velocity engineering teams.
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
                      Neural Brain
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

          {/* Watermark Text */}
          <div className="w-full flex justify-center items-center overflow-hidden select-none pointer-events-none mt-8">
            <span className="font-orbitron text-[20vw] font-black tracking-tighter leading-none bg-gradient-to-b from-neutral-800/60 via-neutral-900/40 to-transparent bg-clip-text text-transparent">
              ARCH.
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
