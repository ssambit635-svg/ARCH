import { z } from 'zod';
import packageJson from '../../../package.json';
import { GITHUB_REPO } from '@/lib/brand';
import { env, isPlaceholderSecret } from '@/lib/env';

/**
 * Live GitHub star count for the landing page — the number in the header's "★" pill.
 *
 * Why this exists: that pill used to carry a hard-coded number, i.e. a claim nobody was keeping
 * true. The count now comes from GitHub itself, so it is the repository's real stargazer count and
 * it moves when people star (or un-star) the repository.
 *
 * Rules this file keeps:
 *   - Never invent a number. If GitHub cannot be asked (offline, rate limited, or a private
 *     repository without a token) the answer is `null` and the UI shows a plain "Star" label.
 *   - Be a good API citizen. Anonymous callers get 60 requests/hour per IP, so a good reading is
 *     reused for STARS_FRESH_MS however many visitors ask, concurrent lookups share one request,
 *     and a failed lookup is not retried for STARS_RETRY_MS.
 *   - A failed refresh keeps serving the last good reading (stale-if-error) instead of blanking
 *     the badge on a GitHub hiccup.
 *   - GITHUB_MODE="mock" means "no network at all" (tests, CI, air-gapped demos): no request is made.
 *   - GITHUB_TOKEN (optional) authenticates the request. That is what lets a *private* repository
 *     be read and it lifts the anonymous rate limit. It is only ever sent to GITHUB_API_BASE_URL and
 *     never leaves the server. A revoked/expired token falls back to an anonymous request.
 */

/** A good reading is reused this long before GitHub is asked again (12 requests/hour at most). */
export const STARS_FRESH_MS = 5 * 60_000;
/** After a failed lookup, wait this long before asking GitHub again. */
export const STARS_RETRY_MS = 60_000;
/** A landing-page badge is never worth a long wait: cap the upstream call. */
const MAX_LOOKUP_MS = 8_000;

const repoSchema = z.object({ stargazers_count: z.number().int().nonnegative() });

export type RepoStars = {
  /** null = unknown. The UI must then show no number at all — never a made-up one. */
  stars: number | null;
  /** When GitHub last confirmed `stars` (ISO 8601), or null when unknown. */
  fetchedAt: string | null;
};

export type StarLookup = { ok: true; stars: number } | { ok: false; reason: string };

export type StarLookupOptions = {
  /** `owner/name` */
  repo: string;
  /** e.g. https://api.github.com */
  baseUrl: string;
  token?: string | null;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
};

function describeFailure(status: number, headers: Headers, usedToken: boolean): string {
  if (status === 429 || (status === 403 && headers.get('x-ratelimit-remaining') === '0')) {
    return 'GitHub rate limit reached (set GITHUB_TOKEN for a higher limit)';
  }
  if (status === 404) {
    return usedToken
      ? 'repository not found (the configured GITHUB_TOKEN cannot see it)'
      : 'repository not found — if it is private, set GITHUB_TOKEN so ARCH can read it';
  }
  if (status === 401) return 'GitHub rejected GITHUB_TOKEN (401)';
  if (status === 403) return 'GitHub refused the request (403)';
  return `GitHub answered HTTP ${status}`;
}

/**
 * One lookup against GitHub's repository endpoint (a single request; if the token is rejected, one
 * more without it). Never throws: every failure is returned as data so the caller can keep serving
 * what it already knows.
 */
