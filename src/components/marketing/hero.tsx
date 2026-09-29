import Link from 'next/link';
import { IncidentPreview } from './incident-preview';

/**
 * ARCH's landing hero: clear product copy, one useful demo, and no stock footage or decorative
 * network graphic. The sample incident preview below is deliberately interactive on touch and
 * pointer devices; the motion is only a small perspective response, never required to understand it.
 */
export function Hero() {
  return (
    <section className="arch-landing-hero relative isolate overflow-hidden" aria-labelledby="hero-title">
      <div className="arch-hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="arch-hero-toplight pointer-events-none absolute inset-x-0 top-0" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[calc(100svh-72px)] max-w-[1440px] flex-col px-5 pb-10 pt-24 sm:px-8 sm:pt-28 lg:pb-12">
        <div className="mx-auto w-full max-w-[900px] text-center">
          <p className="arch-hero-eyebrow mx-auto inline-flex items-center gap-2.5 rounded-full border border-white/[0.09] bg-white/[0.025] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ash-300 sm:text-[11px]">
            <span className="arch-hero-status-dot" aria-hidden="true" />
            Incident response for engineering teams
          </p>

          <h1
            id="hero-title"
            className="arch-landing-heading mx-auto mt-7 max-w-[22ch] text-bone"
          >
            Every incident.
            <br className="hidden sm:block" /> One clear{' '}
            <span className="arch-hero-heading-accent">response.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-[650px] text-pretty text-[14px] leading-[1.75] text-ash-300 sm:mt-6 sm:text-[16px]">
            ARCH brings alerts, responders, status updates and the audit trail into one self-hosted
            workspace — so your team can focus on resolving the issue, not coordinating around it.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:mt-8">
            <Link
              href="/register"
              className="arch-hero-primary group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-lg px-5 py-3 text-[14px] font-semibold transition-[background,transform,border-color] duration-200 active:scale-[0.985]"
              data-cursor
            >
              Start with ARCH
              <svg viewBox="0 0 16 16" fill="none" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
                <path d="M3.25 8h9.5m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a
              href="#platform"
              className="arch-hero-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 text-[14px] font-medium transition-colors duration-200"
            >
              Explore the platform
              <span className="arch-hero-secondary-arrow" aria-hidden="true">↓</span>
            </a>
          </div>

          <p className="arch-mono mt-4 text-[9px] uppercase tracking-[0.15em] text-ash-600 sm:text-[10px]">
            Self-hosted <span className="mx-2 text-ash-700">·</span> On-call coordination <span className="mx-2 text-ash-700">·</span> Audit-ready
          </p>
        </div>

        <div className="arch-hero-stage mx-auto mt-8 w-full max-w-[1140px] sm:mt-10 lg:mt-11">
          <IncidentPreview />
        </div>

        <div className="arch-hero-footnote mx-auto mt-5 flex max-w-[1140px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
          <span className="arch-mono inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-ash-600 sm:text-[10px]">
            <span className="arch-hero-footnote-rule" aria-hidden="true" />
            A clearer view, from first alert to resolution
          </span>
          <a href="#lifecycle" className="arch-hero-scroll-link arch-mono inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.13em] text-ash-500 transition-colors hover:text-bone sm:text-[10px]">
            See how ARCH works <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
