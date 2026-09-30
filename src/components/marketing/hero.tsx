import Link from 'next/link';
import { BorderBeam, Container, Heading, IsometricHeroBox } from './vui-primitives';
import { TechStackTiles } from './tech-stack';
import { GsapTextReveal } from './gsap-reveal';
import { AmbientVideo } from './ambient-video';

/** The film is the hero wordmark: don't overlay a second ARCH logo on its reveal. */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#222] bg-[#050608]">
      <Container>
        <div className="border-x border-b border-[#222] bg-[#06101e]">
          <div className="relative aspect-[848/478] w-full overflow-hidden bg-[#06101e]" style={{ backgroundImage: 'url(/arch-mountain-poster.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <AmbientVideo
              src="/arch-mountain-reveal.mp4"
              poster="/arch-mountain-poster.jpg"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050a13]/50 via-transparent to-transparent" />
            <span className="absolute left-4 top-4 sm:left-8 sm:top-8 rounded-full border border-white/20 bg-[#050a13]/65 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-blue-100 backdrop-blur-sm">
              ARCH / Incident operations
            </span>
          </div>
          <div className="grid gap-7 border-t border-white/10 bg-[#080c14] px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12">
            <div className="max-w-2xl">
              <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#75b3ff]">Built for the moments that matter</p>
              <h1 className="font-orbitron text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                Incident response, under control.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Bring alerts, responders, impact, and updates into one self-hosted workspace.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3b8ef4] px-5 text-sm font-semibold text-[#04101e] transition-colors hover:bg-[#75b3ff]">
                Get Started <span aria-hidden>→</span>
              </Link>
              <a href="#workspace" className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-medium text-white transition-colors hover:border-[#75b3ff] hover:bg-white/5">
                Explore the platform
              </a>
            </div>
          </div>
        </div>

        {/* Product details follow the cinematic introduction. */}
        <div>
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
                  colorFrom="#3b8ef4"
                  colorTo="#71717a"
                />
                <span className="text-zinc-400">Backed by</span>
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  <span className="text-[9px] leading-none text-[#3b8ef4]">▲</span>
                  <span>ARCH Native Engine</span>
                </span>
              </a>

              <GsapTextReveal as="h2" className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight text-left">
                Clarity from alert to resolution
              </GsapTextReveal>

              <p className="font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed text-left max-w-xl">
                Dedupe alerts, trace impact, and resolve incidents — all self-hosted.
              </p>

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
                  <span className="size-1.5 rounded-full bg-[#3b8ef4]" />
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

          {/* Vengeance UI TechStack Row — tiles come from tech-stack-data.ts (every entry has proof in the repo) */}
          <div className="vui-reveal-block flex flex-col lg:flex-row items-center justify-between md:border-x border-[#222]">
            <div className="w-full lg:w-1/3 p-6 md:p-8 lg:p-10 text-center lg:text-left">
              <Heading as="h2" className="text-center lg:text-left">
                Tech Stack
              </Heading>
              <p className="mt-2 font-mono text-xs text-[#8e929f]">
                Next.js, TypeScript, and PostgreSQL. No external SaaS.
              </p>
            </div>
            <TechStackTiles />
          </div>
        </div>
      </Container>
    </section>
  );
}
