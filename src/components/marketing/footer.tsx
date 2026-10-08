import Link from 'next/link';
import { CONTACT_EMAIL, GITHUB_REPO_URL } from '@/lib/brand';
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
          Write to us — a real person replies.
        </p>
        <div className="mk-footer-cta-actions">
          <a href={`mailto:${CONTACT_EMAIL}`} className="mk-button">Email us <LinkArrow direction="right" /></a>
          <Link href="/register" className="mk-footer-cta-link">Get started <LinkArrow /></Link>
        </div>
      </div>

      {/* The closing frame now carries real ways to reach us: a monitored inbox,
          the public repository, and the policies a buyer asks for. */}
      <nav id="contact" className="mk-footer-meta" aria-label="Contact and legal">
        <section className="mk-footer-meta-col">
          <h3>Contact</h3>
          <ul>
            <li><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
            <li><a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">GitHub <LinkArrow /></a></li>
            <li><a href={`${GITHUB_REPO_URL}/issues`} target="_blank" rel="noreferrer">Report an issue <LinkArrow /></a></li>
            <li><a href={`${GITHUB_REPO_URL}/discussions`} target="_blank" rel="noreferrer">Discussions <LinkArrow /></a></li>
          </ul>
        </section>
        <section className="mk-footer-meta-col">
          <h3>Legal</h3>
          <ul>
            <li><a href={`${GITHUB_REPO_URL}/blob/main/docs/legal/PRIVACY-POLICY.md`} target="_blank" rel="noreferrer">Privacy policy</a></li>
            <li><a href={`${GITHUB_REPO_URL}/blob/main/docs/legal/TERMS-OF-SERVICE.md`} target="_blank" rel="noreferrer">Terms &amp; conditions</a></li>
            <li><a href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">Security &amp; compliance</a></li>
          </ul>
        </section>
        <section className="mk-footer-meta-col">
          <h3>Product</h3>
          <ul>
            <li><Link href="/dashboard/status">Status pages</Link></li>
            <li><Link href="/register">Get started</Link></li>
          </ul>
        </section>
      </nav>

      <div className="mk-footer-bar">
        <p className="mk-footer-legal">© 2026 ARCH. All rights reserved.</p>
        <p className="mk-footer-note">Proprietary license · self-hosted on your infrastructure</p>
        <a href="#top" className="mk-footer-top">Back to top</a>
      </div>

      <Wordmark />
    </footer>
  );
}
