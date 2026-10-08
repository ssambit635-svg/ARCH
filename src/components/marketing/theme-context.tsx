'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type MarketingTheme = 'light';

interface ThemeContextValue {
  theme: MarketingTheme;
  toggleTheme: () => void;
  setTheme: (theme: MarketingTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

/**
 * Marketing is intentionally light-only. Keeping the provider means existing
 * consumers remain stable while preventing a dark-mode preference from changing
 * the visual language of the public site.
 */
export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const setTheme = (_next: MarketingTheme) => {
    // ARCH marketing has one deliberate visual mode: light.
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme, toggleTheme: () => {} }}>
      <div data-theme="light" className="mk-theme-root mk-light">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  return useContext(ThemeContext);
}
