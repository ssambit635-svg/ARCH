'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BorderBeam,
  Container,
  Heading,
  IsometricHeroBox,
  IsometricStack,
  MotionIcon,
  NextIcon,
  SubHeading,
  TailwindIcon,
  TypeScriptIcon,
} from './vui-primitives';

const HeroBlob = dynamic(
  () => import('./hero-blob').then((m) => m.HeroBlob),
  { ssr: false }
);

const FACETS = [
  { index: '/01', label: 'Self-hosted' },
  { index: '/02', label: 'Collaborative' },
  { index: '/03', label: 'Real-time' },
];

const INTEGRATIONS = [
  {
    name: 'Mintlify',
    category: 'Runbook Docs',
    logo: '/sponsors/mintlify-dark.svg',
    logoClass: 'h-6 w-auto max-w-[140px]',
  },
  {
    name: 'Sentry',
    category: 'Error Stream',
    logo: '/sponsors/sentry.svg',
    logoClass: 'h-6 w-auto max-w-[132px]',
  },
  {
    name: 'BrowserStack',
    category: 'Synthetic Checks',
    logo: '/sponsors/browserstack-mark.svg',
    logoClass: 'h-7 w-7',
    showWordmark: true,
  },
  {
    name: 'Sarvam AI',
    category: 'Neural Inference',
    logo: '/sponsors/sarvam-dark.svg',
    logoClass: 'h-6 w-auto max-w-[132px]',
  },
  {
    name: 'Vercel OSS',
    category: 'Edge & Deploy',
    logo: '/sponsors/vercel-dark.svg',
    logoClass: 'h-5 w-auto max-w-[122px]',
  },
];

