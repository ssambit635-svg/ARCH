'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/logo';
import { AI_NAME } from '@/lib/brand';
import { scrollToHash } from './use-lenis';

/**
 * Primary navigation.
 *
 * Three behaviours earn their keep:
 *   - A 2px scroll-progress rule along the top edge. On a page this long it is the only honest way
 *     to answer "how much is left", and it doubles as the section scrubber.
 *   - The bar condenses on scroll — padding tightens, glass comes up, a hairline appears. It should
 *     feel like an instrument powering down to essentials, not like a navbar toggling a class.
 *   - Anchor links route through Lenis, so clicking a section eases exactly like a wheel scroll
 *     instead of snapping.
 */

const LINKS: { label: string; href: string }[] = [
  { label: 'Lifecycle', href: '#lifecycle' },
  { label: AI_NAME, href: '#intelligence' },
  { label: 'Topology', href: '#topology' },
  { label: 'Platform', href: '#platform' },
  { label: 'Deploy', href: '#deploy' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;

    const read = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 28);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);

      // Highlight the section currently owning the viewport, offset for the fixed bar.
      let current: string | null = null;
      for (const link of LINKS) {
        const node = document.querySelector(link.href);
        if (!node) continue;
        if (node.getBoundingClientRect().top <= 140) current = link.href;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Escape closes the sheet; the body must not keep scrolling behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const go = (href: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    setOpen(false);
    // Let the sheet finish closing before the scroll starts, or the two animations fight.
    window.setTimeout(() => scrollToHash(href), open ? 220 : 0);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[padding,background-color,border-color,backdrop-filter] duration-500 ease-out ${
          scrolled ? 'border-b border-white/[0.07] bg-ink-1000/72 py-2.5 backdrop-blur-xl' : 'border-b border-transparent py-4'
        }`}
      >
        {/* Scroll progress — sodium, because it is ARCH's own chrome and not incident data. */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-transparent" aria-hidden>
          <div
            className="h-full origin-left bg-signal-500"
            style={{ width: `${progress * 100}%`, transition: 'width 90ms linear' }}
          />
        </div>

        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link href="/" className="shrink-0" aria-label="ARCH home" data-cursor>
            <Logo />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Sections">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={go(link.href)}
                className={`arch-mono relative rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.13em] transition-colors duration-250 ${
                  active === link.href ? 'text-bone' : 'text-ash-500 hover:text-ash-200'
                }`}
                data-cursor
              >
                {link.label}
                {/* Active marker: a rule that draws in from the left, not a pill that pops. */}
                <span
                  className={`absolute inset-x-2.5 -bottom-px h-px origin-left bg-signal-500 transition-transform duration-500 ease-out ${
                    active === link.href ? 'scale-x-100' : 'scale-x-0'
                  }`}
                  aria-hidden
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/status/demo"
              prefetch={false}
              className="arch-mono hidden rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.13em] text-ash-400 transition hover:text-bone md:inline-flex"
              data-cursor
            >
              Live status
            </Link>
            <Link
              href="/login"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-ash-300 transition hover:bg-white/[0.05] hover:text-bone sm:inline-flex"
              data-cursor
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="arch-sheen inline-flex items-center gap-2 rounded-lg bg-bone px-4 py-2 text-sm font-semibold text-ink-1000 shadow-[0_1px_0_0_rgb(255_255_255/0.5)_inset,0_10px_24px_-14px_rgb(0_0_0/0.9)] transition hover:bg-white active:scale-[0.985]"
              data-cursor
            >
              Start free
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-white/[0.09] text-ash-300 transition hover:border-white/20 hover:text-bone lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              data-cursor
            >
              <span className="flex flex-col gap-[3px]" aria-hidden>
                <span className="block h-px w-4 bg-current" />
                <span className="block h-px w-4 bg-current" />
                <span className="block h-px w-2.5 bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet — full-bleed, and it staggers its own links in. */}
      <div
        className={`fixed inset-0 z-[70] lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-ink-1000/92 backdrop-blur-xl transition-opacity duration-400 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute inset-x-0 top-0 border-b border-white/[0.08] bg-ink-950 px-5 pb-8 pt-5 transition-transform duration-500 ease-out ${
            open ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="mb-7 flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-lg border border-white/[0.09] text-ash-300"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col" aria-label="Sections">
            {LINKS.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={go(link.href)}
                className="arch-display flex items-baseline justify-between border-b border-white/[0.06] py-3.5 text-[26px] font-medium tracking-[-0.02em] text-bone transition-all duration-500"
                style={{
                  transitionDelay: `${open ? 120 + index * 55 : 0}ms`,
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateY(0)' : 'translateY(10px)',
                }}
              >
                {link.label}
                <span className="arch-mono text-[10px] tracking-[0.16em] text-ash-600">0{index + 1}</span>
              </a>
            ))}
          </nav>

          <div className="mt-7 flex gap-2.5">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-center text-sm font-medium text-ash-200"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg bg-bone px-4 py-2.5 text-center text-sm font-semibold text-ink-1000"
            >
              Start free
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
