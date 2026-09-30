'use client';

import type { ReactNode } from 'react';
import { useLenis } from './use-lenis';
import { MarketingThemeProvider } from './theme-context';

/**
 * Small marketing shell: supports both Premium Blue Dark Mode and White / Cream Light Mode,
 * restrained smooth wheel scrolling, and no blocking boot sequence or replacement cursor.
 * Optimized for buttery smooth video playback like old ARCH reveal.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  useLenis(true);

  return (
    <MarketingThemeProvider>
      <div className="arch-marketing-surface relative min-h-screen">{children}</div>
    </MarketingThemeProvider>
  );
}
