'use client';

import dynamic from 'next/dynamic';
import { scrollToHash } from './use-lenis';

/**
 * ARCH's landing hero.
 *
 * Composition is deliberately product-first and wordmark-led: one enormous logotype, one object
 * you can actually turn over, and four lines of copy that say exactly what the product is. No
 * stock footage, no decorative network graphic, no gradient-filled display type.
 *
 * Everything that moves lives in its own island so the shell, the copy and the SEO surface ship
 * as HTML:
 *   - `HeroBlob`  the WebGL object (drag, hover parallax, tap, scroll drift). Lazy, client-only.
 *   - `HeroCta`   the "How it works?" disc, which routes through Lenis like every other anchor.
 */

const HeroBlob = dynamic(() => import('./hero-blob').then((mod) => mod.HeroBlob), {
  ssr: false,
  loading: () => <div className="arch-blob is-loading" aria-hidden="true" />,
});

const FACETS = [
  { label: 'Self-hosted', index: '/01' },
  { label: 'Real-time', index: '/02' },
  { label: 'Audit-ready', index: '/03' },
] as const;

const RESPONDERS = [
  { initials: 'AK', name: 'Anya K.' },
  { initials: 'RS', name: 'Rahul S.' },
  { initials: 'MJ', name: 'Mira J.' },
  { initials: 'DL', name: 'Dan L.' },
] as const;

function HeroCta() {
  return (
    <button
      type="button"
      className="arch-hero-cta group"
      onClick={() => scrollToHash('#lifecycle')}
      data-cursor
    >
      <span className="arch-hero-cta-disc" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M6 4.6v6.8L11.4 8 6 4.6Z" fill="currentColor" />
        </svg>
      </span>
      <span className="arch-hero-cta-label">
        How it works?
        <span className="arch-hero-cta-rule" aria-hidden="true" />
      </span>
    </button>
  );
}

export function Hero() {
  return (
    <section className="arch-hero relative isolate overflow-hidden" aria-labelledby="hero-title">
      <div className="arch-hero-grid" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8 lg:pb-16">
        <div className="arch-hero-card">
          <div className="arch-hero-card-light" aria-hidden="true" />
          <div className="arch-hero-card-grid" aria-hidden="true" />

          <div className="arch-hero-content">
            <header className="arch-hero-topline">
              <span className="arch-hero-chip arch-mono">
                <span className="arch-hero-chip-dot" aria-hidden="true" />
                Incident response for engineering teams
              </span>
              <span className="arch-hero-topline-meta arch-mono">
                Self-hosted <span aria-hidden="true">·</span> On-call <span aria-hidden="true">·</span> Audit-ready
              </span>
            </header>

            <div className="arch-hero-canvas">
              <h1 id="hero-title" className="arch-hero-wordmark">
                ARCH<span className="arch-hero-wordmark-dot">.</span>
              </h1>
              <div className="arch-hero-object">
                <HeroBlob />
              </div>
            </div>

            <div className="arch-hero-base">
              <div className="arch-hero-lede">
                <div className="arch-hero-social">
                  <div className="arch-hero-avatars" aria-hidden="true">
                    {RESPONDERS.map((person) => (
                      <span key={person.initials} className="arch-hero-avatar" title={person.name}>
                        {person.initials}
                      </span>
                    ))}
                    <span className="arch-hero-avatar is-more">+9</span>
                  </div>
                  <p className="arch-hero-social-copy">
                    <strong className="arch-tabular">2M+</strong>
                    <span>Alerts routed to on-call</span>
                  </p>
                </div>

                <p className="arch-hero-copy">
                  The incident workspace that keeps your flow — with AI triage, blast-radius
                  analysis and built-in status pages.
                </p>
                <div className="arch-hero-copy-rule" aria-hidden="true" />
              </div>

              <div className="arch-hero-aside">
                <ul className="arch-hero-facets">
                  {FACETS.map((facet) => (
                    <li key={facet.index} className="arch-hero-facet">
                      <span className="arch-hero-facet-label">{facet.label}</span>
                      <span className="arch-hero-facet-leader" aria-hidden="true" />
                      <span className="arch-hero-facet-index arch-mono">{facet.index}</span>
                    </li>
                  ))}
                </ul>
                <HeroCta />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
