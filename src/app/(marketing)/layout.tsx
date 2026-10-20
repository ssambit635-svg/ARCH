import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/components/marketing/landing.css';
// The action surface loads after the page sheet: its palette and the label rules that outrank the
// prose `color: inherit` live there, so a pill is always a white fill with a visible ink label.
import '@/components/marketing/actions.css';
import { SiteChrome } from '@/components/marketing/site-chrome';

/**
 * The root layout advertises the console's dark chrome; the public page is a light
 * paper surface, so this segment overrides the browser chrome to match what a
 * visitor actually sees instead of flashing the app's near-black.
 */
export const viewport: Viewport = {
  themeColor: '#f6f4ef',
  colorScheme: 'light',
};

/** Marketing styling and theme are isolated from the authenticated console. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
