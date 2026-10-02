'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { SidebarBrand, SidebarNav } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette, type PaletteEntry } from './command-palette';

/**
 * Shared product shell. Navigation stays quiet so the incident workspace and its data lead.
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
  const pathname = usePathname();

  const togglePalette = useCallback(() => setPaletteOpen((value) => !value), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // The chat workspace uses ⌘K / Ctrl+K for conversation search; the clickable global search
      // button remains available there for the command palette.
      if (pathname === '/dashboard/chat') return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePalette, pathname]);

  return (
    <div className="arch-product-shell relative min-h-screen">
      <div className="arch-product-backdrop" aria-hidden />

      {/* Desktop product navigation */}
      <aside className="arch-product-sidebar">
        <SidebarBrand />
        <SidebarNav openIncidents={openIncidents} />
        <div className="arch-sidebar-status">
          <span className="arch-sidebar-status-dot" aria-hidden />
          <span>ARCH · on-prem ready</span>
        </div>
      </aside>

      {/* Mobile navigation drawer */}
      {menuOpen ? (
        <div className="arch-mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="arch-mobile-navigation-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="arch-product-sidebar arch-product-sidebar--mobile">
            <SidebarBrand />
            <SidebarNav openIncidents={openIncidents} onNavigate={() => setMenuOpen(false)} />
            <div className="arch-sidebar-status">
              <span className="arch-sidebar-status-dot" aria-hidden />
              <span>ARCH · on-prem ready</span>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="arch-product-main">
        <Topbar
          organizations={organizations}
          currentOrg={currentOrg}
          statusSlug={statusSlug}
          user={user}
          role={role}
          onMenu={() => setMenuOpen(true)}
          onSearch={() => setPaletteOpen(true)}
        />
        <main className="arch-product-content">{children}</main>
        <footer className="arch-product-footer">
          <p>Every write is audited <span aria-hidden>·</span> Status colors mean status — nothing else</p>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />
      <Toaster />
    </div>
  );
}
