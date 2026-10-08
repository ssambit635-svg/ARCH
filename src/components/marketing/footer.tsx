import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { LinkArrow } from './link-arrow';

interface FooterLink {
  label: string;
  href: string;
  /** Next.js route — rendered with client-side navigation. */
  route?: boolean;
  external?: boolean;
}

const FOOTER_COLUMNS: Array<{ heading: string; links: FooterLink[] }> = [
  {
    heading: 'Product',
    links: [
      { label: 'Workspace', href: '#workspace' },
      { label: 'Workflow', href: '#lifecycle' },
      { label: 'Native engine', href: '#topology' },
      { label: 'By design', href: '#capabilities' },
      { label: 'Deploy', href: '#deploy' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Documentation', href: `${GITHUB_REPO_URL}/tree/main/docs`, external: true },
      { label: 'Setup guide', href: `${GITHUB_REPO_URL}/blob/main/docs/DEVELOPMENT.md`, external: true },
      { label: 'GitHub', href: GITHUB_REPO_URL, external: true },
      { label: 'Changelog', href: `${GITHUB_REPO_URL}/blob/main/CHANGELOG.md`, external: true },
      { label: 'Security', href: `${GITHUB_REPO_URL}/blob/main/SECURITY.md`, external: true },
    ],
  },
  {
    heading: 'Get started',
    links: [
      { label: 'Create an account', href: '/register', route: true },
      { label: 'Log in', href: '/login', route: true },
      // No link to the demo status page: the marketing surface does not advertise it.
      { label: 'License', href: `${GITHUB_REPO_URL}/blob/main/LICENSE`, external: true },
    ],
  },
];

/** A crisp, decorative ARCH signature. The original blurred treatment is intentionally gone. */
function Wordmark() {
  return (
    <div className="mk-watermark-wrap" aria-hidden="true">
      <svg className="mk-watermark" data-mk-wordmark viewBox="0 0 1440 400" focusable="false" role="presentation">
        <defs>
          {/* Kept as inert compatibility definitions for older snapshots. No text below uses them. */}
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

function FooterLinkItem({ link }: { link: FooterLink }) {
  const arrow = link.external ? <LinkArrow /> : null;
  if (link.route) {
    return (
      <Link href={link.href}>
        {link.label}
        {arrow}
      </Link>
    );
  }
  return (
    <a href={link.href} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {link.label}
      {arrow}
    </a>
  );
}

/** Site footer: navigation, legal, and the clean ARCH signature that closes the page. */
export function SiteFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-grid" data-mk-reveal>
          <div className="mk-footer-intro">
            <Link href="/" className="mk-brand" aria-label="ARCH home">
              <img src="/dragon-mark.webp" alt="" aria-hidden="true" width="28" height="28" className="mk-brand-mark" />
              <span>
                ARCH<span className="mk-brand-dot">.</span>
              </span>
            </Link>
            <p className="mk-footer-tagline">
              Alerts, context, and human-reviewed assistance, running on infrastructure you control.
            </p>
          </div>

          <nav className="mk-footer-columns" aria-label="Footer">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading} className="mk-footer-column">
                <h2 className="mk-footer-heading">{column.heading}</h2>
                <ul className="mk-footer-links">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLinkItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mk-footer-bar">
          <p className="mk-footer-legal">© 2026 ARCH. All rights reserved.</p>
          <p className="mk-footer-note">Proprietary license · self-hosted on your infrastructure</p>
          <a href="#top" className="mk-footer-top">
            Back to top
            <span className="mk-footer-top-icon" aria-hidden="true">
              <LinkArrow direction="up-right" />
            </span>
          </a>
        </div>
      </div>

      <Wordmark />
    </footer>
  );
}