export async function lookupStargazers(options: StarLookupOptions): Promise<StarLookup> {
  const doFetch = options.fetchImpl ?? fetch;
  const repoPath = options.repo.split('/').map(encodeURIComponent).join('/');
  const url = `${options.baseUrl.replace(/\/+$/, '')}/repos/${repoPath}`;

  // One deadline for the whole lookup, including the anonymous retry below.
  const signal = AbortSignal.timeout(options.timeoutMs);
  const request = (token: string | null | undefined) =>
    doFetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': `arch-landing/${packageJson.version}`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Caching is this module's job (see getRepoStars); Next's fetch cache must not add a second layer.
      cache: 'no-store',
      signal,
    });

  try {
    let response = await request(options.token);
    let tokenRejected = false;
    // A revoked or expired PAT must not blank the badge of a public repository: ask anonymously once.
    if (response.status === 401 && options.token) {
      tokenRejected = true;
      response = await request(null);
    }
    if (!response.ok) {
      const reason = tokenRejected
        ? 'GitHub rejected GITHUB_TOKEN (401) and the repository is not readable without it'
        : describeFailure(response.status, response.headers, Boolean(options.token));
      return { ok: false, reason };
    }

    const parsed = repoSchema.safeParse(await response.json());
    if (!parsed.success) return { ok: false, reason: 'GitHub returned an unexpected response' };
    return { ok: true, stars: parsed.data.stargazers_count };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    if (timedOut) return { ok: false, reason: 'GitHub did not answer in time' };
    // undici reports the network cause (ENOTFOUND, ECONNREFUSED, UNABLE_TO_VERIFY_LEAF_SIGNATURE, …)
    // as `error.cause.code`; naming it is what turns "unreachable" into something an operator can fix.
    const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
    return { ok: false, reason: `GitHub could not be reached${typeof code === 'string' ? ` (${code})` : ''}` };
  }
}

// ---------- cache ----------

type Reading = { stars: number; at: number };

let lastGood: Reading | null = null;
let lastAttemptAt = 0;
let lastAttemptFailed = false;
let lastFailureReason: string | null = null;
let inflight: Promise<void> | null = null;
let fetchOverride: typeof fetch | null = null;

/** A blank, whitespace, or `.env.example` placeholder token is "not configured". */
function activeToken(): string | null {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token || isPlaceholderSecret(token)) return null;
  return token;
}

async function refresh(): Promise<void> {
  lastAttemptAt = Date.now();
  let result: StarLookup;
  try {
    result = await lookupStargazers({
      repo: GITHUB_REPO,
      baseUrl: env.GITHUB_API_BASE_URL,
      token: activeToken(),
      timeoutMs: Math.min(env.GITHUB_TIMEOUT_MS, MAX_LOOKUP_MS),
      fetchImpl: fetchOverride ?? undefined,
    });
  } catch {
    result = { ok: false, reason: 'GitHub could not be reached' };
  }

  if (result.ok) {
    lastGood = { stars: result.stars, at: Date.now() };
    lastAttemptFailed = false;
    lastFailureReason = null;
    return;
  }

  lastAttemptFailed = true;
  // Log when the reason changes, not on every retry: a private repository without a token would
  // otherwise print the same line once a minute for as long as anyone visits the site.
  if (result.reason !== lastFailureReason) {
    lastFailureReason = result.reason;
    console.warn(`[stars] GitHub star count unavailable for ${GITHUB_REPO}: ${result.reason}`);
  }
}

const UNKNOWN: RepoStars = { stars: null, fetchedAt: null };

/** The repository's current star count, from GitHub, at most STARS_FRESH_MS old. Never throws. */
export async function getRepoStars(): Promise<RepoStars> {
  if (env.GITHUB_MODE === 'mock') return UNKNOWN;

  const now = Date.now();
  const fresh = lastGood !== null && now - lastGood.at < STARS_FRESH_MS;
  const coolingDown = lastAttemptFailed && now - lastAttemptAt < STARS_RETRY_MS;

  if (!fresh && !coolingDown) {
    inflight ??= refresh().finally(() => {
      inflight = null;
    });
    await inflight;
  }

  return lastGood ? { stars: lastGood.stars, fetchedAt: new Date(lastGood.at).toISOString() } : UNKNOWN;
}

export const _testing = {
  /** Forget everything and restore the real `fetch` (between tests). */
  reset(): void {
    lastGood = null;
    lastAttemptAt = 0;
    lastAttemptFailed = false;
    lastFailureReason = null;
    inflight = null;
    fetchOverride = null;
  },
  setFetch(impl: typeof fetch | null): void {
    fetchOverride = impl;
  },
};
