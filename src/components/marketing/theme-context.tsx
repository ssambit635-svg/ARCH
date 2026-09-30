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
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as MarketingTheme | null;
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
        document.documentElement.setAttribute('data-mk-theme', saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        document.documentElement.setAttribute('data-mk-theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {
      document.documentElement.setAttribute('data-mk-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const setTheme = (next: MarketingTheme) => {
    if (next === theme) return;
    setIsTransitioning(true);

    // Smooth theme transition with View Transitions API if available
    const applyTheme = () => {
      setThemeState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-mk-theme', next);
        document.documentElement.setAttribute('data-theme', next);
        // Add class for CSS transitions
        document.documentElement.classList.add('mk-theme-transitioning');
        setTimeout(() => {
          document.documentElement.classList.remove('mk-theme-transitioning');
          setIsTransitioning(false);
        }, 420);
      }
    };

    // @ts-ignore - View Transition API
    if (typeof document !== 'undefined' && (document as any).startViewTransition) {
      // @ts-ignore
      (document as any).startViewTransition(() => {
        applyTheme();
      });
    } else {
      applyTheme();
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div
        data-theme={theme}
        className={`mk-theme-root ${theme === 'light' ? 'mk-light' : 'mk-dark'} ${isTransitioning ? 'mk-transitioning' : ''}`}
        style={{
          // Smooth theme transition
          transition: 'background-color 420ms cubic-bezier(0.22,1,0.36,1), color 420ms ease',
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  return useContext(ThemeContext);
}
