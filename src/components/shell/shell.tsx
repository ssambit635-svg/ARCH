'use client';

import { useCallback, useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toast';
import { SidebarBrand, SidebarNav } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette, type PaletteEntry } from './command-palette';

/**
 * Dashboard shell — sidebar + topbar + ⌘K palette + toast stack.
 * Server layout feeds it data; all interactivity lives here.
 */
export function Shell({
  children,
  organizations,
  currentOrg,
  statusSlug,
  user,
  role,
  openIncidents,
  paletteEntries,
}: {
  children: React.ReactNode;
  organizations: { id: string; name: string; role: string }[];
  currentOrg: string;
  statusSlug: string;
  user: { email: string; name: string | null };
  role: string;
  openIncidents: number;
  paletteEntries: PaletteEntry[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const togglePalette = useCallback(() => setPaletteOpen((value) => !value), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePalette]);

  return (
    <div className="relative min-h-screen">
      <div className="arch-backdrop pointer-events-none fixed inset-0" aria-hidden />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.06] bg-abyss-900/80 backdrop-blur lg:flex">
        <SidebarBrand />
        <SidebarNav openIncidents={openIncidents} />
        <div className="border-t border-white/[0.06] px-5 py-3.5">
          <p className="arch-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">ARCH · on-prem ready</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-slide-in-right flex-col border-r border-white/10 bg-abyss-900">
            <SidebarBrand />
            <SidebarNav openIncidents={openIncidents} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="relative flex min-h-screen min-w-0 flex-col lg:pl-[248px]">
        <Topbar
          organizations={organizations}
          currentOrg={currentOrg}
          statusSlug={statusSlug}
          user={user}
          role={role}
          onMenu={() => setMenuOpen(true)}
          onSearch={() => setPaletteOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-white/[0.05] px-6 py-4 lg:px-8">
          <p className="mx-auto max-w-[1200px] text-xs text-slate-600">
            Every write is audited · Status colors mean status — nothing else
          </p>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />
      <Toaster />
    </div>
  );
}
