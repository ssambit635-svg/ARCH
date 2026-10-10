'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { SidebarBrand, SidebarNav } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette, type PaletteEntry } from './command-palette';
import { isSidebarToggleShortcut, serializeSidebarPreference } from './sidebar-preferences';

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
  initialSidebarVisible,
}: {
  children: React.ReactNode;
  organizations: { id: string; name: string; role: string }[];
  currentOrg: string;
  statusSlug: string;
  user: { email: string; name: string | null };
  role: string;
  openIncidents: number;
  paletteEntries: PaletteEntry[];
  initialSidebarVisible: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(initialSidebarVisible);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const togglePalette = useCallback(() => setPaletteOpen((value) => !value), []);
  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarVisible((visible) => {
      const nextVisible = !visible;
      try {
        document.cookie = serializeSidebarPreference(nextVisible, window.location.protocol === 'https:');
      } catch {
        // The navigation still works when browser cookie storage is unavailable.
      }
      return nextVisible;
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (window.innerWidth >= 1024 && isSidebarToggleShortcut(event)) {
        event.preventDefault();
        toggleDesktopSidebar();
        return;
      }
      if (menuOpen) return;

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
  }, [menuOpen, pathname, toggleDesktopSidebar, togglePalette]);

  // The mobile navigation is a real modal drawer: lock the page behind it, keep keyboard focus
  // inside, close on Escape, and return focus to the opener when the drawer closes.
  useEffect(() => {
    if (!menuOpen) return;

    const dialog = mobileNavigationRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    const activeElement = document.activeElement;
    returnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : mobileMenuButtonRef.current;
    document.body.style.overflow = 'hidden';

    const getFocusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.closest('[aria-hidden="true"]'));

    dialog.querySelector<HTMLElement>('[data-mobile-navigation-close]')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const focusIsInside = dialog.contains(document.activeElement);
      if (event.shiftKey && (!focusIsInside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusIsInside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      const focusTarget = returnFocusRef.current;
      if (focusTarget?.isConnected) focusTarget.focus();
      else mobileMenuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  useEffect(() => {
    const closeDrawerAtDesktopWidth = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener('resize', closeDrawerAtDesktopWidth);
    return () => window.removeEventListener('resize', closeDrawerAtDesktopWidth);
  }, []);

  return (
    <div className="arch-product-shell relative min-h-screen">
      <div className="arch-product-backdrop" aria-hidden />

      {/* Desktop navigation can be fully hidden to give the active workspace more room. */}
      {desktopSidebarVisible ? (
        <aside id="arch-desktop-navigation" className="arch-product-sidebar" aria-label="Workspace navigation">
          <SidebarBrand />
          <SidebarNav openIncidents={openIncidents} />
          <div className="arch-sidebar-status">
            <span className="arch-sidebar-status-dot" aria-hidden />
            <span>ARCH · on-prem ready</span>
          </div>
        </aside>
      ) : null}

      {/* Mobile navigation drawer */}
      {menuOpen ? (
        <div
          ref={mobileNavigationRef}
          id="arch-mobile-navigation"
          className="arch-mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
          tabIndex={-1}
        >
          <button
            type="button"
            className="arch-mobile-navigation-backdrop"
            onClick={() => setMenuOpen(false)}
            tabIndex={-1}
            aria-hidden="true"
          />
          <aside className="arch-product-sidebar arch-product-sidebar--mobile" aria-label="Workspace navigation">
            <button
              type="button"
              className="arch-mobile-navigation-close"
              data-mobile-navigation-close
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
              title="Close navigation"
            >
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
            <SidebarBrand onNavigate={() => setMenuOpen(false)} />
            <SidebarNav openIncidents={openIncidents} onNavigate={() => setMenuOpen(false)} />
            <div className="arch-sidebar-status">
              <span className="arch-sidebar-status-dot" aria-hidden />
              <span>ARCH · on-prem ready</span>
            </div>
          </aside>
        </div>
      ) : null}

      <div className={`arch-product-main${desktopSidebarVisible ? ' arch-product-main--sidebar-visible' : ''}`}>
        <Topbar
          organizations={organizations}
          currentOrg={currentOrg}
          statusSlug={statusSlug}
          user={user}
          role={role}
          sidebarVisible={desktopSidebarVisible}
          onToggleSidebar={toggleDesktopSidebar}
          mobileMenuOpen={menuOpen}
          mobileMenuButtonRef={mobileMenuButtonRef}
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
