import type { ReactNode } from 'react';
import { MarketingThemeProvider } from './theme-context';

/** Marketing-only theme. Native scrolling keeps navigation and keyboard focus predictable. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <MarketingThemeProvider>
      <div className="arch-marketing-surface relative min-h-screen">{children}</div>
    </MarketingThemeProvider>
  );
}
