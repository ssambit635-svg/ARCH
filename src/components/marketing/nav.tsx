'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { LogoMark } from '@/components/ui/logo';
import { scrollToHash } from './use-lenis';

const LINKS: { label: string; href: string }[] = [
  { label: 'Workflow', href: '#lifecycle' },
  { label: 'Intelligence', href: '#intelligence' },
  { label: 'Service map', href: '#topology' },
  { label: 'Platform', href: '#platform' },
  { label: 'Self-hosted', href: '#deploy' },
];

function Brand() {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center gap-2.5 text-bone" aria-label="ARCH home">
      <LogoMark size={28} className="text-bone" />
      <span className="arch-display text-[15px] font-semibold tracking-[0.2em]">ARCH</span>
    </Link>
  );
}

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
      setScrolled(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);

      let current: string | null = null;
      for (const link of LINKS) {
        const section = document.querySelector(link.href);
        if (section && section.getBoundingClientRect().top <= 130) current = link.href;
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    window.setTimeout(() => scrollToHash(href), open ? 180 : 0);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
          scrolled
            ? 'border-white/[0.08] bg-[#080c11]/90 backdrop-blur-xl'
            : 'border-white/[0.055] bg-[#080c11]/72 backdrop-blur-lg'
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.025]" aria-hidden="true">
          <div className="h-full origin-left bg-signal-400/80" style={{ width: `${progress * 100}%`, transition: 'width 100ms linear' }} />
        </div>
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8">
          <Brand />

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={go(link.href)}
                aria-current={active === link.href ? 'location' : undefined}
                className={`group relative rounded-md px-3 py-2 text-[12px] font-medium transition-colors duration-200 ${
                  active === link.href ? 'text-bone' : 'text-ash-400 hover:text-bone'
                }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-3 -bottom-px h-px origin-left bg-signal-400 transition-transform duration-300 ${
                    active === link.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                  aria-hidden="true"
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-md px-3 py-2 text-[13px] font-medium text-ash-300 transition-colors hover:text-bone sm:inline-flex">
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/[0.12] bg-[#e7edf2] px-3.5 py-2 text-[12px] font-semibold text-[#10171d] transition-colors hover:bg-white"
            >
              Get started <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid size-9 place-items-center rounded-md border border-white/[0.1] text-ash-200 transition-colors hover:border-white/20 hover:text-white xl:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="arch-mobile-menu"
            >
              <span className="flex flex-col gap-[4px]" aria-hidden="true">
                <span className="h-px w-4 bg-current" />
                <span className="h-px w-3 bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="arch-mobile-menu"
        className={`fixed inset-0 z-[70] xl:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-[#05080c]/80 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
        />
        <div inert={!open} className={`absolute inset-x-0 top-0 border-b border-white/[0.09] bg-[#0a1016] px-5 pb-6 pt-4 shadow-2xl transition-transform duration-300 ease-out sm:px-8 ${open ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex h-11 items-center justify-between">
            <Brand />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-md border border-white/[0.1] text-ash-300"
              aria-label="Close menu"
              tabIndex={open ? 0 : -1}
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          </div>
          <nav className="mt-5 flex flex-col" aria-label="Mobile navigation">
            {LINKS.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={go(link.href)}
                tabIndex={open ? 0 : -1}
                className="flex items-center justify-between border-t border-white/[0.07] py-3.5 text-[16px] font-medium text-bone transition-colors hover:text-signal-300"
              >
                {link.label}<span className="arch-mono text-[9px] tracking-[0.14em] text-ash-600">0{index + 1}</span>
              </a>
            ))}
          </nav>
          <div className="mt-5 flex gap-2">
            <Link href="/login" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} className="flex-1 rounded-md border border-white/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-ash-200">Sign in</Link>
            <Link href="/register" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} className="flex-1 rounded-md bg-[#e7edf2] px-4 py-2.5 text-center text-[13px] font-semibold text-[#10171d]">Get started</Link>
          </div>
        </div>
      </div>
    </>
  );
}
