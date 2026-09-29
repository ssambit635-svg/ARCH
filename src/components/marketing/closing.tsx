'use client';

import Link from 'next/link';
import { Container, Heading, SubHeading, cn } from './vui-primitives';

interface TestimonialItem {
  name: string;
  username: string;
  body: string;
  img: string;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    name: 'Elena Vance',
    username: '@elena_sre · Staff SRE',
    body: 'ARCH collapsed 140 firing Prometheus alerts into one fingerprinted SEV-1 incident and pinpointed the unindexed migration on pg-primary in 15 seconds.',
    img: '/avatars/aizen.jpg',
  },
  {
    name: 'Marcus Chen',
    username: '@mchen_infra · VP Infrastructure',
    body: 'Running our incident war room, on-call schedules, and 90-day public status page on a single self-hosted Postgres 16 instance saved us three separate SaaS bills.',
    img: '/avatars/pinky-aizen.jpg',
  },
  {
    name: 'Priya Nair',
    username: '@priya_platform · Principal Engineer',
    body: 'The interactive neural brain blast-radius view makes upstream and downstream service dependencies immediately obvious at 03:00 UTC.',
    img: '/avatars/shinji.jpg',
  },
  {
    name: 'Devon Brooks',
    username: '@dbrooks_sec · Security Lead',
    body: 'Every state transition and role change is chained into an append-only SHA-256 audit ledger. SOC-2 compliance reviews went from weeks to minutes.',
    img: '/avatars/johan.jpg',
  },
  {
    name: 'Sora Takahashi',
    username: '@sora_ops · Reliability Architect',
    body: 'No blue-glow AI bloatware — just fast, deterministic root-cause hypotheses, HMAC-SHA256 webhook intake, and instant postmortem synthesis.',
    img: '/avatars/batmaaanji.jpg',
  },
  {
    name: 'Liam O’Connor',
    username: '@liam_cloud · Core Systems',
    body: 'We deployed ARCH inside our air-gapped VPC in four commands. Having status advisories wired directly to the incident timeline is a game changer.',
    img: '/avatars/andha-aizen.jpg',
  },
];

function TestimonialCard({ item }: { item: TestimonialItem }) {
  return (
    <div className="relative flex h-auto w-full flex-col justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 transition-colors duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/60">
      <p className="text-sm leading-relaxed text-zinc-300 font-normal">&ldquo;{item.body}&rdquo;</p>
      <div className="flex items-center gap-3 pt-2">
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-zinc-700">
          <img src={item.img} alt={item.name} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">{item.name}</span>
          <span className="font-mono text-xs text-zinc-500">{item.username}</span>
        </div>
      </div>
    </div>
  );
}

