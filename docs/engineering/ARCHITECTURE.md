# ARCH — Architecture

**Version:** 1.0 · **Owner:** Engineering · **Last reviewed:** 2026-09-23
**Canonical build contract:** [`../../AGENTS.md`](../../AGENTS.md) (stack, schema, coding rules).
This document explains *why* the system is shaped the way it is, and how requests actually flow.

---

## 1. Architectural stance in one paragraph

ARCH is a **modular monolith with strict internal layering**, deployed as a single Next.js
application backed by one PostgreSQL database shared by all tenants. There are exactly four layers —
HTTP handlers, services, repositories, database — and arrows only ever point downward. Tenancy is
enforced at the *repository* layer because that is the only place that talks to SQL, and permissions
are enforced at the *service* layer because that is the only place that knows the business rules.
Microservices, event buses and AI were deliberately rejected for v1: they would multiply operational
surface without solving a customer problem that exists yet.

---

## 2. Component map

```
                          ┌──────────────────────────────┐
  Customer browser ──────▶│  Public status page          │  no auth, cached, must never
  (unauthenticated)       │  /status/<slug>              │  depend on dashboard internals
                          └──────────────┬───────────────┘
                                         │
  Team browser ──────────▶┌──────────────▼───────────────┐
  (authenticated)         │  Marketing + Auth            │  (marketing), (auth)
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │  Dashboard (server components)│  incidents, status, settings, audit
                          └──────────────┬───────────────┘
                                         │
   External tools ───────▶┌──────────────▼───────────────┐
   GitHub / Sentry /      │  /api/* route handlers       │  Zod validation at the edge
   Grafana / generic      │  + HMAC verification          │
                          └──────────────┬───────────────┘
                                         │  (never Prisma directly)
                          ┌──────────────▼───────────────┐
                          │  Services  (business rules)   │
                          │  incident · organization ·    │
                          │  statusPage · webhook ·       │
                          │  notification                 │
                          └──────────────┬───────────────┘
                                         │  requirePermission() gate on every mutation
                          ┌──────────────▼───────────────┐
                          │  Repositories (Prisma)        │  organizationId REQUIRED param
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │  PostgreSQL 16                │  one DB, many tenants
                          └──────────────────────────────┘
                                         │
                    ┌────────────────────┴─────────────────────┐
                    ▼                                          ▼
            Email provider (adapter)                  Background job (later only)
```

**Dependency rule:** a lower layer never imports from a higher one. `service` never imports a route
handler; `repository` never imports a service; nothing but repositories imports Prisma.

---

## 3. Request lifecycle (the path every mutation takes)

Example: `PATCH /api/incidents/:id` moving an incident from IDENTIFIED to MONITORING.

```
1. Next.js route handler receives PATCH /api/incidents/inc_123
2. Session resolved (Auth.js)                ── no session ──▶ 401
3. Body parsed; Zod schema validates shape   ── invalid ──────▶ 400 with field errors
4. incidentService.transition(id, input, actor)
      a. Load incident with organizationId = actor's org   ── not found ──▶ 404 (never 403)
      b. requirePermission(orgId, actor, "incident.write") ── denied ─────▶ 403
      c. Validate transition against state machine         ── illegal ──▶ 422 with allowed next states
      d. Open a transaction:
           • update incident.status, set/clear resolvedAt
           • insert IncidentEvent(STATUS_CHANGED, metadata {from, to})
           • insert AuditLog(action "incident.status_changed")
           • insert Notification rows (PENDING)
         commit — all four writes or none
      e. Hand PENDING notifications to the delivery path (fire-and-forget)
5. Handler shapes the response (never leaks internal fields)
6. Structured log line with request id, org id, actor id, action, duration
```

Six properties fall out of this shape, and they are the reason it is worth the ceremony:

| Property | Where it is guaranteed |
|---|---|
| Cross-tenant reads are impossible | Step 4a — org id is part of the *query*, not a post-filter |
| Unauthorized mutation is impossible | Step 4b — checked in the service, not the UI |
| Impossible states are impossible | Step 4c — one state machine, server-side |
| Partial writes never happen | Step 4d — one transaction |
| Every change is explainable later | Step 4d — audit entry in the same transaction |
| Operations are debuggable | Step 6 — structured, correlated logs |

---

## 4. Multi-tenancy: how isolation is actually enforced

Three mechanisms, all mandatory:

