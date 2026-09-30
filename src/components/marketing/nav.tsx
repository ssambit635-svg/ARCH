'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { GithubStarCount } from './github-star-count';
import { useMarketingTheme } from './theme-context';

const NAV_ITEMS = [
  { href: '#workspace', label: 'Workspace' },
  { href: '#topology', label: 'Meet the Robot' },
  { href: '#lifecycle', label: 'Lifecycle' },
  { href: '#capabilities', label: 'Why ARCH' },
  { href: '#deploy', label: 'Deploy' },
];

const QUICK_COMMANDS = [
  { title: 'Meet the Robot', subtitle: 'Original 3D mascot & honest native model guide', href: '#topology', tag: 'NATIVE' },
  { title: 'Live Incident Workspace', subtitle: 'Interactive SEV-1 console with ARCH V1.1 triage', href: '#workspace', tag: 'CONSOLE' },
  { title: 'Architecture Library Map', subtitle: '01/03 Alert Forge · 02/03 Motion Kernel · 03/03 Composer', href: '#library-map', tag: 'BENTO' },
  { title: '4-Stage Incident Lifecycle', subtitle: 'Deterministic stage timeline (03:12:04 -> 03:18:19)', href: '#lifecycle', tag: 'TRACE' },
  { title: 'Public Status Page (/status/arch)', subtitle: '90-day uptime ledger & active advisories', href: '/status/arch', tag: 'STATUS' },
  { title: 'Sign in to ARCH Dashboard', subtitle: 'Open full multi-tenant incident operations console', href: '/login', tag: 'AUTH' },
];

