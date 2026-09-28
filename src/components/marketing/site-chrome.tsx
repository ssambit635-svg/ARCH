'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLenis } from './use-lenis';
import { Cursor } from './cursor';
import { Preloader } from './preloader';
import { BootProvider } from './boot-gate';

/**
 * Marketing chrome — everything that has to exist once for the whole surface:
 * smooth scroll, the custom cursor, the boot curtain, and the grain layer.
 *
 * Kept separate from the page so the page itself stays a server component and ships no JS beyond
 * the sections that genuinely need it.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Lenis stays off until the curtain lifts, otherwise it fights the body scroll-lock and the page
  // eases a few pixels on reveal.
  useLenis(booted || reduced);

  return (
    <BootProvider value={booted}>
      <div className="arch-grain relative min-h-screen bg-ink-1000">
        <Preloader onComplete={() => setBooted(true)} />
        <Cursor />
        {children}
      </div>
    </BootProvider>
  );
}