**M1 — Row ownership.** Every tenant table has a non-nullable `organizationId`, indexed, and part of
the composite indexes used by list queries (`[organizationId, status]`, `[organizationId, createdAt]`).

**M2 — API shape forces the argument.** Repository functions take `organizationId` as a *required*
first parameter. There is no `findIncidentById(id)` in the codebase — only
`findIncidentById(organizationId, id)`. Making the unsafe call impossible beats documenting that it
is unsafe.

**M3 — Server-derived identity.** The organization and role come from the session's `Membership`
row. If a client posts `organizationId`, the value is ignored (and logged as suspicious if it
differs from the session's).

**The 404-not-403 rule:** requesting another tenant's resource returns `404 Not Found`. A `403`
would confirm existence, which is an information leak. This also makes probing pointless: to an
attacker, "not yours" and "doesn't exist" are indistinguishable.

**Test-enforced:** the isolation suite (below) is a CI gate. If it fails, nothing merges.

---

## 5. Incident state machine

```
        ┌─────────────────────────────────────────────────┐
        │                                                 │
        ▼                                                 │
  INVESTIGATING ──▶ IDENTIFIED ──▶ MONITORING ──▶ RESOLVED─┘  (reopen)
        │               │              │
        └───────────────┴──────────────┘
              (forward skips allowed:
               INVESTIGATING → RESOLVED, IDENTIFIED → RESOLVED)
```

Implemented as a single exported map — one source of truth, unit-tested:

```ts
export const INCIDENT_TRANSITIONS = {
  INVESTIGATING: ["IDENTIFIED", "MONITORING", "RESOLVED"],
  IDENTIFIED:    ["MONITORING", "RESOLVED"],
  MONITORING:    ["RESOLVED"],
  RESOLVED:      ["INVESTIGATING"],   // reopen
} as const;
```

`resolvedAt` is stamped on the transition into `RESOLVED` and cleared on reopen. Illegal transitions
return **422** with the list of legal next states, so an API consumer can self-correct — a better
developer experience than a bare rejection, and it costs nothing.

---

## 6. Data model relationships (the important edges)

```
User ──< Membership >── Organization ──< Project ──< Service
                            │                          │
                            ├──< Incident >── Service  │
                            │       │                  │
                            │       └──< IncidentEvent │
                            ├──< StatusPage >── StatusPageService ──┘
                            ├──< WebhookEndpoint
                            ├──< AuditLog
                            └──< Notification >── Incident (optional)
```

Notes that matter in practice:

- **`Membership` is the tenancy hinge.** One user, many organizations, one role per organization.
- **`IncidentEvent` is append-only.** Never updated, never deleted — it is the timeline and the raw
  material for post-mortems.
- **`AuditLog` is separate from `IncidentEvent` on purpose.** The timeline is a product feature
  (visible, human-readable, sometimes public). The audit log is a trust feature (complete, internal,
  structured). They answer different questions.
- **`WebhookEndpoint` stores `secretHash`, never the secret.** Unique on `(provider, externalId)`.
- **Cascade choices:** `Organization` deletion cascades to its data; `Incident.serviceId` uses
  `SetNull` so deleting a service never deletes incident history. Losing a service must not lose the
  record of an outage.

---

## 7. Folder structure and where code belongs

```
src/
  app/
    (marketing)/page.tsx         public landing
    (auth)/login/ register/      auth screens
    dashboard/                   authenticated app
      incidents/ status/ settings/ audit/
    status/[slug]/page.tsx       PUBLIC, unauthenticated, cached
    api/
      auth/[...nextauth]/route.ts
      health/route.ts            liveness — must stay dependency-light
      organizations/route.ts
      incidents/route.ts  incidents/[id]/route.ts  incidents/[id]/events/route.ts
      webhooks/[provider]/route.ts
      status-pages/route.ts  status-pages/[id]/publish/route.ts
      status-pages/public/[slug]/route.ts
      audit/route.ts
  components/ui/  components/incidents/  components/status/
  lib/db.ts  lib/auth.ts  lib/permissions.ts  lib/validation.ts  lib/audit.ts
  server/
    services/*.service.ts        business rules, transactions, permission gates
    repositories/*.repository.ts org-scoped Prisma queries
prisma/schema.prisma
docker-compose.yml
```

**Placement rules:**
| If the code… | it belongs in |
|---|---|
| Validates an HTTP payload | the route handler (`lib/validation.ts` schema + handler) |
| Decides whether an action is allowed | `lib/permissions.ts` via the service |
| Enforces a business rule (state machine, limits) | `server/services/` |
| Writes SQL / touches Prisma | `server/repositories/` |
| Renders pixels | `components/` or a page |
| Is used by two features and has no rules | `lib/` |

---

## 8. Security architecture (summary — full version in `SECURITY-AND-COMPLIANCE.md`)

| Layer | Control |
|---|---|
| Transport | HTTPS only; HSTS |
| Session | Auth.js sessions, httpOnly + secure + sameSite cookies |
| Passwords | Strong adaptive hash (bcrypt/argon2); never logged, never returned |
| Authorization | `requirePermission` on every mutation; matrix in one file |
| Input | Zod on every body, query param and webhook payload |
| Webhooks | HMAC verification **before** parsing; timestamp freshness; `secretHash` only |
| Output | Response shaping — no internal fields, no hashes, no tokens |
| Data | Org-scoped queries only; 404 for foreign resources |
| Audit | Every mutation recorded in the same transaction |
| Rate limits | Auth endpoints and webhooks (Milestone 10) |
| Secrets | Environment only; `.env` never committed; rotation documented |

---

## 9. Failure modes and how the system behaves

| Failure | Behaviour | Why it is acceptable |
|---|---|---|
| Email provider down | Notifications stay `PENDING`/`FAILED`, retried once, visible to admins | Incident management keeps working; only the courtesy email is late |
| Webhook provider sends garbage | 401 or 400, nothing written | Bad data never enters the system |
| Same webhook delivered twice | Idempotent — no duplicate incident | Providers retry aggressively; duplicates are normal |
| Database unreachable | 5xx with a friendly error page; status page served from cache if available | We fail loudly and honestly rather than showing stale incidents as truth |
| Another tenant's ID guessed | 404 | No existence disclosure |
| Malicious payload | Zod rejects; request logged | Validation is the boundary |
| Auth provider (GitHub) down | Email/password still works | Never single-provider dependent |
| Our own incident | Runbook: `OPERATIONS-RUNBOOK.md`, status page first | We should be our own best customer |

---

## 10. Performance and caching

| Surface | Strategy | Budget |
|---|---|---|
| Public status page | Cache the rendered page; invalidate on publish/status change; no per-request auth or heavy joins | < 200 ms p95 |
| Incident list | Composite indexes `[organizationId, status]` and `[organizationId, createdAt]`; cursor pagination; select only needed columns | < 400 ms p95 at 10k incidents/org |
| Audit list | Index `[organizationId, createdAt]`, keyset pagination | < 500 ms p95 |
| Dashboard aggregate (overview) | Cheap COUNT queries or a small materialised summary later | < 300 ms p95 |
| `/api/health` | No DB round-trip on the hot path | < 50 ms |

**Status page is the only heavily cached surface** — and it must be *correct*. Cache invalidation on
any write that affects a published page is a hard requirement, not an optimisation.

---

## 11. Scaling path (in order, only as needed)

1. **Vertical + pool.** Bigger Postgres, connection pooling (PgBouncer or the provider's pooler).
2. **Read replica** for status pages and dashboards if read load becomes the bottleneck.
3. **Split the public status page** into its own statically-cached surface (it has no write path).
4. **Background jobs** for notifications — the first genuine async need, when volume justifies it.
5. **Partition audit/incident tables by time** when retention windows create large tables.
6. **Extract a service only when a module has a genuinely different scaling or failure profile** —
   never because the diagram looks nicer. Not before a measured need.

---

## 12. Testing strategy

| Suite | What it proves | When it runs |
|---|---|---|
| **Permission matrix** | Every role × every action, both allowed and denied | CI, blocking |
| **Tenant isolation** | Cross-org ID, cross-org slug, tampered body org id → 404/ignored | CI, blocking |
| **State machine** | Every legal transition works; every illegal one is rejected | CI, blocking |
| **Webhook signatures** | Valid accepted; invalid, stale, missing → 401 with nothing stored | CI, blocking |
| Service unit tests | Business rules in isolation (limits, lifecycle, idempotency) | CI |
| Notification lifecycle | PENDING → SENT / FAILED, one retry | CI |
| E2E (Playwright) | Signup → org → incident → resolve → status page visible | Pre-release |
| Accessibility | WCAG AA checks on dashboard forms + status page | CI (non-blocking at first, blocking by v1.1) |
| Load smoke | Public status page under dashboard load | Pre-release |

Runner: **Vitest** for units/integration, **Playwright** for E2E. A failing blocking suite means the
change does not ship — including for the founders.

---

## 13. Decision log (ADR-lite)

| # | Decision | Why | Revisit when |
|---|---|---|---|
| D1 | Modular monolith, not microservices | One deployable is a superpower with a small team; module boundaries give most of the benefit | A module needs independent scaling *and* we employ more than one team |
| D2 | Next.js App Router for both UI and API | One language, one deploy, server components for cheap reads | Never — unless a public API needs a separate contract-first service |
| D3 | PostgreSQL + Prisma | Relational data, transactions for incident+event+audit, typed client | Never for the primary store |
| D4 | Auth.js for identity | Boring, well-audited, supports credentials + OAuth | A customer needs SAML (v2, gated) |
| D5 | 404 for foreign resources | Prevents existence disclosure | Never |
| D6 | Repository layer owns all SQL | One place to enforce tenancy forever | Never |
| D7 | Audit log separate from incident timeline | Different audiences and lifecycles | Never |
| D8 | Email behind an adapter, console in dev | Dev works offline; provider swap is a config change | Adding Slack (v1.1) |
| D9 | No AI in v1 | Not the differentiator; adds data-handling risk before trust exists | Timeline data is rich and clean (v2, gated) |
| D10 | Status page cached, invalidated on write | Fast for customers, correct for us | If invalidation proves flaky, move to short TTL + revalidate |
| D11 | V2 Copilot output is a persisted draft (`AiSuggestion`), applied only on human approval | Trust: AI never changes an incident, status page or notification by itself; drafts are auditable | Never for customer-facing output |
| D12 | Copilot context is whitelisted + redacted in `src/server/ai/context.ts`, which is pure (no DB access) | Tenancy stays enforced by repositories; nothing in `ai/` can read across orgs; triage uses opaque member refs | If a task genuinely needs more fields — add them to the whitelist explicitly |
| D13 | Providers are plain in-process engines over a tiny interface (`arch`, `mock`); vendor adapters over plain `fetch` were removed | No SDK lock-in; dev + tests run offline and deterministic; nothing in the binary can call a model vendor | A customer explicitly demands a vendor integration (would be a new, opt-in decision) |
| D14 | V3: ARCH's own model (`AI_PROVIDER="arch"`) is the default; external AI vendors are refused while `ARCH_OFFLINE_ONLY=true` | Incident data and code stay on the customer's server, at zero marginal cost and with no GPU | A customer explicitly opts into a vendor |
| D15 | Native model = Naive Bayes + TF-IDF retrieval + templates in pure TypeScript, one JSON artifact per org in Postgres | Trains in under 1 s on CPU, is explainable, is measured on a holdout, and adds no new infrastructure or Python | Holdout accuracy plateaus below usefulness, or customers want generative quality without a local LLM |
| D16 | *(superseded)* The optional local LLM (Ollama / llama.cpp) hybrid mode was **removed**: there is one engine (ARCH native) plus a built-in agent loop (planner → native tools → sandboxed Python self-correction) | One dependency-free engine to reason about, no second server to operate, no mode where two models disagree | Bundling a small in-process generative model becomes viable on CPU |
| D17 | No third-party postmortem text is committed; public corpora are fetched at run time into git-ignored `model-data/` | Upstream licences (none / GPL-3.0) do not permit redistribution | Licensed or original corpora become available |

---

## 14. Known trade-offs we are accepting

- **One database for all tenants** means a runaway query can affect everyone. Mitigated by indexes,
  pagination and per-request limits; solved properly only by sharding, which we do not need.
- **Server-rendered dashboard** is less snappy than a SPA for rapid incident triage. We trade
  spinniness for reliability, and revisit only with measured user complaints.
- **No real-time updates** (no websockets) in v1. Two responders may need a refresh to see each
  other's updates. Acceptable now; polling is the cheap next step.
- **Notifications are fire-and-forget.** A process restart can lose a not-yet-sent notice — the row
  stays `PENDING` and is recoverable, but only when the job runner exists (Milestone 8+).
- **No billing integration**, so plan enforcement is manual at first. Deliberate: we would rather
  bill 20 customers by invoice than build a payments system before validating pricing.

---

*Owner: Engineering · Review cadence: 90 days · Related: `../../AGENTS.md`, `SECURITY-AND-COMPLIANCE.md`, `OPERATIONS-RUNBOOK.md`*
