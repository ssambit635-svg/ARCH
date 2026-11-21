import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('public/app/launch.js', 'utf8');
const healthy = { status: 'ok', checks: { database: { status: 'ok' } } };
function json(payload: unknown, status = 200, type = 'application/json') {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': type } });
}
function launcher(options: {
  online?: boolean; hidden?: boolean; secure?: boolean;
  fetch?: (input: string, options: RequestInit) => Promise<Response>;
} = {}) {
  const docEvents = new Map<string, () => void>();
  const windowEvents = new Map<string, () => void>();
  const buttonEvents = new Map<string, () => void>();
  const attributes = new Map<string, string>();
  const status = { textContent: '', setAttribute: (key: string, value: string) => attributes.set(key, value) };
  const retry = { disabled: false, textContent: 'Connect again', addEventListener: (name: string, fn: () => void) => buttonEvents.set(name, fn) };
  const document = { hidden: options.hidden ?? false, getElementById: (id: string) => id === 'retry' ? retry : status, addEventListener: (name: string, fn: () => void) => docEvents.set(name, fn) };
  const register = vi.fn(async () => ({}));
  const navigator = { onLine: options.online ?? true, serviceWorker: { register } };
  const replace = vi.fn();
  const window = { isSecureContext: options.secure ?? true, location: { replace }, addEventListener: (name: string, fn: () => void) => windowEvents.set(name, fn) };
  const fetcher = vi.fn(options.fetch ?? (async () => json(healthy)));
  runInNewContext(source, { document, navigator, window, fetch: fetcher, AbortController, setTimeout, clearTimeout });
  return { status, retry, attributes, document, navigator, register, replace, fetcher,
    click: () => buttonEvents.get('click')!(),
    hide: () => { document.hidden = true; docEvents.get('visibilitychange')!(); },
    offline: () => { navigator.onLine = false; windowEvents.get('offline')!(); },
    pagehide: () => windowEvents.get('pagehide')!(),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('launcher readiness validation', () => {
  it.each(['application/json', 'application/json; charset=utf-8', 'Application/JSON'])('accepts healthy JSON with Content-Type %s', async (type) => {
    const l = launcher({ fetch: async () => json(healthy, 200, type) }); await vi.runAllTimersAsync();
    expect(l.replace).toHaveBeenCalledExactlyOnceWith('/dashboard'); expect(l.fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    { label: 'empty object', body: {} }, { label: 'null', body: null }, { label: 'array', body: [] },
    { label: 'status only', body: { status: 'ok' } }, { label: 'degraded server', body: { ...healthy, status: 'degraded' } },
    { label: 'failed database', body: { status: 'ok', checks: { database: { status: 'error' } } } },
    { label: 'truthy boolean', body: { status: true, checks: healthy.checks } },
  ])('does not treat $label as ready', async ({ body }) => {
    const l = launcher({ fetch: async () => json(body) }); await vi.runAllTimersAsync();
    expect(l.replace).not.toHaveBeenCalled(); expect(l.fetcher).toHaveBeenCalledTimes(6); expect(l.retry.disabled).toBe(false);
  });
  it.each(['text/html', 'text/plain', 'application/octet-stream', ''])('rejects an HTTP-200 response of type %s', async (type) => {
    const l = launcher({ fetch: async () => json(healthy, 200, type) }); await vi.runAllTimersAsync();
    expect(l.replace).not.toHaveBeenCalled(); expect(l.fetcher).toHaveBeenCalledTimes(6);
  });
  it.each([400, 401, 403, 404, 429, 500, 502, 503, 504])('does not redirect for HTTP %s even with a healthy-looking body', async (status) => {
    const l = launcher({ fetch: async () => json(healthy, status) }); await vi.runAllTimersAsync();
    expect(l.replace).not.toHaveBeenCalled(); expect(l.status.textContent).toContain('still unreachable');
  });
  it('rejects malformed JSON and HTML login responses without exposing their body', async () => {
    const l = launcher({ fetch: async () => new Response('private backend error/token', { headers: { 'Content-Type': 'application/json' } }) });
    await vi.runAllTimersAsync(); expect(l.replace).not.toHaveBeenCalled(); expect(l.status.textContent).not.toContain('token');
  });
  it('does not accept a followed redirect', async () => {
    const l = launcher({ fetch: async () => { const response = json(healthy); Object.defineProperty(response, 'redirected', { value: true }); return response; } });
    await vi.runAllTimersAsync(); expect(l.replace).not.toHaveBeenCalled();
  });
  it('sends no credentials, bypasses cache and rejects redirects', async () => {
    const l = launcher(); await vi.runAllTimersAsync();
    expect(l.fetcher.mock.calls[0]).toEqual(['/api/health', expect.objectContaining({ credentials: 'omit', cache: 'no-store', redirect: 'error' })]);
  });
});

describe('launcher lifecycle and retry limits', () => {
  it('does not start any request when initially offline', async () => {
    const l = launcher({ online: false }); await vi.runAllTimersAsync(); expect(l.fetcher).not.toHaveBeenCalled();
    expect(l.status.textContent).toContain('offline'); expect(l.retry.disabled).toBe(false);
  });
  it('does not start any request from a hidden page', async () => {
    const l = launcher({ hidden: true }); await vi.runAllTimersAsync(); expect(l.fetcher).not.toHaveBeenCalled(); expect(l.status.textContent).toContain('paused');
  });
  it('ignores rapid clicks while one connection is running', async () => {
    const l = launcher({ fetch: () => new Promise(() => {}) }); l.click(); l.click();
    expect(l.fetcher).toHaveBeenCalledOnce(); expect(l.retry.disabled).toBe(true); expect(l.attributes.get('aria-busy')).toBe('true');
  });
  it('spaces failed requests five seconds apart and stops at six attempts', async () => {
    const l = launcher({ fetch: async () => json({}, 503) }); await vi.advanceTimersByTimeAsync(0);
    expect(l.fetcher).toHaveBeenCalledTimes(1); await vi.advanceTimersByTimeAsync(4999); expect(l.fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(l.fetcher).toHaveBeenCalledTimes(2);
    await vi.runAllTimersAsync(); expect(l.fetcher).toHaveBeenCalledTimes(6); expect(vi.getTimerCount()).toBe(0);
  });
  it('allows a fresh explicit retry after exhaustion', async () => {
    const l = launcher({ fetch: async () => json({}, 503) }); await vi.runAllTimersAsync();
    l.fetcher.mockImplementation(async () => json(healthy)); l.click(); await vi.runAllTimersAsync();
    expect(l.fetcher).toHaveBeenCalledTimes(7); expect(l.replace).toHaveBeenCalledOnce();
  });
  it('aborts each stalled request at ten seconds, then eventually stops', async () => {
    const l = launcher({ fetch: (_url, options) => new Promise((_resolve, reject) => options.signal!.addEventListener('abort', () => reject(new Error('deadline')))) });
    await vi.advanceTimersByTimeAsync(10000);
    expect(l.fetcher.mock.calls[0]?.[1].signal?.aborted).toBe(true);
    await vi.runAllTimersAsync(); expect(l.fetcher).toHaveBeenCalledTimes(6); expect(l.retry.disabled).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  for (const transition of ['hide', 'offline', 'pagehide'] as const) {
    it(`aborts an in-flight request on ${transition} and ignores a late success`, async () => {
      let resolve!: (response: Response) => void;
      const l = launcher({ fetch: () => new Promise((done) => { resolve = done; }) }); l[transition]();
      expect(l.fetcher.mock.calls[0]?.[1].signal?.aborted).toBe(true); expect(l.retry.disabled).toBe(false);
      resolve(json(healthy)); await vi.runAllTimersAsync();
      expect(l.replace).not.toHaveBeenCalled(); expect(l.fetcher).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    });
    it(`cancels a scheduled retry on ${transition} without starting another request`, async () => {
      const l = launcher({ fetch: async () => json({}, 503) }); await vi.advanceTimersByTimeAsync(0);
      l[transition](); await vi.runAllTimersAsync(); expect(l.fetcher).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    });
  }
  it('does not let an old request unlock the button owned by a newer retry', async () => {
    const resolves: ((response: Response) => void)[] = [];
    const l = launcher({ fetch: () => new Promise((resolve) => resolves.push(resolve)) });
    l.hide(); l.document.hidden = false; l.click();
    resolves[0]!(json(healthy)); await vi.advanceTimersByTimeAsync(0);
    expect(l.replace).not.toHaveBeenCalled(); expect(l.retry.disabled).toBe(true);
    resolves[1]!(json(healthy)); await vi.runAllTimersAsync(); expect(l.replace).toHaveBeenCalledOnce(); expect(l.retry.disabled).toBe(false);
  });
  it('does not register a service worker from an insecure context', () => {
    const l = launcher({ secure: false, online: false }); expect(l.register).not.toHaveBeenCalled();
  });
});
