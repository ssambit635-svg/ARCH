'use client';

import { LinkArrow } from './link-arrow';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { useMarketingTheme } from './theme-context';

const NAV_ITEMS = [
  { href: '#workspace', label: 'Product' },
  { href: '#lifecycle', label: 'Workflow' },
  { href: '#topology', label: 'Native engine' },
  { href: `${GITHUB_REPO_URL}/tree/main/docs`, label: 'Docs' },
];

/** How long the bar stays put before it steps out of the way again. */
const AUTO_HIDE_MS = 10_000;

export function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useMarketingTheme();
  const themeLabel = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;

  const pinned = hovered || focused || menuOpen;
  const shown = visible || pinned;

  // Visible for ten seconds, then hidden — the cycle repeats for as long as the page is open.
  useEffect(() => {
    if (!shown || pinned) return;
    const timer = window.setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [shown, pinned]);

  // Return when the pointer reaches the top edge, and keep returning after every hide.
  useEffect(() => {
    const reveal = () => setVisible(true);
    const onPointerMove = (event: PointerEvent) => {
      if (event.clientY <= 24) reveal();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 960px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [menuOpen]);

  return (
    <>
      {/* A quiet strip along the top edge. It stays out of the way and lets the pointer pass
          through; the pointermove listener above is what brings the bar back. */}
      <div className="mk-nav-sensor" aria-hidden="true" />

      <header
        ref={headerRef}
        className={`mk-nav${shown ? '' : ' mk-nav--hidden'}`}
        onPointerEnter={() => {
          setHovered(true);
          setVisible(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => {
          setFocused(true);
          setVisible(true);
        }}
        onBlurCapture={(event) => {
          if (!headerRef.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) {
            setMenuOpen(false);
            menuButtonRef.current?.focus();
          }
        }}
      >
        <div className="mk-container mk-nav-row">
          <Link href="/" className="mk-brand" aria-label="ARCH home">
            <img src="/dragon-mark.webp" alt="" width="28" height="28" className="mk-brand-mark" />
            <span>
              ARCH<span className="mk-brand-dot">.</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="mk-nav-links">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="mk-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mk-nav-actions">
            <a href={GITHUB_REPO_URL} className="mk-nav-link mk-nav-github" target="_blank" rel="noopener noreferrer">
              GitHub <LinkArrow />
            </a>
            <button type="button" onClick={toggleTheme} className="mk-icon-button" aria-label={themeLabel} title={themeLabel}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {theme === 'dark' ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
                  </>
                ) : (
                  <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />
                )}
              </svg>
            </button>
            <Link href="/login" className="mk-nav-link mk-nav-login">Log in</Link>
            <Link href="/register" className="mk-button mk-button--small">Get started</Link>
            <button
              ref={menuButtonRef}
              type="button"
              className="mk-icon-button mk-menu-button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d={menuOpen ? 'M6 6l12 12M6 18 18 6' : 'M4 8h16M4 16h16'} />
              </svg>
            </button>
          </div>
        </div>

        <nav id="marketing-mobile-nav" aria-label="Mobile navigation" className="mk-nav-mobile" hidden={!menuOpen}>
          <div className="mk-container">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
            ))}
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>GitHub <LinkArrow /></a>
            <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
          </div>
        </nav>
      </header>
    </>
  );
}
