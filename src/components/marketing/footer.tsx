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

/**
 * The wordmark is drawn four times, each copy softer than the one above it.
 * The blurred copies underneath only ever ramp *up* towards the bottom while
 * the crisp copy on top only ramps *down*, so the letters lose focus as they
 * lose contrast and dissolve into the page with no seam where one layer hands
 * over to the next. Decorative — screen readers skip the whole thing.
 */
function Wordmark() {
  return (
    <div className="mk-watermark-wrap" aria-hidden="true">
      <svg className="mk-watermark" data-mk-wordmark viewBox="0 0 1440 400" focusable="false" role="presentation">
        <defs>
          {/* Colour + contrast ramp. Every stop is the theme accent, so the
              wordmark keeps its identity in the light surface too. */}
          <linearGradient id="mk-wm-ink" gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="400">
            <stop offset="0" stopColor="var(--mk-accent)" stopOpacity="0.95" />
            <stop offset="0.4" stopColor="var(--mk-accent)" stopOpacity="0.72" />
            <stop offset="0.62" stopColor="var(--mk-accent)" stopOpacity="0.34" />
            <stop offset="0.82" stopColor="var(--mk-accent)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--mk-accent)" stopOpacity="0" />
          </linearGradient>

          {/* Four ramps. The three lower layers fade in towards the bottom, the
              crisp layer on top fades out — so softness only ever increases. */}
          <linearGradient id="mk-wm-ramp-mist" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="400">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.625" stopColor="#000" />
            <stop offset="0.8625" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <linearGradient id="mk-wm-ramp-soft" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="400">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.4875" stopColor="#000" />
            <stop offset="0.725" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <linearGradient id="mk-wm-ramp-haze" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="400">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.325" stopColor="#000" />
            <stop offset="0.5875" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <linearGradient id="mk-wm-ramp-crisp" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="400">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.375" stopColor="#fff" />
            <stop offset="0.625" stopColor="#000" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>

          <mask id="mk-wm-mask-mist" maskUnits="userSpaceOnUse" x="-120" y="-120" width="1680" height="640" colorInterpolation="sRGB">
            <rect x="-120" y="-120" width="1680" height="640" fill="url(#mk-wm-ramp-mist)" />
          </mask>
          <mask id="mk-wm-mask-soft" maskUnits="userSpaceOnUse" x="-120" y="-120" width="1680" height="640" colorInterpolation="sRGB">
            <rect x="-120" y="-120" width="1680" height="640" fill="url(#mk-wm-ramp-soft)" />
          </mask>
          <mask id="mk-wm-mask-haze" maskUnits="userSpaceOnUse" x="-120" y="-120" width="1680" height="640" colorInterpolation="sRGB">
            <rect x="-120" y="-120" width="1680" height="640" fill="url(#mk-wm-ramp-haze)" />
          </mask>
          <mask id="mk-wm-mask-crisp" maskUnits="userSpaceOnUse" x="-120" y="-120" width="1680" height="640" colorInterpolation="sRGB">
            <rect x="-120" y="-120" width="1680" height="640" fill="url(#mk-wm-ramp-crisp)" />
          </mask>

          <filter id="mk-wm-blur-mist" filterUnits="userSpaceOnUse" x="-120" y="-120" width="1680" height="640" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id="mk-wm-blur-soft" filterUnits="userSpaceOnUse" x="-120" y="-120" width="1680" height="640" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="19" />
          </filter>
          <filter id="mk-wm-blur-haze" filterUnits="userSpaceOnUse" x="-120" y="-120" width="1680" height="640" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Orbitron 900, stretched edge to edge: heavy stems, wide letterforms. */}
        <g fill="url(#mk-wm-ink)">
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" mask="url(#mk-wm-mask-mist)" filter="url(#mk-wm-blur-mist)">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" mask="url(#mk-wm-mask-soft)" filter="url(#mk-wm-blur-soft)">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" mask="url(#mk-wm-mask-haze)" filter="url(#mk-wm-blur-haze)">ARCH.</text>
          <text x="0" y="300" textLength="1440" lengthAdjust="spacingAndGlyphs" mask="url(#mk-wm-mask-crisp)">ARCH.</text>
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

/** Site footer: navigation, legal, and the dissolving wordmark that closes the page. */
export function SiteFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-grid" data-mk-reveal>
          <div className="mk-footer-intro">
            <Link href="/" className="mk-brand" aria-label="ARCH home">
              <img src="/dragon-mark.webp" alt="" width="28" height="28" className="mk-brand-mark" />
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
