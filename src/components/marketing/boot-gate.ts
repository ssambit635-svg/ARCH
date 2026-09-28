'use client';

import { createContext, useContext } from 'react';

/**
 * Boot gate.
 *
 * The hero sits in the viewport on first paint, so its IntersectionObserver fires immediately —
 * which means the headline's line-mask reveal and the scramble decode both ran to completion behind
 * the boot curtain, and the visitor saw a fully-settled hero when it lifted. The most expensive
 * moment on the page was happening where nobody could watch it.
 *
 * Reveals therefore wait for this flag. The default is `true` so that any tree which does not wrap
 * itself in a provider (the dashboard, the public status page) is unaffected: those surfaces have
 * no curtain and must never be gated.
 */
const BootContext = createContext(true);

export const BootProvider = BootContext.Provider;

export function useBooted(): boolean {
  return useContext(BootContext);
}
