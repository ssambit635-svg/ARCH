# Signed-in workspace — incident response and developer polish

**Owner:** Engineering · **Last reviewed:** 2026-10-23

The approved direction is **incident response first**, with **persistent light and dark
appearances**, delivered as a **full refresh in stages**. This document covers stage 1 and the subsequent comfortable-developer polish pass,
not a claim that every advanced-tool workflow has been redesigned.

## Scope and hierarchy

- Shared desktop/mobile shell, workspace switching, account menu, command search, focus handling,
  and the foundations used by existing screens.
- First-workspace onboarding and honest, permission-aware setup/empty states.
- Overview, incident filtering, declaration, detail, ownership controls, and response timeline.
- Confirmed adjacent reliability fixes: actual published-status destinations, project health,
  service incident history/counts, and accessibility of retained advanced screens.

Navigation leads with Overview, Incidents, Projects & services, and Status pages. Knowledge and
assistance remain discoverable as resources; repositories, Code Assist, model administration,
and the audit log live under an expandable tools section. The active tool opens that section.
AI does not displace incident creation, the response timeline, or the update composer.

**Later stages:** individual advanced-tool workspaces. General, People, Webhooks, and API-token
settings now receive task navigation and targeted setup/reliability polish; this is not a new
integration system or an exhaustive redesign of every administrative edge case. Advanced tools
retain their capabilities with shared appearance/accessibility fixes.

## Appearance and public-surface isolation

`src/components/shell/workspace.css` is scoped to `.workspace-theme`, including themed portals.
Light appearance uses warm paper, white panels, ink text, and a contrast-adjusted ember action;
dark appearance uses charcoal surfaces, warm light text, and a softer ember action. Semantic
status colors always accompany words. Existing utility-based screens inherit a compatibility
ramp until their own stage is redesigned.

- Device appearance is the default, resolved by CSS `color-scheme` / `light-dark()` before client
  hydration. Changing the operating-system preference updates system mode without reloading.
- An explicit light/dark choice is saved in the non-sensitive `arch-theme` cookie for one year
  (`SameSite=Lax`, path `/`, `Secure` on HTTPS). Dashboard and onboarding read it on the server.
- The sidebar, mobile drawer, and account menu expose appearance controls. The account menu also
  restores device appearance. Blocking cookies still permits a choice for the current visit.
- Marketing, authentication, and customer-facing status pages keep their independent scopes and
  appearance. A workspace preference is not an account, organization, or authorization setting.
- Product chrome shows the product version, not the assistant model's version.

Token regressions enforce AA text contrast (4.5:1) and control boundary contrast (3:1) in both
palettes. Browser accessibility scans supplement these calculations; they do not replace manual
keyboard or assistive-technology testing.

## Data that can be trusted

The overview queue queries **all unresolved incidents**, ordered by severity descending, then
oldest start time, with a deterministic ID tie-breaker and a bounded visible list. Recent resolved
history cannot push an older unresolved incident out of that queue. “View all” opens the full
unresolved list.

No incidents is not an uptime guarantee. Health copy distinguishes unconfigured services,
pinned degraded/outage statuses, maintenance, and recorded operational status. Project counts
include incidents with no linked service. “Team members” is membership, not an invented on-call
roster. The seven-day resolved metric uses `resolvedAt`; decorative trend charts are removed.

Overview, incident list, and incident detail explicitly show a **server snapshot** time in UTC
and a pending-aware Refresh action. They do not poll, claim to be live, or promise push updates.
Ordinary route refreshes retain the mounted comment draft. Drafts are in component memory only;
they are not saved across full reloads, navigation away, or browser closure.

Public-status shortcuts query a deterministic **published page in the current tenant** and use
its actual page slug, which is independent of the organization's slug. With no published page,
setup links lead to status-page management rather than a fabricated public URL. Service history
queries resolved incidents independently, and total incident counts include open and resolved
records; history is not falsely described as ordered by resolution time.

## Incident journey and failure states

### Filtering and declaration

UI query parsing recovers malformed filters independently while preserving valid ones and
explaining the recovery. Duplicate filter values are rejected rather than guessed. Lifecycle
links and pagination retain the valid search/project/severity/page-size context. API validation
remains strict; a malformed API filter still fails validation.

Declaration asks for the impact/title and project first, with medium severity as the default.
Service, detailed observations, assignment, and change-risk context are optional. Only the chosen
project's services are selectable; changing project clears the service. Service/project deep
links are checked against server-loaded tenant resources before prefilling anything. Viewers
see a read-only explanation; a workspace without projects gets a concrete next step instead of
an unusable submit form. Successful creation opens the actual returned incident ID.

### Response and ownership

