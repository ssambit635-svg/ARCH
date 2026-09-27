'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Kbd } from '@/components/ui/kbd';
import { SeverityBadge } from '@/components/ui';

export type PaletteEntry =
  | { kind: 'page'; label: string; hint: string; href: string }
  | { kind: 'incident'; label: string; hint: string; href: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; status: string }
  | { kind: 'service'; label: string; hint: string; href: string; status: string }
  | { kind: 'action'; label: string; hint: string; href: string };

/**
 * ⌘K command palette — jump to pages, incidents and services without touching the mouse.
 * Entries are rendered server-side into the shell; filtering happens locally.
 */
export function CommandPalette({ open, onClose, entries }: { open: boolean; onClose: () => void; entries: PaletteEntry[] }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? entries.filter((entry) => `${entry.label} ${entry.hint}`.toLowerCase().includes(q))
      : entries;
    return filtered.slice(0, 12);
  }, [query, entries]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open ]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const groups: { kind: PaletteEntry['kind']; title: string }[] = [
    { kind: 'action', title: 'Actions' },
    { kind: 'incident', title: 'Incidents' },
    { kind: 'service', title: 'Services' },
    { kind: 'page', title: 'Pages' },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="layer-shadow w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-white/10 bg-abyss-850">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5L17 17" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (event.key === 'Enter') {
                const hit = results[index];
                if (hit) go(hit.href);
              } else if (event.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Jump to an incident, service, or page…"
            className="w-full bg-transparent py-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            aria-label="Search"
          />
          <Kbd>esc</Kbd>
        </div>

        <div className="scroll-thin max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              Nothing matches “{query}”. Try an incident title, a service name, or a page.
            </p>
          ) : (
            groups.map((group) => {
              const items = results.filter((entry) => entry.kind === group.kind);
              if (items.length === 0) return null;
              return (
                <div key={group.kind} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{group.title}</p>
                  {items.map((entry) => {
                    const flatIndex = results.indexOf(entry);
                    const selected = flatIndex === index;
                    return (
                      <button
                        key={`${entry.kind}-${entry.href}-${entry.label}`}
                        type="button"
                        onClick={() => go(entry.href)}
                        onMouseEnter={() => setIndex(flatIndex)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${selected ? 'bg-white/[0.07]' : ''}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-100">{entry.label}</span>
                          <span className="block truncate text-xs text-slate-500">{entry.hint}</span>
                        </span>
                        {entry.kind === 'incident' ? <SeverityBadge severity={entry.severity} /> : null}
                        {entry.kind === 'service' ? (
                          <span className="arch-mono text-[11px] text-slate-500">{entry.status}</span>
                        ) : null}
                        {selected ? <span className="text-xs text-slate-500">↵</span> : null}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-white/[0.07] bg-white/[0.015] px-4 py-2.5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> open
          </span>
          <span className="ml-auto arch-mono">ARCH ⌘K</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
