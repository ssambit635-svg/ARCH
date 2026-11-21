import { afterEach, describe, expect, it, vi } from 'vitest';
import { serviceWorkerHarness, swRequest, swEvent, assetResponse, publicAssets, mime, cacheName } from './helpers/service-worker';

afterEach(() => vi.useRealTimers());

// Each row represents a real endpoint class and each method an independent interception boundary.
const sensitivePaths = [
  '/api/auth/session', '/api/auth/csrf', '/api/auth/providers', '/api/auth/callback/google',
  '/api/auth/signout', '/api/health', '/api/incidents', '/api/github', '/login', '/register', '/invite/private-token',
];
const bypassCases = sensitivePaths.flatMap((path) => ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map((method) => [method, path] as const));

describe('private endpoint interception matrix', () => {
  it.each(bypassCases)('%s %s remains network-owned and uncached', (method, path) => {
    const w = serviceWorkerHarness(); const e = swEvent(swRequest(path, 'navigate', method));
    w.handlers.fetch!(e);
    expect(e.response()).toBeUndefined(); expect(w.put).not.toHaveBeenCalled(); expect(w.caches.match).not.toHaveBeenCalled();
  });
  it.each(['RSC', 'Next-Router-Prefetch', 'Authorization', 'Range'])('bypasses %s even on public assets', (header) => {
    const w = serviceWorkerHarness();
    for (const path of ['/app/launch.html', '/dashboard']) {
      const e = swEvent(swRequest(path, 'navigate', 'GET', undefined, { [header]: '1' }));
      w.handlers.fetch!(e); expect(e.response()).toBeUndefined();
    }
  });
});

describe('public asset cache matrix', () => {
  it.each(publicAssets)('serves valid cached %s without a network request', async (path) => {
    const w = serviceWorkerHarness(); w.store.set(path, assetResponse(path, 'cached'));
    const e = swEvent(swRequest(path)); w.handlers.fetch!(e);
    expect(await (await e.response())!.text()).toBe('cached'); expect(w.fetcher).not.toHaveBeenCalled();
  });
  it.each(publicAssets)('uses the network when %s has been evicted', async (path) => {
    const w = serviceWorkerHarness(); const e = swEvent(swRequest(path)); w.handlers.fetch!(e);
    expect(await (await e.response())!.text()).toBe('network'); expect(w.put).not.toHaveBeenCalled();
  });
  it.each(publicAssets)('keeps %s working when cache reads are denied', async (path) => {
    const w = serviceWorkerHarness(); w.caches.match.mockRejectedValue(new Error('storage denied'));
    const e = swEvent(swRequest(path)); w.handlers.fetch!(e);
    expect(await (await e.response())!.text()).toBe('network');
  });
  it.each(publicAssets)('rejects private cached responses at %s', async (path) => {
    const w = serviceWorkerHarness(); w.store.set(path, new Response('private', { headers: { 'Content-Type': mime(path), 'Cache-Control': 'private, max-age=100' } }));
    const e = swEvent(swRequest(path)); w.handlers.fetch!(e);
    expect(await (await e.response())!.text()).toBe('network');
  });
});

describe('atomic public app installation', () => {
  it.each(publicAssets)('rejects an invalid media type at %s and cleans the new cache', async (path) => {
    const w = serviceWorkerHarness();
    w.fetcher.mockImplementation(async (req) => new URL(req.url).pathname === path
      ? new Response('wrong document', { headers: { 'Content-Type': 'application/octet-stream' } }) : assetResponse(new URL(req.url).pathname));
    await expect(w.install()).rejects.toThrow('Public app asset unavailable');
    expect(w.caches.delete).toHaveBeenCalledWith(cacheName);
    expect(w.put.mock.calls.some(([cached]) => cached === path)).toBe(false);
  });
  it.each([201, 204, 206, 301, 302, 401, 403, 404, 429, 500, 503])('does not install a partial/error/redirect HTTP %s response', async (status) => {
    const w = serviceWorkerHarness();
    w.fetcher.mockResolvedValue(new Response(status === 204 ? null : 'bad', { status, headers: { 'Content-Type': 'text/html' } }));
    await expect(w.install()).rejects.toThrow(); expect(w.caches.delete).toHaveBeenCalledWith(cacheName);
  });
  it.each(['private', 'no-store', 'public, no-store', 'PRIVATE, max-age=1'])('rejects Cache-Control %s during install', async (policy) => {
    const w = serviceWorkerHarness();
    w.fetcher.mockResolvedValue(new Response('sensitive', { headers: { 'Content-Type': 'text/html', 'Cache-Control': policy } }));
    await expect(w.install()).rejects.toThrow(); expect(w.put).not.toHaveBeenCalled();
  });
  it('rejects a followed login redirect even when its media type is HTML', async () => {
    const w = serviceWorkerHarness(); const redirected = assetResponse('/app/launch.html');
    Object.defineProperty(redirected, 'redirected', { value: true }); w.fetcher.mockResolvedValue(redirected);
    await expect(w.install()).rejects.toThrow(); expect(w.put).not.toHaveBeenCalled();
  });
  it('does not hide a cache-write failure, even if cleanup also fails', async () => {
    const w = serviceWorkerHarness(); w.put.mockRejectedValue(new Error('quota exhausted')); w.caches.delete.mockRejectedValue(new Error('storage denied'));
    await expect(w.install()).rejects.toThrow('quota exhausted');
  });
  it('claims clients even if old-cache enumeration is denied', async () => {
    const w = serviceWorkerHarness(); w.caches.keys.mockRejectedValue(new Error('storage denied')); let pending!: Promise<void>;
    w.handlers.activate!({ waitUntil(value) { pending = value; } }); await pending;
    expect(w.self.clients.claim).toHaveBeenCalledOnce();
  });
});

describe('private navigation error handling', () => {
  it.each([200, 201, 204, 302, 400, 401, 403, 404, 409, 429])('preserves HTTP %s without substituting offline content', async (status) => {
    const w = serviceWorkerHarness(); w.fetcher.mockResolvedValue(new Response(status === 204 ? null : 'server response', { status }));
    const e = swEvent(swRequest('/dashboard', 'navigate')); w.handlers.fetch!(e);
    expect((await e.response())!.status).toBe(status); expect(w.put).not.toHaveBeenCalled();
    expect(w.fetcher.mock.calls[0]?.[1]?.cache).toBe('no-store');
  });
  it.each([500, 502, 503, 504])('returns a generic 503 if HTTP %s occurs and fallback storage fails', async (status) => {
    const w = serviceWorkerHarness(); w.fetcher.mockResolvedValue(new Response('database secret', { status })); w.caches.match.mockRejectedValue(new Error('denied'));
    const e = swEvent(swRequest('/dashboard', 'navigate')); w.handlers.fetch!(e);
    const response = (await e.response())!;
    expect(response.status).toBe(503); expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).not.toContain('database secret');
  });
  it('aborts an unresponsive navigation after 12 seconds and clears its deadline', async () => {
    vi.useFakeTimers(); const w = serviceWorkerHarness();
    w.fetcher.mockImplementation((_req, options) => new Promise((_resolve, reject) => {
      options!.signal!.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const e = swEvent(swRequest('/dashboard', 'navigate')); w.handlers.fetch!(e);
    await vi.advanceTimersByTimeAsync(12000);
    expect((await e.response())!.status).toBe(503); expect(vi.getTimerCount()).toBe(0);
  });
});
