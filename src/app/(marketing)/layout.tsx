import type { ReactNode } from 'react';
import '@/components/marketing/landing.css';
import { SiteChrome } from '@/components/marketing/site-chrome';

/**
 * Marketing surface.
 *
 * Keep marketing-only styling and Lenis in this layout so they never leak into the authenticated
 * console, where smooth-scroll transforms would fight with dialogs, tables and focus traps. The
 * marketing page intentionally has no boot curtain or replacement cursor.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