Detail leads with impact, timeline, and a composer. Ownership/severity/service controls are in a
secondary rail on wide screens and follow the response content on phones. Related history,
assistance, and verified-fix workflows are disclosures, with reviewable drafts clearly signposted.
Assignment history resolves teammate names; removed teammates are described without printing
opaque IDs. The existing state machine remains authoritative, including conflict responses.
Resolved incidents still allow follow-up comments, as the backend already permits.

### Mutation safeguards

`useWorkspaceAction` dispatches in an explicit React action context so a completed validation
failure cannot reset native select elements or uncontrolled fields. This matters even with a
controlled select: native action-form resets can move it back to its first option. Shared action
forms, declaration, onboarding, and the composer use this behavior.

- Field labels, descriptions, and errors are associated by a stable DOM ID; schema field names
  can differ from those IDs. Summaries are announced and focused; inherited object properties
  cannot become validation messages.
- Submit buttons announce pending state and prevent repeated submission. Declaration fields and
  the comment composer are disabled while their request is pending, so a success cannot erase
  newly typed edits. The keyboard post shortcut respects pending state.
- Creation forms on the project setup path clear only after success; ownership/update forms keep
  the selected saved value. Compact forms still show persistent inline errors.
- Validation/service failures retain inputs. Transport exceptions become an inline **unconfirmed**
  result rather than unmounting the draft in a route error boundary. Framework redirects remain
  framework control flow.
- Never automatically retry a mutation: loss of its response does not prove it was not saved.
  The UI asks the responder to inspect current data before retrying an unconfirmed request.
- Status transitions retain a failed note in their dialog and show a pending response. Comments
  and transition notes retain the API's 5,000- and 2,000-character limits respectively.

These safeguards require the interactive signed-in client. The independent public auth forms
retain their native/server-action sign-in path without JavaScript; see [AUTH-UI.md](AUTH-UI.md).

## Visibility, permissions, and approval boundaries

This stage does **not** change the existing public-status visibility policy. An incident linked
to a published status page can expose its title, description, and event bodies. Creation,
comments, and transition notes therefore explicitly ask for customer-safe content. Do not label
all timeline entries “private” or imply a separate publication approval always exists.

Permissions are enforced by existing server services and organization-scoped repositories.
Hiding viewer write controls is UX, not an authorization mechanism. Switching workspace resolves
membership on the server, updates the existing organization cookie, and redirects to the new
overview instead of reusing a previous tenant's incident/service URL. Cross-tenant resources
remain unavailable. Streamed Next pages may commit HTTP 200 before rendering `notFound`; API
404s and absence of resource content remain part of the tenant-isolation checks.

Incident/timeline/audit/outbox transactions, notification delivery requirements, role boundaries,
and human review of assistance/fixes are unchanged. ARCH does not autonomously merge or deploy.

## Accessibility and verification

The shell has a skip link and named mobile actions. Loading placeholders are visible, announced,
and capped to their container width, including during streamed route transitions. Dialogs contain Tab/Shift+Tab focus, make
the workspace inert, support Escape, lock background scrolling, and restore focus. Global
shortcuts do not open another dialog from inside a modal. Popup menus support arrow keys,
Home/End, Escape, outside dismissal, and Tab exit. The mobile drawer includes disclosure summaries
in its focus order and restores its opener. Link-driven sections use navigation/`aria-current`,
not an incomplete ARIA tabs widget. Retained scrollable tables and command examples are named and
keyboard-focusable. Motion respects `prefers-reduced-motion`.

Tracked regression coverage:

- `tests/workspace-view.test.ts`: preferences/cookie serialization, truthful health, published
  destinations, readable timeline context, safe transport failures and framework redirects.
- `tests/incident-filters.test.ts`: independent recovery, duplicate/invalid values, strict API
  validation, lifecycle navigation, and pagination context.
- `tests/workspace-surface.test.ts`: scoped rendering, both palettes' contrast, connected form
  errors/hints, pending/error semantics, responsive incident content and navigation semantics.
- `tests/workspace-data.test.ts`: real PostgreSQL priority ordering, unresolved and unlinked
  counts, published/draft selection, and tenant isolation.

Browser release checklist (use isolated QA accounts/data, never customer credentials in logs):

1. Exercise all signed-in routes at desktop, 390px, and 320px, including loading states and long workspace names;
   check both appearances and scan for accessibility errors. Inspect initial, empty, viewer, and first-workspace states.
2. Persist explicit themes through navigation/reload; restore device mode; change OS appearance.
   Navigate to public status and sign out to confirm auth/public styling remains independent.
3. Test both Tab directions, Escape, and restored focus in search, status dialogs, account/workspace
   menus, and the mobile drawer. Include empty search and an active advanced-tools disclosure.
