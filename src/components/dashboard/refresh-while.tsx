'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Revalidates the current page every `intervalMs` while `active` is true. Used on the ARCH Model
 * page to follow a background training job (queued → running → promoted/rejected) without the
 * responder having to refresh by hand.
 */
export function RefreshWhile({ active, intervalMs = 3000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, router]);
  return null;
}
