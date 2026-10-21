'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { LinkArrow } from './link-arrow';

const NAV_ITEMS = [
  { href: '#product', label: 'Product' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#engine', label: 'Native engine' },
  { href: '#deploy', label: 'Self-host' },
  { href: `${GITHUB_REPO_URL}/tree/main/docs`, label: 'Docs' },
];

/**
 * How long the bar waits, with nothing on it, before it steps out of the way. Five seconds of
 * quiet and it slides up; a pointer returning to the top edge (or keyboard focus, or the
 * mobile disclosure) brings it straight back.
 */
const IDLE_MS = 5000;
/** How close to the top edge a pointer has to come to be asking for the bar back. */
const WAKE_ZONE_PX = 104;

/**
 * A sticky navigation bar in the Aceternity hero-block manner: at the top of the page it floats
 * transparently over the hero's dawn sky, and once the page scrolls it gains the paper fill,
 * blur and hairline that keep it readable over every section below. It swaps to a disclosure
 * below 960px.
 *
 * It is also the one element on the page that is allowed to leave. After `IDLE_MS` without a
 * pointer on it the bar retires above the fold, and the pointer returning to the top edge of
 * the viewport wakes it again — so the page reads as a full-bleed document and the navigation
 * is there the moment it is wanted. Five rules keep that from being a trap:
 *   - Touch and stylus pointers have no hover to give, so the bar never hides there.
 *   - Keyboard focus anywhere inside the bar pins it open; it cannot hide under the caret.
 *   - The mobile disclosure pins it open too, so a half-read menu never slides away.
 *   - A pointer resting anywhere in the top `WAKE_ZONE_PX` is treated as a request for the
 *     bar, even when it has not crossed onto the bar itself.
 *   - The bar only translates; it keeps its place in the accessibility tree and in the tab
 *     order, and reduced-motion visitors get the plain cross-fade instead of the travel.
 */
export function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [nearTop, setNearTop] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [idle, setIdle] = useState(false);
  // Any fresh activity — the pointer reaching the wake zone, a keyboard focus, a return to the
  // top of the page — bumps this and restarts the countdown.
  const [wake, setWake] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const idleRef = useRef(false);

  const setIdleState = useCallback((next: boolean) => {
    if (idleRef.current === next) return;
    idleRef.current = next;
    setIdle(next);
  }, []);

  const ping = useCallback(() => {
    setIdleState(false);
    setWake((value) => value + 1);
  }, [setIdleState]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      // Returning to the very top of the page is a request for the bar back.
      if (window.scrollY < 48 && idleRef.current) ping();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ping]);

  // Only a mouse/trackpad can hover, so only those pointers get the retreat-and-return
  // behaviour. On a phone the bar is simply always there, and a visitor who asked for less
  // movement gets a bar that stays put instead of one that appears and disappears.
  useEffect(() => {
    const hover = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const sync = () => setHoverCapable(hover.matches);
    sync();
    hover.addEventListener('change', sync);
    return () => hover.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 960px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  // Proximity. There is no hover strip element on purpose: a strip covering the top of the
  // viewport would swallow clicks meant for the page underneath it, and a pointer already
  // inside it when the bar leaves would never fire another `pointerenter`. Watching the
  // pointer's distance from the top edge costs one passive listener and steals nothing.
  useEffect(() => {
    if (!hoverCapable) return;
    let lastSample = 0;
    const onMove = (event: PointerEvent) => {
      const near = event.clientY <= WAKE_ZONE_PX;
      if (near && idleRef.current) ping();
      const now = performance.now();
      if (now - lastSample < 250) return;
      lastSample = now;
      setNearTop(near);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [hoverCapable, ping]);

  // The countdown itself. Anything holding the bar open (pointer, focus, the open menu, a
  // device that cannot hover) simply stops the timer being set.
  useEffect(() => {
    setIdleState(false);
    if (!hoverCapable || hovering || nearTop || focusWithin || menuOpen) return;
    const timer = window.setTimeout(() => setIdleState(true), IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [hoverCapable, hovering, nearTop, focusWithin, menuOpen, wake, setIdleState]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [menuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className={`mk-nav${scrolled ? ' mk-nav--scrolled' : ''}${idle ? ' mk-nav--idle' : ''}`}
        data-mk-nav={idle ? 'idle' : 'visible'}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(event) => {
          if (!headerRef.current?.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
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
    </>
  );
}
