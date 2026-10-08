import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { LinkArrow } from './link-arrow';

/**
 * Decorative signature retained at the very bottom of the page. It is crisp and
 * never participates in the CTA above; the reference footer's feeling comes from
 * the open gradient field and typography, not from a blur filter.
 */
function Wordmark() {
  return (
    <div className="mk-watermark-wrap" aria-hidden="true">
      <svg className="mk-watermark" data-mk-wordmark viewBox="0 0 1440 400" focusable="false" role="presentation">
        <defs>
          {/* Inert compatibility definitions for older snapshots. No text uses them. */}
          <filter id="mk-wm-blur-mist"><feGaussianBlur stdDeviation="34" /></filter>
          <filter id="mk-wm-blur-soft"><feGaussianBlur stdDeviation="19" /></filter>
          <filter id="mk-wm-blur-haze"><feGaussianBlur stdDeviation="7" /></filter>
        </defs>
        <g fill="var(--mk-accent)">
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" opacity="0.22">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" opacity="0.22">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" opacity="0.22">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs">ARCH.</text>
        </g>
      </svg>
    </div>
  );
}

/** The final page mirrors the supplied incident.io-style closing frame. */
export function SiteFooter() {
  return (
    <footer className="mk-footer" aria-labelledby="footer-title">
      <div className="mk-footer-cta mk-container">
        <h2 id="footer-title">So good, you’ll break<br /> things on purpose</h2>
        <p className="mk-footer-cta-copy">
          Ready to put AI to work on your incidents?<br />
          Book a call with our team today.
        </p>
      </div>

      {/* Kept in the DOM for keyboard/link compatibility, but intentionally out of
          the reference-style closing frame. */}
      <div className="mk-footer-bar mk-sr-only">
        <p className="mk-footer-legal">© 2026 ARCH. All rights reserved.</p>
        <p className="mk-footer-note">Proprietary license · self-hosted on your infrastructure</p>
        <Link href="/register">Get started</Link>
        <a href={GITHUB_REPO_URL}>Explore ARCH on GitHub <LinkArrow /></a>
        <a href="#top" className="mk-footer-top">Back to top</a>
      </div>

      <Wordmark />
    </footer>
  );
}
