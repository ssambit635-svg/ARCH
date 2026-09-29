'use client';

import { useEffect, useState } from 'react';
import { formatCompactCount } from '@/lib/format';

/**
 * The live star count shown in the header's GitHub pill.
 *
 * The number is GitHub's real stargazer count for this repository, fetched from our own
 * `/api/github-stars` (see repoStars.service.ts) — nothing here is a fallback figure. While the
 * page stays open it is re-read every STAR_POLL_MS, and again as soon as a background tab comes
 * back into view, so the pill follows the repository without a reload.
 *
 * States:
 *   loading      a small skeleton, so the pill does not flash a wrong or empty value
 *   ready        the real count ("1", "999", "1.2k", …)
 *   unavailable  the plain word "Star" — GitHub could not be asked (private repository without a
 *                token, rate limit, offline). Never a made-up number. Once a real count has been
 *                shown, a failed refresh keeps showing it rather than dropping to "Star".
 */

/** How often an open page re-reads the count. The server reuses a GitHub reading for 5 minutes. */
export const STAR_POLL_MS = 2 * 60_000;
/** The server gives GitHub at most ~8 s; a read that takes longer than this is abandoned. */
const READ_TIMEOUT_MS = 15_000;

const ENDPOINT = '/api/github-stars';

type StarState = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; stars: number };

const keepReadyOrUnavailable = (current: StarState): StarState => (current.status === 'ready' ? current : { status: 'unavailable' });

function useGithubStars(): StarState {
  const [state, setState] = useState<StarState>({ status: 'loading' });

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let lastAttemptAt = 0;
    let current: AbortController | null = null;

    async function load(): Promise<void> {
      // Single-flight: a slow read is allowed to finish instead of being raced (and its answer thrown
      // away) by the next tick. READ_TIMEOUT_MS keeps a hung request from blocking every later one.
      if (inFlight) return;
      inFlight = true;
      lastAttemptAt = Date.now();
      const own = new AbortController();
      current = own;
      const timeout = window.setTimeout(() => own.abort(), READ_TIMEOUT_MS);
      try {
        const response = await fetch(ENDPOINT, { cache: 'no-store', signal: own.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { data?: { stars?: unknown } };
        if (disposed) return;
        const stars = body.data?.stars;
        if (typeof stars === 'number' && Number.isFinite(stars) && stars >= 0) setState({ status: 'ready', stars });
        else setState(keepReadyOrUnavailable);
      } catch {
        if (disposed) return;
        setState(keepReadyOrUnavailable);
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
      }
    }

    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, STAR_POLL_MS);
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastAttemptAt >= STAR_POLL_MS) void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      current?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return state;
}

export function GithubStarCount() {
  const state = useGithubStars();

  if (state.status === 'ready') {
    const exact = state.stars.toLocaleString('en-US');
    return (
      <span title={`${exact} ${state.stars === 1 ? 'star' : 'stars'} on GitHub`}>
        <span className="sr-only">GitHub stars: </span>
        {formatCompactCount(state.stars)}
      </span>
    );
  }

  if (state.status === 'loading') {
    return (
      <>
        <span aria-hidden className="inline-block h-3 w-4 animate-pulse rounded-sm bg-zinc-700/70" />
        <span className="sr-only">Star on GitHub</span>
      </>
    );
  }

  return (
    <span>
      Star<span className="sr-only"> on GitHub</span>
    </span>
  );
}
