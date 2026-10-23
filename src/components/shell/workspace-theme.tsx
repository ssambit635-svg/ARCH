'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { serializeWorkspaceTheme, type WorkspaceThemePreference } from './theme-preferences';

const ThemeContext = createContext<{
  preference: WorkspaceThemePreference;
  dark: boolean;
  setPreference: (preference: WorkspaceThemePreference) => void;
} | null>(null);

const subscribeToScheme = (callback: () => void) => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
const systemIsDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const serverIsDark = () => false;

/** CSS resolves system appearance before hydration; the cookie renders explicit choices on the server. */
export function WorkspaceTheme({
  children,
  initialPreference,
  className = '',
}: {
  children: ReactNode;
  initialPreference: WorkspaceThemePreference;
  className?: string;
}) {
  const [preference, updatePreference] = useState(initialPreference);
  const prefersDark = useSyncExternalStore(subscribeToScheme, systemIsDark, serverIsDark);
  const setPreference = useCallback((next: WorkspaceThemePreference) => {
    updatePreference(next);
    try {
      document.cookie = serializeWorkspaceTheme(next, window.location.protocol === 'https:');
    } catch {
      // Appearance still changes for this visit if preference cookies are blocked.
    }
  }, []);
  const value = useMemo(
    () => ({
      preference,
      dark: preference === 'dark' || (preference === 'system' && prefersDark),
      setPreference,
    }),
    [preference, prefersDark, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className={`workspace-theme ${className}`} data-theme={preference}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/** Portalled dialogs and notifications inherit the active workspace theme, not the public site's theme. */
export function WorkspacePortal({ children }: { children: ReactNode }) {
  const theme = useContext(ThemeContext);
  return createPortal(
    theme ? (
      <div className="workspace-theme workspace-portal" data-theme={theme.preference}>
        {children}
      </div>
    ) : (
      children
    ),
    document.body,
  );
}

export function ThemeToggle({
  compact = false,
  menuItem = false,
}: {
  compact?: boolean;
  menuItem?: boolean;
}) {
  const theme = useContext(ThemeContext);
  if (!theme) return null;
  const label = theme.dark ? 'Use light theme' : 'Use dark theme';
  return (
    <button
      type="button"
      className={`${menuItem ? 'arch-popover-link workspace-theme-menu-item' : 'workspace-theme-toggle'}${compact ? ' is-compact' : ''}`}
      role={menuItem ? 'menuitem' : undefined}
      tabIndex={menuItem ? -1 : undefined}
      onClick={() => theme.setPreference(theme.dark ? 'light' : 'dark')}
      aria-label={
        compact || menuItem
          ? label
          : `${theme.dark ? 'Dark appearance' : 'Light appearance'}. ${label}`
      }
      title={label}
      aria-pressed={menuItem ? undefined : theme.dark}
    >
      <svg
        viewBox="0 0 20 20"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {theme.dark ? (
          <>
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4" />
          </>
        ) : (
          <path d="M16.9 12A7.2 7.2 0 0 1 8 3.1 7.2 7.2 0 1 0 16.9 12Z" />
        )}
      </svg>
      {!compact ? (
        <span>{menuItem ? label : theme.dark ? 'Dark appearance' : 'Light appearance'}</span>
      ) : null}
    </button>
  );
}

export function SystemThemeButton() {
  const theme = useContext(ThemeContext);
  if (!theme) return null;
  return (
    <button
      type="button"
      className="arch-popover-link"
      role="menuitemcheckbox"
      tabIndex={-1}
      onClick={() => theme.setPreference('system')}
      aria-checked={theme.preference === 'system'}
    >
      Use device appearance{theme.preference === 'system' ? ' ✓' : ''}
    </button>
  );
}