4. Declare an incident from a service, change project, validate fields, interrupt a request, and
   verify **all** selections and text remain. Check one pending submission and the resulting ID.
5. Post a comment, interrupt/retry an update, refresh with an unsent draft, reassign, change severity,
   resolve/reopen, and add a resolved follow-up. Check readable timeline/audit records.
6. Switch workspace from an incident and service, verify destination/permissions and API isolation,
   then verify the actual published-status shortcut or the unpublished setup fallback.
7. Verify onboarding name validation, failure/pending/retry, real workspace creation, and safe
   navigation into the new workspace. Recheck authentication, typecheck, full tests, and build.

## Stage 1 verification record — 2026-10-23

- Prisma generation, TypeScript, and the optimized production build passed.
- The full repository suite passed: **774 tests across 54 files**, including 66 new workspace
  regressions and the existing authentication, permission, incident/audit/outbox, and tenant tests.
- Production Chromium checks covered 16 signed-in routes in light/dark at 1440px and 390px,
  and the same routes at 320px. The final scans found no horizontal overflow, automated WCAG
  A/AA violations, or browser runtime errors. Loading-state widths were checked too, not hidden
  by waiting only for completed pages. Viewer, empty-workspace, and first-workspace states were
  checked separately. These scans are not a certification or a substitute for a screen-reader review.
- Fourteen incident/shell interaction groups and five onboarding/setup groups passed against
  the isolated PostgreSQL preview data, including interrupted requests, retained selections,
  pending-submit guards, real writes, status changes, reassignment, refresh with a draft, safe
  workspace switching, read-only routes, and appearance/public-surface isolation.
- A Next development-profiler `Performance.measure` negative-timestamp warning was observed on
  the dashboard-to-onboarding redirect. It was **not reproduced in the production checks**;
  no application errors or performance instrumentation are suppressed to hide it.

QA accounts, credentials, screenshots, database files, and test logs remain outside Git.

## Comfortable developer polish — 2026-10-23

The approved direction is GitHub-like clarity and comfortable density, **not a literal clone**:
restrained surfaces, 14px primary text, compact rows, obvious actions, and ARCH’s warm accent.
Both appearances remain; touch controls grow to 44px on narrow/coarse-pointer layouts.

### What changed

- A 232px desktop sidebar, smaller headings/controls, quieter borders, and real inline save rows
  leave more room for useful content. Overview puts the response queue before summary metrics.
- Incident filters are a flat GET navigation form. Lifecycle links stay together in a locally
  scrollable strip. Search uses the available phone width. Individually removable filter chips
  preserve other selections; an unavailable linked project is explicit, not disguised as “All.”
- Compact UTC snapshot/refresh controls sit with page actions. A generic declaration shortcut
  does not compete with the list’s declaration button or a service-prefilled action.
- Ctrl/⌘ K opens the same workspace switcher from chat and other screens, including text fields,
  but not over an existing dialog/menu. Empty-query results reserve room for navigation, recent
  incidents, and services. Matching considers all typed words; full-history search explicitly
  goes to the incident list’s title/description search rather than claiming the small switcher
  index covers all records.
- `/` focuses contextual incident/member/conversation search outside text entry. `?` opens the
  keyboard guide, also reachable through the desktop footer/account menu. Printable shortcuts
  can be disabled for voice input (WCAG 2.1.4); the non-sensitive preference is stored locally,
  with an honest current-visit fallback if storage is unavailable. Modifier shortcuts remain.
  Composition, legacy IME key code 229, repeats, and handled events do not trigger posting or
  character shortcuts. Shortcut hints use the platform modifier and a readable spoken form.
- Settings use a small local sidebar on desktop and four visible, 44px section links on phones.
  Only the selected section’s data is loaded. Permission denial is stated; unexpected failures
  are not converted into misleading empty endpoint/invitation lists.
- Invitation and token forms retain failed text/selections and prevent duplicate pending
  requests. Webhook setup lists only the selected project’s services; project-less workspaces
  get setup guidance. Invitation expiry is an absolute UTC time, not a past-time formatter.
- Newly minted webhook secrets and API tokens are masked initially with explicit copy, reveal,
  and dismissal controls. They are not put into generic toasts or browser storage. Token list
  state retains display metadata, not a spread of the creation response containing the raw
  token. Rotation/deletion retain server permission checks and require explicit confirmation.
- Incident links and complete webhook URLs can be copied without losing keyboard focus. URLs
  use the current browser origin, not a hard-coded backend/localhost host. Clipboard failures
  stay honest and offer manual-copy guidance. Public status shortcuts open separately so they
  do not replace the current response workspace.

