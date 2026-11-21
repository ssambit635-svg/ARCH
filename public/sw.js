/* ARCH caches PUBLIC installation assets only. Never cache API, auth, RSC, or dashboard data.
 * Bump this version when changing any allowlisted file. Updates wait for old tabs to close. */
const CACHE = 'arch-public-app-v1';
const ASSETS = [
  '/app/launch.html', '/app/offline.html', '/app/app.css', '/app/launch.js',
  '/app/icon-192.png', '/app/icon-512.png', '/app/icon-maskable.png', '/app/apple-touch-icon.png',
  '/manifest.webmanifest',
];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const path of ASSETS) {
      const response = await fetch(new Request(path, { credentials: 'omit', cache: 'reload' }));
      if (!response.ok || response.redirected) throw new Error('Public app asset unavailable');
      await cache.put(path, response);
    }
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('arch-public-app-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Exact path + no query, no runtime asset discovery, and no caching of fetched app content.
  if (!url.search && ASSETS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(url.pathname, { cacheName: CACHE });
      return cached || fetch(request);
    })());
    return;
  }
  // Only full dashboard document navigations get a public fallback. RSC and auth bypass us.
  if (request.mode === 'navigate' && (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/'))) {
    event.respondWith((async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(request, { signal: controller.signal });
        if (response.status < 500) return response;
      } catch { /* Offline, unavailable, or sleeping server: show an honest public fallback. */ }
      finally { clearTimeout(timer); }
      return (await caches.match('/app/offline.html', { cacheName: CACHE })) ||
        new Response('ARCH is unreachable. Reconnect and try again. No changes were sent.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        });
    })());
  }
});