export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const orbWrapRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Initial entrance timeline for the SAPFORCE-matched Hero Stage
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.hero-stage-topbar',
        { y: -18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 }
      )
        .fromTo(
          '.hero-wordmark-char',
          { yPercent: 35, opacity: 0, rotateX: -28 },
          {
            yPercent: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.85,
            stagger: 0.06,
          },
          '-=0.45'
        )
        .fromTo(
          orbWrapRef.current,
          { scale: 0.84, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.05, ease: 'expo.out' },
          '-=0.65'
        )
        .fromTo(
          '.hero-corner-item',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 },
          '-=0.65'
        );

      // Scroll-driven subtle parallax on the 3D sphere and giant wordmark
      if (stageRef.current && orbWrapRef.current && wordmarkRef.current) {
        gsap.to(orbWrapRef.current, {
          yPercent: 10,
          scale: 1.04,
          ease: 'none',
          scrollTrigger: {
            trigger: stageRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        });

        gsap.to(wordmarkRef.current, {
          yPercent: -8,
          ease: 'none',
          scrollTrigger: {
            trigger: stageRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      }

      // Vengeance UI Split Showcase + TechStack reveal
      if (splitRef.current) {
        gsap.fromTo(
          splitRef.current.querySelectorAll('.vui-reveal-block'),
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.75,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: splitRef.current,
              start: 'top 84%',
            },
          }
        );
      }
    }, stageRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative border-b border-[#222] bg-[#050608] overflow-hidden">
      <Container>
        {/* ====================================================================
            PART 1: Reference Hero Stage (Exact match to WhatsApp Image 10.20.54.jpeg)
            Framed inside Vengeance UI's structural border-x container
           ==================================================================== */}
        <div
          ref={stageRef}
          className="relative md:border-x border-b border-[#222] bg-[#08090d] px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 overflow-hidden"
        >
          {/* Subtle top studio spotlight (no blue glow) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(56% 48% at 50% 44%, rgba(254, 246, 42, 0.06) 0%, rgba(255, 255, 255, 0.03) 42%, transparent 75%)',
            }}
          />

          {/* Top Pill Bar inside the Hero Frame (exact match to SAPFORCE reference top bar) */}
          <div className="hero-stage-topbar relative z-20 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex flex-wrap items-center gap-1 sm:gap-2 rounded-xl border border-white/[0.08] bg-[#14161c]/90 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <a
                href="#workspace"
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Services
              </a>
              <a
                href="#lifecycle"
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Workflow
              </a>
              <a
                href="#topology"
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Neural
              </a>
              <a
                href="#library-map"
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Insights
              </a>
              <a
                href="#deploy"
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Deploy
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-[#1a1d24] px-4 py-2 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-[#FEF62A]/60 hover:bg-[#FEF62A] hover:text-black"
              >
                <span>Get Started</span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Giant Geometric Wordmark ("ARCH." matching "SAPFORCE." in the reference) */}
          <div className="relative z-10 mt-6 sm:mt-8 select-none">
            <h1
              ref={wordmarkRef}
              aria-label="ARCH."
              className="font-orbitron font-black tracking-[-0.055em] text-white uppercase leading-[0.86] text-center"
              style={{
                fontSize: 'clamp(4.2rem, 16.2vw, 14.5rem)',
              }}
            >
              {'ARCH.'.split('').map((ch, idx) => (
                <span
                  key={idx}
                  className={`hero-wordmark-char inline-block ${
                    ch === '.' ? 'text-[#FEF62A]' : 'text-white'
                  }`}
                >
                  {ch}
                </span>
              ))}
            </h1>
          </div>

          {/* 3D Chrome-Cage & Acid-Lime Sphere Stage + 4-Corner Architectural Layout (Exact match to reference) */}
          <div className="relative z-20 -mt-10 sm:-mt-16 lg:-mt-24 grid grid-cols-1 lg:grid-cols-12 items-end gap-8 pt-4 pb-2">
            {/* Bottom-Left Column: 2M+ Avatars + Tagline + Dotted Line */}
            <div className="hero-corner-item lg:col-span-4 flex flex-col justify-between gap-8 order-2 lg:order-1">
              {/* 2M+ Avatar Cluster */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3.5">
                  <div className="flex -space-x-2.5">
                    <img
                      src="/avatars/aizen.jpg"
                      alt="On-call engineer"
                      className="size-9 rounded-full border-2 border-[#08090d] object-cover"
                    />
                    <img
                      src="/avatars/pinky-aizen.jpg"
                      alt="SRE commander"
                      className="size-9 rounded-full border-2 border-[#08090d] object-cover"
                    />
                    <img
                      src="/avatars/shinji.jpg"
                      alt="Platform lead"
                      className="size-9 rounded-full border-2 border-[#08090d] object-cover"
                    />
                  </div>
                  <span className="font-orbitron text-2xl sm:text-3xl font-extrabold tracking-tight text-white tnum">
                    2M+
                  </span>
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  World active alerts routed
                </span>
              </div>

              {/* Copy + Dotted Horizontal Rule */}
              <div className="max-w-[290px]">
                <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-200 font-normal">
                  The incident software that keeps your flow with AI tools and built-in status pages
                </p>
                <div
                  aria-hidden
                  className="mt-5 h-[3px] w-full opacity-55"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, rgba(255,255,255,0.65) 1.25px, transparent 1.5px)',
                    backgroundSize: '10px 4px',
                    backgroundRepeat: 'repeat-x',
                  }}
                />
              </div>
            </div>

            {/* Center Column: 3D Chrome-Cage & Acid-Lime Sphere with Orbital Rings */}
            <div className="lg:col-span-4 flex items-center justify-center order-1 lg:order-2">
              <div
                ref={orbWrapRef}
                className="relative w-[300px] h-[300px] sm:w-[390px] sm:h-[390px] lg:w-[440px] lg:h-[440px] flex items-center justify-center"
              >
                <HeroBlob />
              </div>
            </div>

            {/* Bottom-Right Column: /01 /02 /03 Facets + Acid-Lime Circular "▶ How it works?" Button */}
            <div className="hero-corner-item lg:col-span-4 flex flex-col items-start lg:items-end justify-between gap-8 order-3">
              {/* /01 /02 /03 Facet Stack */}
              <ul className="w-full max-w-[220px] space-y-3 lg:text-right">
                {FACETS.map((f) => (
                  <li
                    key={f.index}
                    className="flex items-baseline justify-between lg:justify-end gap-5 border-b border-white/[0.07] pb-2 text-xs"
                  >
                    <span className="font-medium text-zinc-200">{f.label}</span>
                    <span className="font-mono text-[11px] text-zinc-500 tnum">{f.index}</span>
                  </li>
                ))}
              </ul>

              {/* Acid-Lime (#FEF62A) Circular Disc CTA Button (Exact match to bottom-right of reference) */}
              <div className="flex items-center gap-4">
                <a
                  href="#workspace"
                  className="group relative flex size-28 sm:size-32 flex-col items-center justify-center rounded-full bg-[#FEF62A] text-[#050608] shadow-[0_20px_50px_rgba(254,246,42,0.22),inset_0_1px_0_rgba(255,255,255,0.65)] transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold tracking-tight text-black">
                    <span className="inline-block text-[10px] transition-transform duration-300 group-hover:translate-x-0.5">
                      ▶
                    </span>
                    <span>How it works?</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            PART 2: Vengeance UI Split Hero Showcase + IsometricHeroBox + TechStack
           ==================================================================== */}
        <div ref={splitRef}>
          <div className="flex flex-col md:flex-row md:divide-x divide-[#222] md:border-x border-b border-[#222]">
            {/* Left Column: Vengeance UI Badge + Orbitron Heading + Mono SubHeading + Dual CTAs */}
            <div className="vui-reveal-block flex-1 flex flex-col justify-center gap-5 px-5 py-12 md:px-8 lg:px-12">
              <a
                href="#topology"
                className="group relative inline-flex w-fit items-center gap-1.5 overflow-hidden rounded-full border border-zinc-600/90 bg-zinc-900/85 px-3 py-1 text-[11px] font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-colors hover:border-zinc-500 hover:bg-zinc-900"
              >
                <BorderBeam
                  size={68}
                  duration={4.2}
                  borderWidth={1.5}
                  colorFrom="#FEF62A"
                  colorTo="#71717a"
                />
                <span className="text-zinc-400">Backed by</span>
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  <span className="text-[9px] leading-none text-[#FEF62A]">▲</span>
                  <span>ARCH V1.1 Native Engine</span>
                </span>
              </a>

              <Heading as="h2" variant="big" className="text-left">
                Next-Gen Incident <br />
                <span className="bg-gradient-to-b from-zinc-500 via-zinc-400 to-white bg-clip-text text-transparent">
                  Operations
                </span>
              </Heading>

              <SubHeading as="p" variant="big" className="text-left">
                Production-ready alert deduplication, neural blast-radius topology, live responder war rooms, and 90-day public status pages in one self-hosted stack.
              </SubHeading>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-5 text-xs font-semibold text-[#050608] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_26px_-18px_rgba(0,0,0,0.75)] transition-all hover:bg-zinc-200"
                >
                  Open Live Console
                </Link>
                <a
                  href="#topology"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#222] bg-[#111216] px-5 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-zinc-700 hover:text-white"
                >
                  <span className="size-1.5 rounded-full bg-[#FEF62A]" />
                  <span>Explore Neural Brain</span>
                </a>
                <Link
                  href="/status/arch"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#222] bg-transparent px-4 font-mono text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  <span className="size-1.5 rounded-full bg-ok-400 animate-pulse-dot" />
                  <span>/status/arch</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Vengeance UI IsometricHeroBox & IsometricGrid */}
            <div className="vui-reveal-block flex-1 flex items-center justify-center overflow-hidden">
              <IsometricHeroBox />
            </div>
          </div>

          {/* Vengeance UI TechStack Row */}
          <div className="vui-reveal-block flex flex-col lg:flex-row items-center justify-between md:border-x border-b border-[#222]">
            <div className="w-full lg:w-1/3 p-6 md:p-8 lg:p-10 text-center lg:text-left">
              <Heading as="h2" className="text-center lg:text-left">
                Tech Stack
              </Heading>
              <p className="mt-2 font-mono text-xs text-[#8e929f]">
                Zero external SaaS dependencies. Runs on Next.js 16, PostgreSQL 16, TypeScript 5, and GSAP.
              </p>
            </div>
            <div className="w-full lg:w-2/3 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-[#222] border-t lg:border-t-0 lg:border-l border-[#222]">
              <div className="flex flex-col items-center justify-center gap-2 p-6">
                <IsometricStack>
                  <NextIcon className="size-8" />
                </IsometricStack>
                <span className="font-mono text-xs text-zinc-400">Next.js 16</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 p-6">
                <IsometricStack>
                  <TailwindIcon className="size-8 text-[#00BCFF]" />
                </IsometricStack>
                <span className="font-mono text-xs text-zinc-400">Tailwind CSS</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 p-6">
                <IsometricStack>
                  <TypeScriptIcon className="size-8" />
                </IsometricStack>
                <span className="font-mono text-xs text-zinc-400">TypeScript 5</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 p-6">
                <IsometricStack>
                  <MotionIcon className="size-8" />
                </IsometricStack>
                <span className="font-mono text-xs text-zinc-400">GSAP + Motion</span>
              </div>
            </div>
          </div>

          {/* Vengeance UI Sponsors / Telemetry Ecosystem Strip */}
          <div className="vui-reveal-block md:border-x border-[#222] bg-[#06070a]">
            <div className="flex flex-col gap-1 border-b border-[#222] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Native Webhook &amp; Telemetry Ingestion
              </p>
              <p className="font-mono text-xs text-zinc-500">
                HMAC-SHA256 verified alert pipelines · Zero vendor lock-in
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px bg-[#222] sm:grid-cols-2 lg:grid-cols-5">
              {INTEGRATIONS.map((item) => (
                <div
                  key={item.name}
                  className="group relative flex min-h-20 items-center justify-center bg-[#06070a] px-4 py-4 transition-colors duration-200 hover:bg-zinc-900/60"
                >
                  {item.showWordmark ? (
                    <span className="inline-flex items-center gap-2.5 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
                      <img src={item.logo} alt={item.name} className={item.logoClass} />
                      <span className="text-sm font-semibold tracking-tight text-zinc-100">
                        {item.name}
                      </span>
                    </span>
                  ) : (
                    <img
                      src={item.logo}
                      alt={item.name}
                      className={`${item.logoClass} opacity-85 transition-opacity duration-200 group-hover:opacity-100`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
