import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/github-stars/route';
import { GITHUB_REPO } from '@/lib/brand';
import { env } from '@/lib/env';
import { formatCompactCount } from '@/lib/format';
import {
  STARS_FRESH_MS,
  STARS_RETRY_MS,
  _testing,
  getRepoStars,
  lookupStargazers,
} from '@/server/services/repoStars.service';

/**
 * The landing page's GitHub star badge used to be a hard-coded "2.4k". These tests pin the rules that
 * replaced it: the number is whatever GitHub says, it is never invented, and GitHub is asked politely.
 *
 * No test here touches the network: `fetch` is a stub that records what would have been sent.
 */

type Call = { url: string; headers: Record<string, string> };

function stubFetch(handler: (call: Call, index: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = { url: String(input), headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}) } };
    calls.push(call);
    return handler(call, calls.length - 1);
  }) as typeof fetch;
  return { impl, calls };
}

const repoJson = (stars: number) => new Response(JSON.stringify({ stargazers_count: stars, private: false }), { status: 200 });
const status = (code: number, headers: Record<string, string> = {}) => new Response('{}', { status: code, headers });

const lookup = (impl: typeof fetch, extra: { token?: string | null; baseUrl?: string } = {}) =>
  lookupStargazers({ repo: GITHUB_REPO, baseUrl: extra.baseUrl ?? 'https://api.github.com', token: extra.token ?? null, timeoutMs: 1_000, fetchImpl: impl });

describe('lookupStargazers — one honest question to GitHub', () => {
  it('reads stargazers_count from this repository and sends no credentials without a token', async () => {
    const { impl, calls } = stubFetch(() => repoJson(42));
    expect(await lookup(impl)).toEqual({ ok: true, stars: 42 });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`https://api.github.com/repos/${GITHUB_REPO}`);
    expect(calls[0]?.headers.Accept).toBe('application/vnd.github+json');
    expect(calls[0]?.headers['User-Agent']).toMatch(/^arch-landing\//); // GitHub rejects requests without a User-Agent
    expect(calls[0]?.headers).not.toHaveProperty('Authorization');
  });

  it('tolerates a trailing slash in GITHUB_API_BASE_URL', async () => {
    const { impl, calls } = stubFetch(() => repoJson(1));
    await lookup(impl, { baseUrl: 'https://ghe.example.com/api/v3/' });
    expect(calls[0]?.url).toBe(`https://ghe.example.com/api/v3/repos/${GITHUB_REPO}`);
  });

  it('authenticates with the token when there is one, and never echoes it back', async () => {
    const { impl, calls } = stubFetch(() => repoJson(7));
    const result = await lookup(impl, { token: 'ghp_testtoken0000000000000000000000000000000000' });
    expect(calls[0]?.headers.Authorization).toBe('Bearer ghp_testtoken0000000000000000000000000000000000');
    expect(JSON.stringify(result)).not.toContain('ghp_');
  });

  it('a private repository without a token is "unknown", and says how to fix it — it is never a made-up number', async () => {
    const { impl } = stubFetch(() => status(404));
    const result = await lookup(impl);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/private/i);
    expect(!result.ok && result.reason).toContain('GITHUB_TOKEN');
  });

  it('a token that cannot see the repository is reported as such', async () => {
    const { impl } = stubFetch(() => status(404));
    const result = await lookup(impl, { token: 'ghp_x' });
    expect(!result.ok && result.reason).toMatch(/cannot see it/);
  });

  it('a revoked token does not blank a public repository: it retries once, anonymously', async () => {
    const { impl, calls } = stubFetch((call) => (call.headers.Authorization ? status(401) : repoJson(9)));
    expect(await lookup(impl, { token: 'ghp_revoked' })).toEqual({ ok: true, stars: 9 });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.headers.Authorization).toBe('Bearer ghp_revoked');
    expect(calls[1]?.headers).not.toHaveProperty('Authorization');
  });

  it('a revoked token on a repository that is not public fails with a message that names the token', async () => {
    const { impl, calls } = stubFetch((call) => (call.headers.Authorization ? status(401) : status(404)));
    const result = await lookup(impl, { token: 'ghp_revoked' });
    expect(calls).toHaveLength(2);
    expect(!result.ok && result.reason).toMatch(/rejected GITHUB_TOKEN/);
  });

  it('recognises a rate limit', async () => {
    const { impl } = stubFetch(() => status(403, { 'x-ratelimit-remaining': '0' }));
    const result = await lookup(impl);
    expect(!result.ok && result.reason).toMatch(/rate limit/i);
    const tooMany = await lookup(stubFetch(() => status(429)).impl);
    expect(!tooMany.ok && tooMany.reason).toMatch(/rate limit/i);
  });

  it.each([
    ['a body without the field', {}],
    ['a string count', { stargazers_count: '1200' }],
    ['a negative count', { stargazers_count: -1 }],
    ['a fractional count', { stargazers_count: 1.5 }],
    ['null', null],
  ])('rejects %s instead of guessing', async (_label, body) => {
    const { impl } = stubFetch(() => new Response(JSON.stringify(body), { status: 200 }));
    const result = await lookup(impl);
    expect(result.ok).toBe(false);
  });

  it('turns a network failure into data and names its cause', async () => {
    const { impl } = stubFetch(() => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    });
    const result = await lookup(impl);
    expect(!result.ok && result.reason).toBe('GitHub could not be reached (ENOTFOUND)');
  });

  it('turns a timeout into data', async () => {
    const { impl } = stubFetch(() => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    const result = await lookup(impl);
    expect(!result.ok && result.reason).toMatch(/did not answer in time/);
  });
});

