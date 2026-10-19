import type { ReactNode } from 'react';

/**
 * The public site is light-only and keeps its own token scope. The `mk-light` wrapper is what
 * applies the shipped palette to `.mk`; the console is unaffected and stays graphite.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return <div className="mk-light arch-marketing-surface relative min-h-screen">{children}</div>;
}