export function MarketingNav() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [initialVisible, setInitialVisible] = useState(true);
  const [hoverVisible, setHoverVisible] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const { theme, toggleTheme } = useMarketingTheme();

  // Stay visible for the first 10 seconds on initial load, then slide up.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInitialVisible(false);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  // Reveal when cursor approaches the top edge of the viewport, hide when leaving.
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 28) {
        if (hideTimeoutRef.current) {
          window.clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        setHoverVisible(true);
      } else if (e.clientY > 84 && hoverVisible) {
        if (!hideTimeoutRef.current) {
          hideTimeoutRef.current = window.setTimeout(() => {
            setHoverVisible(false);
            hideTimeoutRef.current = null;
          }, 220);
        }
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
    };
  }, [hoverVisible]);

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

  const isShown = initialVisible || hoverVisible || cmdOpen;

  const handleHeaderEnter = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHoverVisible(true);
  };

  const handleHeaderLeave = () => {
    if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => {
      setHoverVisible(false);
      hideTimeoutRef.current = null;
    }, 220);
  };

  const filtered = QUICK_COMMANDS.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.tag.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Top hover sensor strip — hovering the top edge brings the navbar back down */}
      <div
        aria-hidden="true"
        onMouseEnter={handleHeaderEnter}
        className="fixed inset-x-0 top-0 z-[199] h-6 bg-transparent"
      />

      <header
        onMouseEnter={handleHeaderEnter}
        onMouseLeave={handleHeaderLeave}
        onFocus={handleHeaderEnter}
        className={`mk-nav fixed inset-x-0 top-0 isolate z-[200] border-b border-[#182438] bg-[#04070e]/92 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isShown
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8 xl:px-20">
          {/* Left: ARCH Brand + Pill Nav */}
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-orbitron text-xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity"
              aria-label="ARCH home"
            >
              <img
                src="/dragon-mark.webp"
                alt="ARCH"
                className="h-7 w-auto object-contain"
              />
              <span>
                ARCH<span className="text-[#3b8ef4]">.</span>
              </span>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden lg:flex items-center gap-1 rounded-lg border border-[#182438] bg-[#070d19] px-2 py-1"
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-[#3b8ef4]/10 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Theme Switcher + Command Search + GitHub Star Pill + Login / Get Started */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to White Mode' : 'Switch to Dark Mode'}
              title={theme === 'dark' ? 'Switch to White Mode' : 'Switch to Dark Mode'}
              className="mk-theme-toggle group inline-flex h-9 items-center gap-2 rounded-full border border-[#1e3454]/80 bg-[#070d19]/90 px-3.5 font-mono text-[11px] font-semibold tracking-wide text-zinc-300 backdrop-blur-md transition-all duration-300 hover:border-[#3b8ef4]/50 hover:bg-[#0b1426] hover:text-white hover:shadow-[0_4px_20px_-8px_rgba(59,142,244,0.3)] hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <span className="relative flex size-4 items-center justify-center rounded-full bg-[#f5efe2] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:rotate-12">
                    <svg className="size-3 text-[#8a6d35]" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <circle cx="8" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="hidden sm:inline tracking-[0.02em]">White Mode</span>
                  <span className="sm:hidden">Light</span>
                </>
              ) : (
                <>
                  <span className="relative flex size-4 items-center justify-center rounded-full bg-[#0e1525] border border-[#1e3454] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:-rotate-12">
                    <svg className="size-3 text-[#3b8ef4]" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M13.4 9.9A5.7 5.7 0 0 1 6.1 2.6a5.7 5.7 0 1 0 7.3 7.3Z"
                        fill="currentColor"
                        fillOpacity="0.15"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="hidden sm:inline tracking-[0.02em]">Dark Mode</span>
                  <span className="sm:hidden">Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden sm:inline-flex items-center justify-between gap-5 rounded-xl border border-[#182438] bg-[#070d19] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-[#3b8ef4]/50 hover:text-zinc-200 cursor-pointer"
            >
              <span className="flex items-center gap-2 font-mono text-[11px]">
                <svg className="size-3.5 text-zinc-500" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.6 10.6 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Search ARCH...
              </span>
              <kbd className="rounded border border-[#182438] bg-[#04070e] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                ⌘K
              </kbd>
            </button>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="github-star-cta group relative hidden md:inline-flex h-9 items-center gap-2 overflow-hidden rounded-xl border border-[#182438] bg-[#070d19] px-3 text-xs font-semibold text-zinc-100 transition-all duration-300 hover:border-[#3b8ef4]/50"
            >
              <span className="inline-flex size-5 items-center justify-center rounded-md border border-[#182438] bg-[#04070e] text-zinc-200">
                <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
                  <path d="M8 0C3.58 0 0 3.58 0 8a8.01 8.01 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-[#182438] bg-[#04070e] px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-zinc-100">
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
              className="inline-flex items-center gap-2 rounded-lg border border-[#3b8ef4]/40 bg-[#3b8ef4]/15 px-3.5 py-2 text-xs font-medium text-white transition-all hover:border-[#3b8ef4] hover:bg-[#3b8ef4] hover:text-[#04070e]"
            >
              <span>Get Started</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Floating quick theme switch pill - polished White Mode / Dark Mode toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to White Mode' : 'Switch to Dark Mode'}
        className="group fixed bottom-5 right-5 z-[190] inline-flex items-center gap-2.5 rounded-full border border-[#1e3454]/80 bg-[#060a14]/90 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-wide text-zinc-200 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl transition-all duration-300 hover:border-[#3b8ef4]/50 hover:bg-[#0a1426]/95 hover:shadow-[0_12px_40px_-12px_rgba(59,142,244,0.35)] hover:scale-[1.04] active:scale-[0.97] cursor-pointer"
      >
        <span
          aria-hidden
          className="relative flex size-5 items-center justify-center rounded-full border transition-all duration-300 group-hover:rotate-12"
          style={{
            backgroundColor: theme === 'dark' ? '#faf6ee' : '#04070e',
            borderColor: theme === 'dark' ? '#c8b07d' : '#1e3454',
          }}
        >
          {theme === 'dark' ? (
            <svg className="size-3 text-[#8a6d35]" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.3 3.3l0.9 0.9M11.8 11.8l0.9 0.9M12.7 3.3l-0.9 0.9M4.2 11.8l-0.9 0.9"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg className="size-3 text-[#3b8ef4]" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M13.2 9.8A5.6 5.6 0 0 1 6.2 2.8a5.6 5.6 0 1 0 7 7Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="tracking-[0.02em]">{theme === 'dark' ? 'White Mode' : 'Dark Mode'}</span>
        <span
          aria-hidden
          className="ml-0.5 size-1 rounded-full bg-[#3b8ef4] opacity-60 transition-opacity group-hover:opacity-100"
        />
      </button>

      {/* Command K Modal */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-black/80 px-4 pt-24 backdrop-blur-sm"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="mk-modal w-full max-w-lg overflow-hidden rounded-2xl border border-[#182438] bg-[#060a14] shadow-[0_24px_72px_-24px_rgba(0,0,0,0.95)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#182438] px-4 py-3">
              <span className="font-mono text-xs text-[#3b8ef4]">⌘</span>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to section, robot, or workspace..."
                className="w-full bg-transparent font-mono text-xs text-white placeholder:text-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="rounded border border-[#182438] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:text-white"
              >
                ESC
              </button>
            </div>
            <div className="divide-y divide-[#111a2b] p-2">
              {filtered.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  onClick={() => setCmdOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#3b8ef4]/10"
                >
                  <div>
                    <div className="text-xs font-medium text-white">{item.title}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{item.subtitle}</div>
                  </div>
                  <span className="rounded border border-[#182438] bg-[#0a1222] px-2 py-0.5 font-mono text-[10px] text-[#3b8ef4]">
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
