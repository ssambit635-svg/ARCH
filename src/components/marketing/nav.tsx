'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { GithubStarCount } from './github-star-count';

const NAV_ITEMS = [
  { href: '#workspace', label: 'Workspace' },
  { href: '#library-map', label: 'Library Map' },
  { href: '#topology', label: 'Neural Brain' },
  { href: '#lifecycle', label: 'Lifecycle' },
  { href: '#capabilities', label: 'Why ARCH' },
  { href: '#deploy', label: 'Deploy' },
];

const QUICK_COMMANDS = [
  { title: 'Interactive Neural Brain', subtitle: '3D synaptic cortex & blast-radius inspector', href: '#topology', tag: 'NEURAL' },
  { title: 'Live Incident Workspace', subtitle: 'Interactive SEV-1 console with ARCH V1.1 triage', href: '#workspace', tag: 'CONSOLE' },
  { title: 'Architecture Library Map', subtitle: '01/03 Alert Forge · 02/03 Motion Kernel · 03/03 Composer', href: '#library-map', tag: 'BENTO' },
  { title: '4-Stage Incident Lifecycle', subtitle: 'Pinned GSAP scroll-scrub timeline (03:12:04 -> 03:18:19)', href: '#lifecycle', tag: 'GSAP' },
  { title: 'Public Status Page (/status/arch)', subtitle: 'Live 90-day uptime ledger & active advisories', href: '/status/arch', tag: 'LIVE' },
  { title: 'Sign in to ARCH Dashboard', subtitle: 'Open full multi-tenant incident operations console', href: '/login', tag: 'AUTH' },
];

export function MarketingNav() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = QUICK_COMMANDS.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.tag.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <header className="sticky top-0 isolate z-[200] border-b border-[#222] bg-[#050608]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8 xl:px-20">
          {/* Left: ARCH Brand with Official Dragon Logo + Pill Nav */}
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-orbitron text-xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity"
              aria-label="ARCH home"
            >
              <img
                src="/dragon-mark.webp"
                alt="ARCH"
                className="h-7 w-auto object-contain drop-shadow-[0_0_12px_rgba(59,142,244,0.28)]"
              />
              <span>
                ARCH<span className="text-[#3b8ef4]">.</span>
              </span>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden lg:flex items-center gap-1 rounded-lg border border-[#222] bg-[#0b0c10] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Command Search + GitHub Star Pill + Login / Get Started */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden sm:inline-flex items-center justify-between gap-6 rounded-xl border border-[#222] bg-[#0b0c10] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <span className="flex items-center gap-2 font-mono text-[11px]">
                <svg className="size-3.5 text-zinc-500" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.6 10.6 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Search ARCH...
              </span>
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                ⌘K
              </kbd>
            </button>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="github-star-cta group relative hidden md:inline-flex h-9 items-center gap-2 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950/90 px-3 text-xs font-semibold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-500"
            >
              <span className="inline-flex size-5 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-900/90 text-zinc-200">
                <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
                  <path d="M8 0C3.58 0 0 3.58 0 8a8.01 8.01 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700/90 bg-zinc-900/95 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-zinc-100">
                <span aria-hidden className="text-[#3b8ef4]">★</span>
                <GithubStarCount />
              </span>
            </a>

            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all hover:border-[#3b8ef4]/60 hover:bg-[#3b8ef4] hover:text-white"
            >
              <span>Get Started</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Command K Modal */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-black/80 px-4 pt-24 backdrop-blur-sm"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#222] bg-[#08090c] shadow-[0_24px_72px_-24px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#222] px-4 py-3">
              <span className="font-mono text-xs text-[#3b8ef4]">⌘</span>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to section, neural brain, or workspace..."
                className="w-full bg-transparent font-mono text-xs text-white placeholder:text-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="rounded border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:text-white"
              >
                ESC
              </button>
            </div>
            <div className="divide-y divide-[#18191e] p-2">
              {filtered.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  onClick={() => setCmdOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  <div>
                    <div className="text-xs font-medium text-white">{item.title}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{item.subtitle}</div>
                  </div>
                  <span className="rounded border border-[#222] bg-[#111216] px-2 py-0.5 font-mono text-[10px] text-[#3b8ef4]">
                    {item.tag}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
