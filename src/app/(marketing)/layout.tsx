import type { ReactNode } from 'react';
import '@/components/marketing/landing.css';
import { SiteChrome } from '@/components/marketing/site-chrome';

/** Marketing styling and theme are isolated from the authenticated console. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
