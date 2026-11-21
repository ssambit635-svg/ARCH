# Installable app quality review — 2026-11-15

## Scope

A targeted quality slice for ARCH's public download/install, startup and service-worker flows.
The existing dashboard theme, server authorization, tenant-scoped repositories, database schema
and deployment infrastructure are unchanged. No paid resources, native binary releases, private
offline cache, write replay or host keep-alive are introduced.

This is **207 new parameterized regression cases**, not 207 commits or independent features.
The pre-existing 936 tests remain in the suite; they are not counted as new contributions.

## Findings and fixes

| Area | Reproduced gap | Behaviour after fix |
| --- | --- | --- |
| Install action | A captured event could be reused by same-tick calls; result was discarded | A small tested controller synchronously consumes the event and returns accepted/dismissed/unavailable/failed |
| Download feedback | A cancelled/failed prompt got generic feedback, with no pending state | Both platform buttons are disabled while pending; accepted, cancelled and fallback instructions are distinct |
| Launcher lifecycle | An outstanding request could finish after the page was hidden/offline | Visibility/offline/pagehide cancels requests and waits; generation guard ignores stale responses and stale cleanup |
| Launcher readiness | Any successful HTTP response could trigger the dashboard redirect | Require non-redirected successful JSON with `status: ok` and database `status: ok` |
| Public asset validation | Successful wrong-type/partial/private responses were eligible for precache | Require exact HTTP 200, expected media type, no redirect and no private/no-store directive |
| Installation failure | A failed new worker could leave a partial cache | Best-effort delete the partial new version; reject installation and preserve the previous active worker |
| Cache storage denial | A failed cache lookup could break otherwise-working online navigation | Network fallback for public assets; generic no-store 503 if dashboard network and cache both fail |
| Updates | Registering while a worker was already installing could miss its state listener | Attach to an existing installing worker and remove an old listener before replacement |

The update-listener change was reviewed and typechecked. The automated browser test covers
initial production registration; multi-tab waiting-worker/update lifecycle still needs manual
verification. Header/type validation is defence in depth, not a claim of an exploitable security
vulnerability in the previous release.

## New regression coverage

| File | New cases | Boundaries |
| --- | ---: | --- |
| `tests/pwa-security-matrix.test.ts` | 159 | Private API/auth/invite routes × HTTP methods; RSC/prefetch/auth/range bypass; cached/missing/denied/private public assets; install status/type/cache policy failures; private navigation status handling, deadline, storage failure |
| `tests/launcher.test.ts` | 40 | Healthy/unhealthy/malformed readiness; content types and HTTP failures; request options; bounded/spaced retries; hidden/offline/unload cancellation; stale-result race; secure-context guard |
| `tests/app-installation.test.ts` | 8 | Acceptance/dismissal; unavailable/cleared/replaced events; prompt failure; same-tick duplicate prevention; newer event captured while an older action resolves |
| **Total** | **207** | Executes the shipped scripts/controller rather than source-string-only assertions |

The original worker tests now share a typed VM harness with valid response media types. This
harness simulates the Cache API; it does not model a browser's complete worker lifecycle.

## Verification results

Run on this branch with Node 22 and disposable test configuration:

- `npm ci --include=dev`: passed; no dependency versions changed.
- `npm run db:generate`: passed using the repository's offline schema-engine fallback because
  the Prisma binary host is unavailable in this sandbox.
- `npm run typecheck`: passed.
- `npm test`: **1,143 passed, 69 files**, including the real PostgreSQL integration suite and all
  14 migrations applied to the disposable test database.
- `npm run build`: passed; `/download` remains statically prerendered.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities reported** at review time. This
  only describes npm's advisory database, not an overall security certification.
- `npm run smoke:app -- --url http://localhost:3100 --start-server`: passed against the production
  build with Chromium 153. The sandbox used an independently installed Chromium executable via
  `CHROMIUM_EXECUTABLE_PATH`; no browser binary or dependency was added to the app lockfile.

The browser smoke checks Windows/Linux instructions, simulated accepted/dismissed/failed install
events, both buttons disabled during a pending choice, installed-state feedback, production
worker registration, offline opening screen, offline dashboard public fallback, exactly nine
public Cache Storage entries, widths 390/768/1024/1440px, homepage mobile Download ARCH navigation,
and absence of JavaScript page errors. Axe WCAG A/AA checks on `/download` reported no violations.
That is limited automated coverage, not a whole-site accessibility audit.

The command is now in CI after the production build, test suite and audit. GitHub-hosted CI uses
Playwright's Chromium distribution; its first run must still be reviewed separately from these
local results. It does not need real production secrets, an account, working email or a live DB
for the anonymous browser paths. The full integration suite manages its own test DB.

## Manual release checks / limitations

- Real Windows Edge/Chrome and supported Linux browser install, launch and uninstall.
- iOS Safari Add to Home Screen, standalone layout, keyboard/screen-reader announcements.
- Upgrade an existing v1 install to v2: keep a dirty form open in another tab, observe a waiting
  update, save and close all tabs, reopen; no forced reload should occur. Verify only ARCH's old
  public caches are removed and unrelated caches remain.
- Browser storage denial/eviction behaviour on target platforms; cancellation cannot retract a
  request already received by the server.
- Real Render cold start: installation does not remove the backend wake-up time. Retries remain
  bounded and do not automatically restart in the background.
- No authenticated end-to-end/tenant-isolation browser flow is added here. Existing server-side
  integration tests still run; no claim of a full penetration test or load/performance audit.

No merge or deployment is part of this review. See [the install guide](INSTALLABLE-APP.md) for
repeatable commands and the existing public-only caching contract.
