# ARCH installable app (PWA)

ARCH can be installed from a supported browser as a Progressive Web App. It is the same hosted
workspace in its own app-like window, not a separate native .exe, APK, app-store build, or local
copy of your backend. The normal website continues to work. No paid service is provisioned.

## Install after deployment

1. Open your deployed ARCH website over HTTPS and sign in. Let the page finish loading so its
   public-only service worker can install. Private-browsing modes or restricted storage may
   prevent installation; the website remains usable.
2. In the workspace footer, expand **Install ARCH**. If the browser provides an install prompt,
   choose **Install app**. Otherwise use:
   - Chrome/Edge desktop: browser menu → Install ARCH / Install this site as an app (wording varies).
   - Android Chrome: browser menu → Install app / Add to Home screen.
   - iPhone/iPad Safari: Share → Add to Home Screen, then open it from the home screen.
3. Launch from the OS/app icon. It opens `/app/launch.html`, a small public connection screen,
   then opens `/dashboard` when the server answers. Existing permissions/account data are unchanged.
   A platform may ask you to sign in again; do not assume every browser shares sessions with its
   installed window.
4. Use **Spacing → Comfortable / Compact** in the workspace footer. It uses a display-only,
   one-year SameSite cookie, server-rendered on the next request. Comfortable gives controls
   and table rows more breathing room; Compact retains the previous dense layout. Theme,
   sidebar focus mode, shortcuts and domain behaviour remain unchanged.

The manifest is at `/manifest.webmanifest`. Icons include ordinary 192/512 PNGs, a maskable PNG
and Apple touch icon. No third-party install SDK, tracking, push permission, or native installer
is needed. Actual install UI depends on browser/OS support and policy; there is no universal
programmatic install button for every platform.

## What is faster (and what is not)

**After a successful initial install**, the opening screen/assets can load from the local app
cache without waiting for the host. Browser eviction/cleared storage can remove that cache.
The first visit still needs the server, and first install cannot bypass a sleeping Render host.

Live incidents, authorization, OAuth, database reads and all writes still need the hosted backend.
Installing a PWA does **not** remove Render Free cold starts, keep it awake, run a worker locally,
or make incident data available offline. There is no measured end-to-end speedup claim.

The launcher makes at most six health checks, each with a 10-second request deadline, separated
by 5-second pauses. It stops starting checks if hidden/offline and offers a manual reconnect.
It is not a scheduled pinger/background keep-alive and should not be used to circumvent a host's
free-tier idle rules. Server errors, sleep and connectivity failures are described as possible
causes, not mislabelled as a guaranteed network problem.

If cold-start delay is unacceptable for production response, operate an appropriately available
backend or use existing always-on infrastructure you control. That is a deployment decision,
not something an app icon can solve. Keep an independent backup response channel.

## Privacy / offline behaviour

The worker at `/sw.js` has an exact allowlist: only `/app/launch.html`, `/app/offline.html`,
`/app/app.css`, `/app/launch.js`, the app icons and the web manifest are cached. Installation
fetches these public files without cookies. No runtime asset discovery or general-purpose
cache-first strategy is used.

- No incidents, organization data, tokens, login/auth responses, API results, dashboard HTML or
  Next.js RSC/prefetch payloads are written to this service worker's Cache Storage.
- Full dashboard document navigations use the network. On failure/5xx or after a 12-second
  deadline they can display the **public** reconnect fallback, never a stale private dashboard.
- API/auth routes, OAuth callbacks, invitations, writes, cross-origin requests and RSC fetches
  are not intercepted. Auth/tenant permissions remain server-enforced.
- Client-side navigation and POST failures retain the application's existing error behaviour;
  no service-worker queue/offline write replay is added.
- An offline notice in the loaded workspace advises that data may be outdated and writes cannot
  be sent. It uses the browser's connectivity hint, not an end-to-end server-health guarantee.
- Unsent form input is not persistently saved by this feature. Keep the original tab open and
  do not rely on it as a durable draft store. There is no background sync or offline editing.

The no-private-cache statement refers to this service worker's explicit cache policy, not a claim
that browsers never retain DOM, HTTP resources, history or session data through other mechanisms.

## Updates / removal

When changing any precached public asset or worker logic, bump the `arch-public-app-vN` cache
version in `public/sw.js`. Otherwise existing clients may keep stale assets. Do not add private
paths or wildcard runtime caching. `/sw.js` is served with no-store/no-cache and registrations
use updateViaCache none.

New workers wait for old ARCH tabs/windows to close. No forced skipWaiting or controller-change
reload can discard unsent forms. The workspace install panel reports a waiting update. Save
work, close all app windows/tabs for this origin, and reopen. Cache activation removes only old
ARCH public-app caches, not unrelated browser caches.

To uninstall, use the OS/browser's app removal controls. To clear the cached opening screen too,
use browser site settings → clear site data (this can also sign you out), or DevTools →
Application → Service Workers/Cache Storage. Uninstalling does not delete server-side accounts
or organization data.

## Deployment and checks

No database migration or new secrets are needed for this feature. Deploy the reviewed branch
normally. If a reverse proxy/CDN fronts Next.js, make sure it serves `/sw.js` from the root with
a JavaScript MIME type and without stale edge caching, and serves manifest/assets without auth
redirects. Do not cache private dashboard/API responses at the proxy.

Service-worker auto-registration runs in production only. Development keeps live assets uncached
to avoid stale code during edits; public pages can be tested using a secure/localhost static
server with the worker registered explicitly. Normal production CSP remains intact.

Verification:
- Unit tests execute the real worker script against a simulated Cache API: public-only install,
  no API/auth/RSC interception, no private response storage, offline/5xx fallback, cache cleanup.
- Manifest icon dimensions, installation copy and density preference boundaries are tested.
- Browser smoke check on the public opening-screen preview: worker ready/controller, offline
  opening screen, offline dashboard fallback, public-only Cache Storage, mobile overflow check.
- Owner should verify actual installation/update UI on Windows Chrome/Edge and iOS Safari after
  deployment. A Chromium headless test does not certify all native platform behaviours.

Security maintenance in this change also updates Next to 16.4.6 and overrides Prisma config's
Effect dependency to the compatible patched 3.22.1. Keep the override reviewed on Prisma upgrades;
do not use npm audit fix --force to downgrade Prisma across major versions.
