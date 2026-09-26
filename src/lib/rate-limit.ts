import { AppError } from './errors';

/**
 * Fixed-window rate limiting.
 *
 * Deliberately in-process and dependency-free for v1 (see features.md — no Redis until volume
 * demands it). It protects login, registration, webhook ingestion and public endpoints from
 * casual abuse. With more than one web process, limits become per-process; that limitation is
 * documented in docs/engineering/ARCHITECTURE.md.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, options: { limit: number; windowMs: number; now?: number }): RateLimitResult {
  const now = options.now ?? Date.now();
  // Expired keys are only removed when something touches them. A long-lived process otherwise
  // keeps one entry per IP/email forever. Prune once the map is large enough to matter.
  if (buckets.size > 256) pruneRateLimits(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + options.windowMs };
    buckets.set(key, bucket);
    return { ok: true, limit: options.limit, remaining: options.limit - 1, resetAt: bucket.resetAt, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, options.limit - existing.count);
  const ok = existing.count <= options.limit;

  return {
    ok,
    limit: options.limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Throws a 429 (with Retry-After details) when the key is over its limit. */
export function enforceRateLimit(key: string, options: { limit: number; windowMs: number; now?: number }): RateLimitResult {
  const result = rateLimit(key, options);
  if (!result.ok) {
    throw AppError.rateLimited('Too many requests — slow down and try again shortly.', {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return result;
}

/** Housekeeping for long-running processes; also used by tests. */
export function pruneRateLimits(now = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}
