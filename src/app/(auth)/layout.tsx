import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import '@/components/auth/auth.css';
import { GITHUB_REPO_URL, PRODUCT_VERSION } from '@/lib/brand';
import { AuthShowcase } from '@/components/auth/auth-showcase';
import { ArrowIcon } from '@/components/auth/icons';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: '#f6f4ef', colorScheme: 'light' };

/** Public-site colour and type, isolated from both marketing motion and the dark console. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-surface">
      <a href="#auth-content" className="auth-skip">
        Skip to form
      </a>
      <div className="auth-dawn" aria-hidden="true">
        <img
          src="/marketing/hero-dawn.jpg"
          alt=""
          aria-hidden="true"
          className="auth-dawn-img"
          decoding="async"
        />
        <div className="auth-dawn-shade" />
      </div>
      <div className="auth-scales" aria-hidden="true">
        <span />
        <span />
      </div>

      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="auth-brand-cluster">
            <Link href="/" className="auth-brand" aria-label="ARCH home">
              <span className="auth-brand-tile" aria-hidden="true">
                <img src="/dragon-mark.webp" alt="" aria-hidden="true" width={22} height={22} />
              </span>
              <span>
                ARCH<span className="auth-brand-dot">.</span>
              </span>
            </Link>
            <span className="auth-release-pill">Early access · v{PRODUCT_VERSION}</span>
          </div>
          <nav className="auth-header-nav" aria-label="Helpful links">
            <a
              href={`${GITHUB_REPO_URL}/tree/main/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="auth-header-link"
            >
              Documentation
            </a>
            <Link href="/" className="auth-header-back">
              <ArrowIcon left />
              <span>Back to overview</span>
            </Link>
          </nav>
        </div>
      </header>

      <main id="auth-content" className="auth-main" tabIndex={-1}>
        <section className="auth-card-frame" aria-label="Workspace authentication">
          <div className="auth-card-chrome" aria-hidden="true">
            <span className="auth-window-dots">
              <i />
              <i />
              <i />
            </span>
            <span>ARCH / workspace access</span>
            <span className="auth-chrome-mark">↗</span>
          </div>
          <div className="auth-card-body">{children}</div>
        </section>
        <AuthShowcase />
      </main>

      <footer className="auth-footer">
        <p>
          © {new Date().getFullYear()} ARCH<span> · </span>Your infrastructure. Your control.
        </p>
        <nav aria-label="Legal and security">
          <a
            href={`${GITHUB_REPO_URL}/blob/main/docs/legal/PRIVACY-POLICY.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy
          </a>
          <a
            href={`${GITHUB_REPO_URL}/blob/main/docs/legal/TERMS-OF-SERVICE.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms
          </a>
          <a
            href={`${GITHUB_REPO_URL}/blob/main/SECURITY.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Security
          </a>
        </nav>
      </footer>
    </div>
  );
}
