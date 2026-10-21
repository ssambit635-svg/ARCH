'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { LinkArrow } from './link-arrow';

const NAV_ITEMS = [
  { href: '#product', label: 'Product' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#engine', label: 'Native engine' },
  { href: '#deploy', label: 'Self-host' },
  { href: `${GITHUB_REPO_URL}/tree/main/docs`, label: 'Docs' },
];

/** How long the pointer must stay away from the bar before it slides out of sight. */
const AUTO_HIDE_MS = 5000;
/** Pointer within this many px of the viewport top counts as reaching for the bar. */
const WAKE_ZONE_PX = 80;

/**
 * A sticky navigation bar in the Aceternity hero-block manner: at the top of the page it floats
 * transparently over the hero's dawn sky, and once the page scrolls it gains the paper fill,
 * blur and hairline that keep it readable over every section below. It swaps to a disclosure
 * below 960px.
 *
 * After AUTO_HIDE_MS with no engagement it slides away so the page can breathe, and it comes
 * straight back when the visitor reaches for it: pointer over the bar or into the wake zone at
 * the top of the viewport, keyboard focus landing inside it, or the mobile menu opening.
 * Touch devices are exempt — with no hover there is no way to call it back, so it stays put.
 */
export function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveringRef = useRef(false);
  const nearTopRef = useRef(false);
  const focusRef = useRef(false);
  const menuOpenRef = useRef(false);
  const engagedRef = useRef(true);

  const fineHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /** Reconcile visibility with the four engagement signals; arm the countdown once per exit. */
  const updateEngagement = () => {
    const engaged = hoveringRef.current || nearTopRef.current || focusRef.current || menuOpenRef.current || (headerRef.current?.matches(':hover') ?? false);
    if (engaged) {
      engagedRef.current = true;
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setHidden(false);
      return;
    }
    // Already counting down (or already hidden): moving the pointer around the page must not
    // keep pushing the deadline back, or the bar would never leave.
    if (!engagedRef.current) return;
    engagedRef.current = false;
    if (!fineHover()) return;
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setHidden(true);
    }, AUTO_HIDE_MS);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
    updateEngagement();
  }, [menuOpen]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      nearTopRef.current = event.clientY <= WAKE_ZONE_PX;
      updateEngagement();
    };
    const onLeaveWindow = () => {
      nearTopRef.current = false;
      hoveringRef.current = false;
      updateEngagement();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveWindow);
    updateEngagement(); // arm the first countdown on load
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // updateEngagement only touches refs and the stable setHidden, so this closure stays correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className={`mk-nav${scrolled ? ' mk-nav--scrolled' : ''}${hidden ? ' mk-nav--hidden' : ''}`}
      onPointerEnter={() => {
        hoveringRef.current = true;
        updateEngagement();
      }}
      onPointerLeave={() => {
        hoveringRef.current = false;
        updateEngagement();
      }}
      onFocus={() => {
        focusRef.current = true;
        updateEngagement();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          focusRef.current = false;
          updateEngagement();
        }
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
          <span className="mk-brand-tile" aria-hidden="true">
            <img src="/dragon-mark.webp" alt="" aria-hidden="true" width={22} height={22} className="mk-brand-mark" />
          </span>
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
          <Link href="/login" className="mk-nav-link mk-nav-login">Log in</Link>
          <Link href="/register" className="mk-button mk-button--small mk-button--glass">Get started <span className="mk-arrow-chip"><LinkArrow direction="right" /></span></Link>
          <button
            ref={menuButtonRef}
            type="button"
            className="mk-icon-button mk-menu-button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="marketing-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
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
          <Link href="/register" className="mk-button mk-button--small mk-button--glass" onClick={() => setMenuOpen(false)}>Get started <span className="mk-arrow-chip"><LinkArrow direction="right" /></span></Link>
        </div>
      </nav>
    </header>
  );
}
