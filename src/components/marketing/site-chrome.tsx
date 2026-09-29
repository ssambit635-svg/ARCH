'use client';

import type { ReactNode } from 'react';
import { useLenis } from './use-lenis';

/**
 * Small marketing shell: native-looking dark surfaces, restrained smooth wheel scrolling, and no
 * blocking boot sequence or replacement cursor. The product demo itself carries the interaction.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  useLenis(true);

  return <div className="arch-marketing-surface relative min-h-screen bg-ink-1000">{children}</div>;
}