Authorization, token scopes/default READ scope, tenant isolation, webhook signature/timestamp
verification, transactions, publication policy, and human approval rules are unchanged. No
schema migration is needed. These safeguards still require the interactive signed-in client;
authentication and native GET navigation retain their independent progressive paths.

### Repeatable UI harness

`npm run audit:ui` runs `scripts/audit-workspace-ui.mjs` against a running app. It authenticates
normally and **never submits incident, settings, token, invitation, or assistance mutations**.
Use a dedicated local/isolated fixture account; the report never includes credentials, saved
sessions, page text, request bodies, DOM fragments, or customer identifiers.

1. Install dependencies and a compatible Chromium (`npx playwright-core install chromium`, or
   set `UI_AUDIT_BROWSER` to an existing executable). The browser download is an explicit setup
   step, not something the audit silently performs.
2. Supply `UI_AUDIT_EMAIL`, `UI_AUDIT_PASSWORD`, and optional `UI_AUDIT_BASE_URL` through a private
   environment. Only HTTPS or loopback HTTP is accepted. For an ignored, mode-0600
   `.env.ui-audit` file, run `node --env-file=.env.ui-audit scripts/audit-workspace-ui.mjs`.
   Never put real credentials in command examples, committed files, CI output, or chat.
3. Seed at least one synthetic incident for the populated-path gate and set
   `UI_AUDIT_REQUIRE_INCIDENT=1`. Empty fixtures explicitly report the unavailable detail check;
   this option prevents an empty database from appearing to cover that workflow.
4. Reports go into ignored `.tmp/ui-audit/<run>/report.json`. `UI_AUDIT_RUN` names a run;
   `UI_AUDIT_QUICK=1` explicitly selects only desktop light / 320px dark, not the full matrix.
5. Screenshots are off by default. Enable `UI_AUDIT_CAPTURE=1` **only** with
   `UI_AUDIT_SYNTHETIC_DATA=1` on designated dummy data. Sensitive fields are masked even then.
   Capture failures are reported separately; inspect the images rather than treating automated
   checks as a visual sign-off. Custom CI Chromium arguments must not disable web security.

The full matrix covers 1440px light/dark, 1280px, 1024px, 768px, 390px light/dark, and 320px
light/dark. It gates completed routes, page overflow, WCAG A/AA axe checks (including label in
name), duplicate incident actions, first-screen incident visibility, and mobile search width.
Seven interaction groups exercise contextual/global search, printable-shortcut opt-out,
full-history fallback, independent filters, account/help focus, mobile section reachability,
and canonical-link copy focus. The harness waits for actual client interaction before testing
document keyboard bindings; it does not use `networkidle` or suppress browser errors.

Run mutation/error-path checks separately on isolated fixtures: server-action/API interruption,
pending deduplication, successful setup, one-time key display/copy/rotation, revocation, and
cleanup. A read-only visual harness cannot establish that writes succeed.

### Measured review, not a usability guarantee

The loop used a recorded baseline, layout review, workflow/error review, and repeated
responsive/accessibility checks with screenshot inspection. The initial incident-list first
link was 523px down at 1440px, 740px at 390px, and 788px at 320px. The final production audit
measured **385px, 572px, and 572px**, respectively, with one declaration action instead of two.
The 320×720 view now contains a full incident link, and overview’s actual priority-queue link
appears around 651px. The earlier overview baseline accidentally measured a banner CTA, so it
is deliberately **not** used as queue-row improvement evidence.

Current release gates: **832 tests / 55 files**, Prisma generation, TypeScript, optimized build,
and **90/90 production route/appearance/viewport checks plus seven read-only interaction groups**
passed. There were no page overflow findings, automated A/AA violations, runtime/console errors,
or failed captures in that production matrix. Unit regressions cover shortcut rules/search,
metadata-only token handling, settings setup surfaces, and clipboard fallback focus.

These results establish concrete regressions and layout improvements, not effortless use for
every person. Automated axe checks are not screen-reader, voice-control, or real-developer
usability studies; cross-browser and assistive-technology reviews remain important. Before
calling the experience frictionless, observe people finding, declaring, and updating incidents
and measure task completion/recovery without coaching.

Final production mutation/recovery verification also passed: **14 incident/shell groups,
5 onboarding/setup groups, and 7 settings/setup groups**, all with zero browser runtime errors.
The settings pass exercised interrupted webhook and invitation actions, retained token name/scope
on API failure, real endpoint creation and confirmed rotation/deletion, masked one-time secret
copy with preserved focus, and actual READ-scoped token creation/dismissal/revocation. Dedicated
fixtures were cleaned afterward; credential values were neither logged nor saved. Together with
the seven read-only harness groups, this records 33 workflow groups, not a real-user study.
