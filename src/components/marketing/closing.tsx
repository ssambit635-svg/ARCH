import { LinkArrow } from './link-arrow';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { AmbientVideo } from './ambient-video';

export function Closing() {
  return (
    <>
      <section className="mk-section mk-closing" aria-labelledby="closing-title">
        <div className="mk-container mk-closing-grid">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>Less overhead. More headspace.</p>
            <h2 id="closing-title" className="mk-title" data-mk-heading aria-label="Give your team a little more clarity.">Give your team<br /> a little more clarity.</h2>
            <p className="mk-description" data-mk-reveal>A focused workspace for the moments that matter.</p>
            <div className="mk-actions" data-mk-reveal>
              <Link href="/register" className="mk-button">Get started <LinkArrow direction="right" /></Link>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="mk-text-link">Explore on GitHub <LinkArrow /></a>
            </div>
          </div>
          <div className="mk-dragon-stage" data-mk-reveal aria-hidden="true">
            <AmbientVideo
              src="/arch-dragon-reveal.mp4"
              poster="/arch-dragon-poster.jpg"
              defer
              playOnce
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      </section>

      <footer className="mk-footer">
        <div className="mk-container mk-footer-row" data-mk-reveal>
          <Link href="/" className="mk-brand" aria-label="ARCH home">
            <span>ARCH<span className="mk-brand-dot">.</span></span>
          </Link>
          <p>© 2026 ARCH. All rights reserved.</p>
          <nav aria-label="Footer">
            <a href={`${GITHUB_REPO_URL}/tree/main/docs`}>Documentation</a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">GitHub <LinkArrow /></a>
            <a href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`}>Security</a>
            {/* From the bottom of the page, this is how the auto-hiding bar comes back. */}
            <a href="#top">Top <LinkArrow /></a>
          </nav>
        </div>

        {/* Full-bleed lettering, cut into three diagonal shards. Decorative only. */}
        <div className="mk-watermark-wrap" aria-hidden="true">
          <svg className="mk-watermark" data-mk-wordmark viewBox="0 0 1440 340" focusable="false">
            <defs>
              <linearGradient id="mk-wordmark-ink" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--mk-accent)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="var(--mk-accent)" stopOpacity="0.12" />
              </linearGradient>
              <clipPath id="mk-wordmark-cuts">
                <path d="M0 0H1440V95L0 145Z M0 155L1440 105V215L0 260Z M0 270L1440 225V340H0Z" />
              </clipPath>
            </defs>
            <text x="20" y="300" textLength="1400" lengthAdjust="spacingAndGlyphs" clipPath="url(#mk-wordmark-cuts)" fill="url(#mk-wordmark-ink)">ARCH.</text>
          </svg>
        </div>
      </footer>
    </>
  );
}
