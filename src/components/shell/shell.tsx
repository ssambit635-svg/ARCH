'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PRODUCT_VERSION } from '@/lib/brand';
import type { PublishedStatusPage } from '@/lib/workspace-view';
import { WorkspaceTheme, ThemeToggle } from './workspace-theme';
import type { WorkspaceThemePreference } from './theme-preferences';
import { Toaster } from '@/components/ui/toast';
import { SidebarBrand, SidebarNav } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette, type PaletteEntry } from './command-palette';
import { useCharacterShortcuts } from '@/components/ui/workspace-keyboard-preferences';
import { ShortcutGuide } from './shortcut-guide';
import { isShortcutHelpShortcut, isWorkspaceSearchShortcut } from '@/lib/workspace-shortcuts';
import { isSidebarToggleShortcut, serializeSidebarPreference } from './sidebar-preferences';

/**
 * Shared product shell. Navigation stays quiet so the incident workspace and its data lead.
 * Server layout feeds it data; all interactivity lives here.
 */
export function Shell({
  children,
  organizations,
  currentOrg,
  statusPage,
  canDeclareIncident,
  canReadAudit,
  initialTheme,
  user,
  role,
  openIncidents,
  paletteEntries,
  initialSidebarVisible,
}: {
  children: React.ReactNode;
  organizations: { id: string; name: string; role: string }[];
  currentOrg: string;
  statusPage: PublishedStatusPage;
  canDeclareIncident: boolean;
  canReadAudit: boolean;
  initialTheme: WorkspaceThemePreference;
  user: { email: string; name: string | null };
  role: string;
  openIncidents: number;
  paletteEntries: PaletteEntry[];
  initialSidebarVisible: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(initialSidebarVisible);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const characterShortcuts = useCharacterShortcuts();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const togglePalette = useCallback(() => setPaletteOpen((value) => !value), []);
  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarVisible((visible) => {
      const nextVisible = !visible;
      try {
        document.cookie = serializeSidebarPreference(
          nextVisible,
          window.location.protocol === 'https:',
        );
      } catch {
        // The navigation still works when browser cookie storage is unavailable.
      }
      return nextVisible;
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.keyCode === 229 ||
        paletteOpen ||
        menuOpen ||
        shortcutsOpen ||
        (event.target instanceof Element && event.target.closest('[role="dialog"], [role="menu"]'))
      )
        return;
      if (window.innerWidth >= 1024 && isSidebarToggleShortcut(event)) {
        event.preventDefault();
        toggleDesktopSidebar();
        return;
      }
      if (characterShortcuts && isShortcutHelpShortcut(event)) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (isWorkspaceSearchShortcut(event)) {
        event.preventDefault();
        togglePalette();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    characterShortcuts,
    menuOpen,
    paletteOpen,
    shortcutsOpen,
    toggleDesktopSidebar,
    togglePalette,
  ]);

  // The mobile navigation is a real modal drawer: lock the page behind it, keep keyboard focus
  // inside, close on Escape, and return focus to the opener when the drawer closes.
  useEffect(() => {
    if (!menuOpen) return;

    const dialog = mobileNavigationRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    const activeElement = document.activeElement;
    returnFocusRef.current =
      activeElement instanceof HTMLElement ? activeElement : mobileMenuButtonRef.current;
    document.body.style.overflow = 'hidden';

    const getFocusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          element.getClientRects().length > 0 &&
          !element.closest('[aria-hidden="true"]'),
      );

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
    <WorkspaceTheme
      initialPreference={initialTheme}
      className="arch-product-shell relative min-h-screen"
    >
      <a href="#workspace-main" className="workspace-skip-link">
        Skip to workspace
      </a>
      <div className="arch-product-backdrop" aria-hidden />

      {/* Desktop navigation can be fully hidden to give the active workspace more room. */}
      {desktopSidebarVisible ? (
        <aside
          id="arch-desktop-navigation"
          className="arch-product-sidebar"
          aria-label="Workspace navigation"
        >
          <SidebarBrand />
          <SidebarNav canReadAudit={canReadAudit} openIncidents={openIncidents} />
          <div className="workspace-sidebar-footer">
            <ThemeToggle />
            <button
              type="button"
              className="workspace-shortcut-trigger"
              onClick={() => setShortcutsOpen(true)}
              aria-haspopup="dialog"
              aria-keyshortcuts={characterShortcuts ? '?' : undefined}
            >
              <span aria-hidden="true">⌨</span>Keyboard shortcuts{' '}
              <span className="workspace-shortcut-trigger-key" aria-hidden="true">
                {characterShortcuts ? '?' : 'Help'}
              </span>
            </button>
            <p>
              Early access <span aria-hidden="true">·</span> v{PRODUCT_VERSION}
            </p>
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
          <aside
            className="arch-product-sidebar arch-product-sidebar--mobile"
            aria-label="Workspace navigation"
          >
            <button
              type="button"
              className="arch-mobile-navigation-close"
              data-mobile-navigation-close
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
              title="Close navigation"
            >
              <svg
                viewBox="0 0 20 20"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
            <SidebarBrand onNavigate={() => setMenuOpen(false)} />
            <SidebarNav
              canReadAudit={canReadAudit}
              openIncidents={openIncidents}
              onNavigate={() => setMenuOpen(false)}
            />
            <div className="workspace-sidebar-footer">
              <ThemeToggle />
              <p>
                Early access <span aria-hidden="true">·</span> v{PRODUCT_VERSION}
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      <div
        inert={menuOpen}
        className={`arch-product-main${desktopSidebarVisible ? ' arch-product-main--sidebar-visible' : ''}`}
      >
        <Topbar
          organizations={organizations}
          currentOrg={currentOrg}
          statusPage={statusPage}
          canDeclareIncident={canDeclareIncident}
          user={user}
          role={role}
          sidebarVisible={desktopSidebarVisible}
          onToggleSidebar={toggleDesktopSidebar}
          mobileMenuOpen={menuOpen}
          mobileMenuButtonRef={mobileMenuButtonRef}
          onMenu={() => setMenuOpen(true)}
          onSearch={() => setPaletteOpen(true)}
          onShortcuts={() => setShortcutsOpen(true)}
        />
        <main id="workspace-main" tabIndex={-1} className="arch-product-content">
          {children}
        </main>
        <footer className="arch-product-footer">
          <p>
            Self-hosted incident response <span aria-hidden>·</span> Assistance stays human-reviewed
          </p>
        </footer>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        entries={paletteEntries}
      />
      <ShortcutGuide open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toaster />
    </WorkspaceTheme>
  );
}
