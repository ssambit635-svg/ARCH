import type { ReactNode } from 'react';
import { SiteChrome } from '@/components/marketing/site-chrome';

/**
 * Marketing surface.
 *
 * A separate layout from the dashboard on purpose: Lenis, the cursor and the boot curtain belong to
 * the public story, and none of them should run inside an authenticated console where a scroll
 * transform would fight with dialogs, tables and focus traps.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
