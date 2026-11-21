import { readFileSync, existsSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InstallApp } from '@/components/app/app-experience';

import { serviceWorkerHarness as worker, swRequest as request, swEvent as event, workerSource as source, assetResponse } from './helpers/service-worker';

describe('installable app privacy boundary', () => {
  it('prepares only explicit public files without sending cookies', async () => {
    const w = worker();
    let pending!: Promise<void>;
    w.handlers.install!({ waitUntil(value: Promise<void>) { pending = value; } });
    await pending;
    const paths = w.put.mock.calls.map(([path]) => path);
    expect(paths).toContain('/app/launch.html');
    for (const path of paths) {
      expect(existsSync(`public${path}`)).toBe(true);
      expect(path).not.toMatch(/dashboard|api|login|register|invite/);
    }
    for (const [req] of w.fetcher.mock.calls as unknown as [Request][]) expect(req.credentials).toBe('omit');
  });
  it.each(['/api/auth/session', '/api/health', '/api/incidents', '/login', '/register', '/invite/secret', '/dashboard?_rsc=123'])('does not intercept API/auth/RSC requests: %s', (path) => {
    const w = worker();
    const e = event(request(path));
    w.handlers.fetch!(e);
    expect(e.response()).toBeUndefined();
    expect(w.caches.match).not.toHaveBeenCalled();
  });
  it('does not intercept POSTs, third-party requests, or allowlisted paths with queries', () => {
    const w = worker();
    for (const req of [request('/dashboard', 'navigate', 'POST'), request('/app/launch.html', 'cors', 'GET', 'https://other.example.com'), request('/app/launch.html?private=123')]) {
      const e = event(req); w.handlers.fetch!(e); expect(e.response()).toBeUndefined();
    }
  });
  it('serves the cached opening screen without contacting the backend', async () => {
    const w = worker(); w.store.set('/app/launch.html', assetResponse('/app/launch.html', 'public opening screen'));
    const e = event(request('/app/launch.html', 'navigate')); w.handlers.fetch!(e);
    expect(await (await e.response())?.text()).toBe('public opening screen');
    expect(w.fetcher).not.toHaveBeenCalled();
  });
  it('never stores a successful private document', async () => {
    const w = worker();
    const e = event(request('/dashboard', 'navigate')); w.handlers.fetch!(e);
    expect((await e.response())?.status).toBe(200);
    expect(w.put).not.toHaveBeenCalled();
  });
  it.each(['reject', 'server-error'])('uses only the public fallback when navigation fails: %s', async (failure) => {
    const w = worker(); w.store.set('/app/offline.html', assetResponse('/app/offline.html', 'public fallback'));
    if (failure === 'reject') w.fetcher.mockRejectedValue(new Error('offline'));
    else w.fetcher.mockResolvedValue(new Response('private server error', { status: 503 }));
    const e = event(request('/dashboard/incidents/secret', 'navigate')); w.handlers.fetch!(e);
    expect(await (await e.response())?.text()).toBe('public fallback');
    expect(w.put).not.toHaveBeenCalled();
  });
  it('cleans only its own old caches and does not force waiting updates', async () => {
    const w = worker(); let pending!: Promise<void>;
    w.handlers.activate!({ waitUntil(value: Promise<void>) { pending = value; } }); await pending;
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith('arch-public-app-old');
    expect(source).not.toContain('skipWaiting(');
  });
});

describe('install experience', () => {
  it('ships valid standalone metadata with real PNGs', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/app/launch.html');
    for (const icon of manifest.icons) {
      const png = readFileSync(`public${icon.src}`);
      const size = Number(icon.sizes.split('x')[0]);
      expect(png.readUInt32BE(16)).toBe(size); expect(png.readUInt32BE(20)).toBe(size);
    }
  });
  it('provides honest installation instructions without forcing a popup', () => {
    const html = renderToStaticMarkup(h(InstallApp));
    expect(html).toContain('<details'); expect(html).toContain('Install ARCH');
    expect(html).toContain('does not remove server cold starts');
    expect(html).toContain('Safari');
  });
});

describe('workspace comfort preference', () => {
  it('keeps preference values bounded and scoped to display only', async () => {
    const { readWorkspaceDensity, serializeWorkspaceDensity } = await import('@/components/shell/density-preferences');
    expect(readWorkspaceDensity(undefined)).toBe('comfortable');
    expect(readWorkspaceDensity('compact')).toBe('compact');
    expect(readWorkspaceDensity('compact; admin=true')).toBe('comfortable');
    expect(serializeWorkspaceDensity('compact', true)).toBe('arch-density=compact; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  });
});