function TestimonialColumn({
  items,
  duration = 26,
  className,
}: {
  items: TestimonialItem[];
  duration?: number;
  className?: string;
}) {
  const repeated = [...items, ...items];
  return (
    <div className={cn('relative h-full overflow-hidden', className)}>
      <div
        className="testimonial-marquee-track"
        style={{ animationDuration: `${duration}s` }}
      >
        {repeated.map((item, idx) => (
          <div key={`${item.username}-${idx}`} className="pb-6">
            <TestimonialCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   Exact Vengeance UI Floating Isometric CTA Art (from /src/components/landing/ui/cta-box.tsx)
   ============================================================================ */
function CTABox({
  size = 260,
  className,
  bgClassName,
}: {
  size?: number;
  className?: string;
  bgClassName?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 101 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-white', className)}
    >
      <path
        d="M40.0948 53.8501L39.7116 64.9281M36.2635 51.5581L35.8804 62.6361M2.49351 32.076L44.9635 56.5241C47.8955 58.2119 52.6491 58.2119 55.581 56.5241L76.816 44.3L98.051 32.076C100.983 30.3882 100.983 27.6517 98.051 25.964L55.581 1.51584C52.6491 -0.171948 47.8955 -0.171947 44.9635 1.51584L2.49351 25.964C-0.438431 27.6517 -0.43843 30.3882 2.49351 32.076ZM3.23152 30.7417L45.0473 54.8132C47.9793 56.501 52.7329 56.501 55.6648 54.8132L97.1489 30.9327C99.1646 29.7723 99.1646 27.891 97.1489 26.7307L55.0012 2.46814C52.4358 0.991326 48.2764 0.991326 45.7109 2.46814L3.23152 26.9217C1.39905 27.9765 1.39905 29.6868 3.23152 30.7417ZM100.206 40.48C100.206 41.6735 99.3649 42.7539 98.0063 43.536L55.5362 67.9842C52.6042 69.672 47.8506 69.672 44.9186 67.9842L2.44849 43.536C1.09026 42.754 0.25 41.6733 0.25 40.48V29.02C0.25 30.1388 0.988354 31.1585 2.20005 31.926L2.44923 32.076L44.9186 56.5241C47.8506 58.2119 52.6042 58.2119 55.5362 56.5241L98.0063 32.076C99.3649 31.2939 100.206 30.2134 100.206 29.02V40.48Z"
        stroke="currentColor"
        strokeWidth="0.5"
        className={cn('fill-neutral-900', bgClassName)}
      />
    </svg>
  );
}

function CTAArt() {
  return (
    <div className="relative flex items-center justify-center size-full overflow-hidden min-h-[280px]">
      <div
        className="absolute left-1/2 top-1/2 opacity-15"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <CTABox size={320} className="text-white/25" bgClassName="fill-white/5" />
      </div>
      <div
        className="cta-box-float absolute left-1/2 top-[48%] z-20"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <CTABox size={250} className="text-white" bgClassName="fill-neutral-900" />
      </div>
      <div
        className="cta-logo-float absolute left-1/2 top-[40%] z-30 flex items-center justify-center"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <span className="font-orbitron text-xl font-black tracking-tight text-white drop-shadow-[0_6px_16px_rgba(0,0,0,0.9)]">
          ARCH<span className="text-[#FEF62A]">.</span>
        </span>
      </div>
    </div>
  );
}

export function Closing() {
  const firstCol = TESTIMONIALS.slice(0, 3);
  const secondCol = TESTIMONIALS.slice(3, 6);

  return (
    <>
      {/* ====================================================================
          PART 1: Vengeance UI Dual-Column Vertical Marquee Testimonials
         ==================================================================== */}
      <section className="relative border-b border-[#222] bg-[#050608] overflow-hidden">
        <Container>
          <div className="flex flex-col items-center justify-center md:border-x border-[#222]">
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center border-b border-[#222] w-full">
              <Heading as="h2" variant="big">
                What Engineering Teams <br />
                <span className="bg-gradient-to-b from-zinc-500 via-zinc-400 to-white bg-clip-text text-transparent">
                  Are Saying
                </span>
              </Heading>
              <SubHeading variant="big" className="mx-auto text-center">
                Trusted by on-call engineers and reliability teams running mission-critical production infrastructure.
              </SubHeading>
            </div>

            <div className="relative grid h-[540px] w-full grid-cols-1 gap-6 overflow-hidden px-4 md:grid-cols-2 md:px-10 lg:px-16 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
              <TestimonialColumn items={firstCol} duration={24} />
              <TestimonialColumn
                items={secondCol}
                duration={30}
                className="hidden md:block"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ====================================================================
          PART 2: Vengeance UI Floating Isometric CTA Section
         ==================================================================== */}
      <section className="relative border-b border-[#222] bg-[#050608] overflow-hidden">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222] md:border-x border-[#222] md:h-96 overflow-hidden">
            <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
              <Heading as="h2" className="text-left">
                Ready to elevate your incident operations?
              </Heading>
              <SubHeading className="text-left">
                Start triaging alerts with ARCH V1.1, interactive neural topology, and built-in status pages today.
              </SubHeading>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  Get Started →
                </Link>
                <Link
                  href="/status/arch"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#222] bg-[#111216] px-5 font-mono text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  Browse Status Page
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center h-80 md:h-full">
              <CTAArt />
            </div>
          </div>
        </Container>
      </section>

      {/* ====================================================================
          PART 3: Vengeance UI Architectural Footer with Giant "ARCH" Watermark
         ==================================================================== */}
      <footer className="relative border-t border-[#222] bg-[#050608] pt-16 pb-12 overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 xl:px-20 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
            {/* Brand Column — Pure Orbitron Wordmark (Zero Custom Invented Logo) */}
            <div className="md:col-span-5 space-y-5">
              <Link
                href="/"
                className="inline-block font-orbitron text-2xl font-extrabold tracking-tight text-white"
              >
                ARCH<span className="text-[#FEF62A]">.</span>
              </Link>
              <p className="font-mono text-xs text-zinc-400 max-w-sm leading-relaxed">
                Self-hosted incident response, native neural blast-radius intelligence, and 90-day public status pages for high-velocity engineering teams.
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

          {/* Giant Vengeance UI Background Watermark Text */}
          <div className="w-full flex justify-center items-center overflow-hidden select-none pointer-events-none mt-8">
            <span className="font-orbitron text-[22vw] font-black tracking-tighter leading-none bg-gradient-to-b from-neutral-800/80 via-neutral-900/60 to-transparent bg-clip-text text-transparent">
              ARCH.
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
