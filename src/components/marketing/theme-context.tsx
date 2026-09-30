'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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

export function MarketingThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<MarketingTheme>('dark');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as MarketingTheme | null;
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
        document.documentElement.setAttribute('data-mk-theme', saved);
      } else {
        document.documentElement.setAttribute('data-mk-theme', 'dark');
      }
    } catch {
      document.documentElement.setAttribute('data-mk-theme', 'dark');
    }
  }, []);

  const setTheme = (next: MarketingTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-mk-theme', next);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div data-theme={theme} className={`mk-theme-root ${theme === 'light' ? 'mk-light' : 'mk-dark'}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  return useContext(ThemeContext);
}