describe('getRepoStars — reuse, cooldown and stale-if-error', () => {
  const saved = { mode: env.GITHUB_MODE, token: env.GITHUB_TOKEN };
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    _testing.reset();
    env.GITHUB_MODE = 'auto';
    env.GITHUB_TOKEN = undefined;
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    _testing.reset();
    env.GITHUB_MODE = saved.mode;
    env.GITHUB_TOKEN = saved.token;
  });

  const later = (ms: number) => vi.setSystemTime(Date.now() + ms);

  it('GITHUB_MODE="mock" means no network at all', async () => {
    env.GITHUB_MODE = 'mock';
    const { impl, calls } = stubFetch(() => repoJson(5));
    _testing.setFetch(impl);
    expect(await getRepoStars()).toEqual({ stars: null, fetchedAt: null });
    expect(calls).toHaveLength(0);
  });

  it('reuses a good reading for five minutes however many visitors ask', async () => {
    const { impl, calls } = stubFetch(() => repoJson(12));
    _testing.setFetch(impl);

    const first = await getRepoStars();
    expect(first).toEqual({ stars: 12, fetchedAt: '2026-01-01T00:00:00.000Z' });

    later(STARS_FRESH_MS - 1);
    await getRepoStars();
    await getRepoStars();
    expect(calls).toHaveLength(1);
  });

  it('asks GitHub again once the reading is stale, and follows the new number', async () => {
    let stars = 12;
    const { impl, calls } = stubFetch(() => repoJson(stars));
    _testing.setFetch(impl);

    expect((await getRepoStars()).stars).toBe(12);
    stars = 13; // someone starred the repository
    later(STARS_FRESH_MS + 1);
    const refreshed = await getRepoStars();
    expect(refreshed.stars).toBe(13);
    expect(refreshed.fetchedAt).toBe(new Date(Date.now()).toISOString());
    expect(calls).toHaveLength(2);
  });

  it('shares one request between simultaneous visitors', async () => {
    const { impl, calls } = stubFetch(async () => {
      await Promise.resolve();
      return repoJson(3);
    });
    _testing.setFetch(impl);
    const answers = await Promise.all(Array.from({ length: 8 }, () => getRepoStars()));
    expect(calls).toHaveLength(1);
    expect(new Set(answers.map((a) => a.stars))).toEqual(new Set([3]));
  });

  it('does not hammer GitHub after a failure: unknown until the cooldown passes, then it tries again', async () => {
    let up = false;
    const { impl, calls } = stubFetch(() => (up ? repoJson(21) : status(404)));
    _testing.setFetch(impl);

    expect(await getRepoStars()).toEqual({ stars: null, fetchedAt: null });
    later(STARS_RETRY_MS - 1);
    expect((await getRepoStars()).stars).toBeNull();
    expect(calls).toHaveLength(1); // still cooling down

    up = true;
    later(2);
    expect((await getRepoStars()).stars).toBe(21);
    expect(calls).toHaveLength(2);
  });

  it('keeps serving the last real count when a refresh fails (stale-if-error), instead of blanking the badge', async () => {
    let up = true;
    const { impl } = stubFetch(() => (up ? repoJson(30) : status(500)));
    _testing.setFetch(impl);

    const good = await getRepoStars();
    expect(good.stars).toBe(30);

    up = false;
    later(STARS_FRESH_MS + 1);
    const during = await getRepoStars();
    expect(during.stars).toBe(30);
    expect(during.fetchedAt).toBe(good.fetchedAt); // honest about how old it is
  });

  it('treats the .env.example placeholder like no token, and sends a real one', async () => {
    const { impl, calls } = stubFetch(() => repoJson(1));
    _testing.setFetch(impl);

    env.GITHUB_TOKEN = 'replace-with-a-github-pat';
    await getRepoStars();
    expect(calls[0]?.headers).not.toHaveProperty('Authorization');

    _testing.reset();
    _testing.setFetch(impl);
    env.GITHUB_TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';
    await getRepoStars();
    expect(calls[1]?.headers.Authorization).toBe('Bearer ghp_abcdefghijklmnopqrstuvwxyz0123456789');
  });

  it('logs a failure once per reason, not once per retry', async () => {
    const { impl } = stubFetch(() => status(404));
    _testing.setFetch(impl);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await getRepoStars();
      later(STARS_RETRY_MS + 1);
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(GITHUB_REPO);
    expect(String(warn.mock.calls[0]?.[0])).not.toMatch(/ghp_|Bearer/);
  });
});

