'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type MarketingTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: MarketingTheme;
  toggleTheme: () => void;
  setTheme: (theme: MarketingTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'arch-marketing-theme';

/** Theme tokens are scoped to marketing, so navigating into the console cannot restyle it. */
export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MarketingTheme>('dark');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
    } catch {
      // The default remains usable when browser storage is unavailable.
    }
  }, []);

  const setTheme = (next: MarketingTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Theme switching still works without persistence.
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }}>
      <div data-theme={theme} className={`mk-theme-root ${theme === 'light' ? 'mk-light' : 'mk-dark'}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  return useContext(ThemeContext);
}
