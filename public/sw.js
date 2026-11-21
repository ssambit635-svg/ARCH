/* Cache PUBLIC installation assets only. Bump version when any allowlisted asset changes.
 * No private documents, API/auth/RSC responses, automatic update reload, or offline write replay. */
const CACHE = 'arch-public-app-v2';
const ASSETS = [
  '/app/launch.html', '/app/offline.html', '/app/app.css', '/app/launch.js',
  '/app/icon-192.png', '/app/icon-512.png', '/app/icon-maskable.png', '/app/apple-touch-icon.png',
  '/manifest.webmanifest',
];
function validAsset(response, path) {
  if (!response || response.status !== 200 || response.redirected) return false;
  if (/\b(private|no-store)\b/i.test(response.headers.get('Cache-Control') || '')) return false;
  const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (path.endsWith('.html')) return type === 'text/html';
  if (path.endsWith('.css')) return type === 'text/css';
  if (path.endsWith('.js')) return ['application/javascript', 'text/javascript'].includes(type);
  if (path.endsWith('.png')) return type === 'image/png';
  return ['application/manifest+json', 'application/json'].includes(type);
}
async function publicCache(path) {
  try {
    const response = await caches.match(path, { cacheName: CACHE });
    return validAsset(response, path) ? response : null;
  } catch { return null; } // Storage denial/eviction must not break online navigation.
}
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      for (const path of ASSETS) {
        const response = await fetch(new Request(path, { credentials: 'omit', cache: 'reload', redirect: 'error' }));
        if (!validAsset(response, path)) throw new Error('Public app asset unavailable');
        await cache.put(path, response);
      }
    } catch (error) {
      // Do not leave a half-populated new version; the previous active worker stays usable.
      await caches.delete(CACHE).catch(() => {});
      throw error;
    }
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      for (const name of await caches.keys()) {
        if (name.startsWith('arch-public-app-') && name !== CACHE) await caches.delete(name);
      }
    } catch { /* A browser storage failure must not force a reload or break claiming. */ }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (['RSC', 'Next-Router-Prefetch', 'Authorization', 'Range'].some((header) => request.headers?.has(header))) return;
  if (!url.search && ASSETS.includes(url.pathname)) {
    event.respondWith((async () => (await publicCache(url.pathname)) || fetch(request))());
    return;
  }
  // Only full document navigations, never client-side RSC requests, have a public fallback.
  if (request.mode === 'navigate' && (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/'))) {
    event.respondWith((async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(request, { signal: controller.signal, cache: 'no-store' });
        if (response.status < 500) return response;
      } catch { /* Offline, unavailable or sleeping backend; never cache the failed response. */ }
      finally { clearTimeout(timer); }
      return (await publicCache('/app/offline.html')) || new Response(
        'ARCH is unreachable. Reconnect and try again. No changes were sent.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        },
      );
    })());
  }
});