describe('GET /api/github-stars', () => {
  const saved = { mode: env.GITHUB_MODE, token: env.GITHUB_TOKEN };

  beforeEach(() => {
    _testing.reset();
    env.GITHUB_TOKEN = undefined;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _testing.reset();
    env.GITHUB_MODE = saved.mode;
    env.GITHUB_TOKEN = saved.token;
  });

  it('is a 200 with stars: null when GitHub cannot be asked, so the header shows "Star" instead of an error', async () => {
    env.GITHUB_MODE = 'mock';
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { repo: GITHUB_REPO, stars: null, fetchedAt: null } });
    expect(response.headers.get('cache-control')).toContain('s-maxage=30');
  });

  it('returns the real count with a short CDN lifetime, and takes no input', async () => {
    env.GITHUB_MODE = 'auto';
    const { impl, calls } = stubFetch(() => repoJson(1234));
    _testing.setFetch(impl);

    const response = await GET();
    const body = (await response.json()) as { data: { repo: string; stars: number; fetchedAt: string } };
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ repo: GITHUB_REPO, stars: 1234 });
    expect(Number.isNaN(Date.parse(body.data.fetchedAt))).toBe(false);
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=60, stale-while-revalidate=300');
    // The handler has no parameters, so nothing a caller sends can redirect it to another repository.
    expect(GET.length).toBe(0);
    expect(calls[0]?.url).toBe(`https://api.github.com/repos/${GITHUB_REPO}`);
  });
});

describe('formatCompactCount — a badge must never claim more than the truth', () => {
  it.each([
    [0, '0'],
    [1, '1'],
    [999, '999'],
    [1_000, '1k'],
    [1_234, '1.2k'],
    [1_999, '1.9k'], // truncated, not rounded up to "2k"
    [4_100, '4.1k'],
    [12_000, '12k'],
    [12_345, '12.3k'],
    [999_999, '999.9k'],
    [1_000_000, '1m'],
    [3_400_000, '3.4m'],
    [2_500_000_000, '2.5b'],
    [2.9, '2'],
    [-5, '0'],
    [Number.NaN, '0'],
    [Number.POSITIVE_INFINITY, '0'],
  ])('%s → %s', (input, expected) => {
    expect(formatCompactCount(input)).toBe(expected);
  });
});
