import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { vi } from 'vitest';

export const workerSource = readFileSync('public/sw.js', 'utf8');
export const cacheName = /const CACHE = '([^']+)'/.exec(workerSource)![1]!;
export const publicAssets = [
  '/app/launch.html', '/app/offline.html', '/app/app.css', '/app/launch.js',
  '/app/icon-192.png', '/app/icon-512.png', '/app/icon-maskable.png', '/app/apple-touch-icon.png',
  '/manifest.webmanifest',
];
export function mime(path: string) {
  return path.endsWith('.html') ? 'text/html' : path.endsWith('.css') ? 'text/css'
    : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.png') ? 'image/png' : 'application/manifest+json';
}
export function assetResponse(path: string, body = 'public asset') {
  return new Response(body, { headers: { 'Content-Type': mime(path) } });
}
export function swRequest(path: string, mode = 'cors', method = 'GET', origin = 'https://arch.example.com', headers: HeadersInit = {}) {
  return { url: new URL(path, origin).href, method, mode, headers: new Headers(headers) };
}
export type TestRequest = ReturnType<typeof swRequest>;
type WorkerEvent = {
  request?: TestRequest;
  waitUntil?: (value: Promise<void>) => void;
  respondWith?: (value: Promise<Response>) => void;
};
export function swEvent(request: TestRequest) {
  let response: Promise<Response> | undefined;
  return { request, respondWith(value: Promise<Response>) { response = value; }, response: () => response };
}
export function serviceWorkerHarness() {
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  const store = new Map<string, Response>();
  const put = vi.fn(async (path: string, response: Response) => { store.set(path, response); });
  const fetcher = vi.fn(async (request: Request | TestRequest, _options?: RequestInit) => assetResponse(new URL(request.url).pathname, 'network'));
  const caches = {
    open: vi.fn(async () => ({ put })),
    keys: vi.fn(async () => ['arch-public-app-old', 'unrelated-app']),
    delete: vi.fn(async (_name: string) => true),
    match: vi.fn(async (path: string) => store.get(path)?.clone()),
  };
  const self = { location: { origin: 'https://arch.example.com' }, clients: { claim: vi.fn() }, addEventListener(name: string, fn: (event: WorkerEvent) => void) { handlers[name] = fn; } };
  class PublicRequest extends Request {
    constructor(input: string, init: RequestInit) { super(new URL(input, self.location.origin), init); }
  }
  runInNewContext(workerSource, { self, caches, fetch: fetcher, Request: PublicRequest, Response, URL, AbortController, setTimeout, clearTimeout });
  function install() {
    let pending!: Promise<void>;
    handlers.install!({ waitUntil(value) { pending = value; } });
    return pending;
  }
  return { handlers, store, caches, fetcher, put, self, install };
}
