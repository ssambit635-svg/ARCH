import Link from 'next/link';
import { CONTACT_EMAIL, GITHUB_REPO_URL } from '@/lib/brand';
import { LinkArrow } from './link-arrow';

/**
 * The footer carries the final call to action on the page's one warm surface: paper dissolving
 * into ember, a serif close at the top, white links on solid ember underneath. The oversized
 * wordmark is decorative and is the last thing a visitor scrolls past.
 *
 * Two rules keep this section honest:
 *   - Nothing here is revealed by hover. Both actions are solid, labelled and present at rest.
 *   - The closing actions never animate from `opacity: 0`; they rise from a transform only, so a
 *     missed scroll trigger can never leave the primary CTA invisible.
 */

const PROOF_RAIL = [
  'Self-hosted',
  'No external AI calls',
  'Every write audited',
  'Human-reviewed suggestions',
  'CPU-only inference',
  'Your database, your region',
];

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
        <g fill="currentColor">
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" opacity="0.05">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" opacity="0.05">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" opacity="0.05">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" opacity="0.1">ARCH.</text>
        </g>
      </svg>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mk-footer" aria-labelledby="footer-title">
      <div className="mk-footer-cta">
        <div className="mk-footer-cta-inner mk-container" data-mk-panel>
          <p className="mk-eyebrow">Start here</p>
          <h2 id="footer-title" data-mk-curtain>
            So fast, you’ll break<br />things <em>on purpose.</em>
          </h2>
          <p className="mk-footer-cta-copy">
            Ready to put ARCH on your incidents?<br />
            The alert, the context and the postmortem in one workspace you run yourself.
          </p>
          <div className="mk-footer-cta-actions">
            <Link href="/register" className="mk-button mk-button--xl">
              Get started for free <LinkArrow direction="right" />
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mk-button mk-button--xl mk-button--outline-ink">
              Talk to an expert
            </a>
          </div>
          <p className="mk-footer-cta-fineprint">Self-hosted · no card · a real person answers.</p>
        </div>

        <div className="mk-footer-rail" aria-hidden="true">
          <div className="mk-footer-rail-track">
            {[...PROOF_RAIL, ...PROOF_RAIL].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mk-footer-base">
        <nav className="mk-footer-meta" id="contact" aria-label="Contact and legal">
          <section className="mk-footer-meta-col mk-footer-brand-col">
            <p className="mk-footer-brand">ARCH<span>.</span></p>
            <p className="mk-footer-tagline">Incident response for engineering teams. Run it on your own hardware.</p>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="mk-footer-gh">
              Star on GitHub <LinkArrow />
            </a>
          </section>
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
            <h3>Product</h3>
            <ul>
              <li><Link href="/register">Get started</Link></li>
              <li><Link href="/login">Open your workspace</Link></li>
              <li><a href={`${GITHUB_REPO_URL}/blob/main/docs/product/FEATURES.md`} target="_blank" rel="noreferrer">Features</a></li>
              <li><a href={`${GITHUB_REPO_URL}/blob/main/docs/engineering/ARCH-MODEL.md`} target="_blank" rel="noreferrer">Native engine</a></li>
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
        </nav>

        <div className="mk-footer-bar">
          <p className="mk-footer-legal">© 2026 ARCH. All rights reserved.</p>
          <p className="mk-footer-note">Proprietary license · self-hosted on your infrastructure</p>
          <a href="#top" className="mk-footer-top">
            Back to top
            <span className="mk-footer-top-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 13V3M4 7l4-4 4 4" />
              </svg>
            </span>
          </a>
        </div>
      </div>

      <Wordmark />
    </footer>
  );
}
