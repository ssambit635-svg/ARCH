# ARCH, explained simply

*No jargon, no diagrams you need a degree to read. Just what the product is, how it works, and how
the pieces fit together.*

---

## 1. The one-minute version

Think about what happens when a website goes down.

A monitoring tool beeps. Someone gets paged at 2 a.m. People scramble in a group chat. Nobody is
sure who is doing what. The support inbox fills with "is it down?" messages. Two hours later it is
fixed — and nobody can say exactly what happened, in what order, or for how long customers were
affected.

**ARCH is the room where that whole process happens, tidily.**

Three things live in that room:

1. **A logbook** — every incident, every update, every person who touched it, permanently recorded.
2. **A notice board** — a public status page your customers can read instead of emailing you.
3. **A rulebook** — who is allowed to do what, enforced by the server, not by politeness.

That's it. That's the product.

> Positioning line: **"ARCH is where your team goes when your application breaks."**

---

## 2. The journey of one alert (the whole product in 8 steps)

Follow a single alert from "something is wrong" to "post-mortem written".

| # | What happens | Who does it | What ARCH does behind the scenes |
|---|---|---|---|
| 1 | A monitor, a GitHub action or a Grafana rule fires | Your existing tools | `POST /api/webhooks/:provider` receives it |
| 2 | ARCH checks the signature | Nobody | HMAC compared against `AUTH_SECRET_WEBHOOK`; bad signature → `401`, nothing stored |
| 3 | An **incident** is born | System | Row written to `incidents` with severity + status `INVESTIGATING`, linked to a project/service |
| 4 | Someone is put in charge | Team lead / on-call | `assignedToId` set, `IncidentEvent(ASSIGNED)` + `AuditLog` written |
| 5 | The team works the problem | Responder | Each comment and status change is an `IncidentEvent` — the timeline |
| 6 | The status page updates | Admin (or responder, by plan) | Public `/status/<slug>` now shows `DEGRADED` or `OUTAGE` |
| 7 | It is fixed | Responder | Status → `RESOLVED`, `resolvedAt` stamped, customers notified by email |
| 8 | The trail is already written | Nobody | Every write since step 3 is in `audit_logs`, paginated and viewable by admins |

**Nothing in that list is optional, and nothing in that list requires a human to remember to
document it.** That is the point — the documentation is a side effect of doing the work.

---

## 3. How the software is built (four layers, top to bottom)

ARCH is deliberately a **modular monolith**: one application, cleanly separated inside. Not
microservices — that would be death by a thousand deployments for a v1 product.

```
┌─────────────────────────────────────────────────────────────┐
│  1. BROWSER                                                 │
│     Marketing pages · Dashboard · Public status page         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│  2. NEXT.JS APP ROUTER  (the only public door)               │
│     (marketing)  public landing + status pages               │
│     (auth)       login / register                            │
│     dashboard    authenticated app screens                   │
│     api/         route handlers — Zod-validate everything     │
└───────────────────────────┬─────────────────────────────────┘
                            │ function calls, never skipped
┌───────────────────────────▼─────────────────────────────────┐
│  3. SERVER LOGIC                                             │
│     lib/permissions.ts       RBAC gate on EVERY mutation     │
│     server/services/         business rules, state machine   │
│     server/repositories/     Prisma queries, always org-scoped│
└───────────────────────────┬─────────────────────────────────┘
                            │ SQL
┌───────────────────────────▼─────────────────────────────────┐
│  4. POSTGRESQL 16  (one database, many tenants)              │
└─────────────────────────────────────────────────────────────┘
```

**The one rule that keeps this sane:** a route handler never talks to the database directly. It
calls a *service*. The service calls a *repository*. The repository is the only place that knows
Prisma exists.

Why bother? Because when you must add "…but only if the user belongs to this organization" to
every query, you want one place to add it, not forty.

---

## 4. The part that actually makes it a SaaS: multi-tenancy

ARCH serves many companies from one running application. That is what makes it cheap to run — and
dangerous if done carelessly, because a bug in one query could show Company A the incidents of
Company B.

Three habits prevent that:

1. **Every tenant-owned table carries `organizationId`.** Not "usually" — always.
2. **Repositories demand it.** `listIncidents(organizationId, …)` — the parameter is required, so it
   is impossible to forget.
3. **Role and organization never come from the browser.** A malicious user could post
   `"organizationId": "someone-elses-id"`. The server ignores that and reads the membership from the
   session instead.

And one nice touch that keeps secrets safe: if you ask for an incident that belongs to another
organization, ARCH answers **404 Not Found**, not 403 Forbidden. A 403 would confirm the incident
exists — a small, free information leak. 404 reveals nothing.

---

## 5. Who can do what (the rulebook, in one table)

| Action | OWNER | ADMIN | RESPONDER | VIEWER |
|---|:--:|:--:|:--:|:--:|
| View incidents, status pages, audit log (own org) | ✅ | ✅ | ✅ | ✅ |
| Create / assign / resolve incidents, post timeline events | ✅ | ✅ | ✅ | ❌ |
| Manage projects & services | ✅ | ✅ | ❌ | ❌ |
| Invite / remove members, change roles | ✅ | ✅ | ❌ | ❌ |
| Manage webhooks & integrations | ✅ | ✅ | ❌ | ❌ |
| Publish the status page | ✅ | ✅ | ❌ | ❌ |
| Org settings, billing, delete organization | ✅ | ❌ | ❌ | ❌ |

Plain-English version of the roles:

- **OWNER** — the person whose card is on file. Can do everything, including closing the account.
- **ADMIN** — runs the tool day to day: people, integrations, what customers see.
- **RESPONDER** — the person on call. Works incidents, cannot change settings or people.
- **VIEWER** — read-only. Stakeholders, auditors, the support lead who wants context.

This table exists in exactly one place in the code (`lib/permissions.ts`). If the table and the code
ever disagree, the code is wrong.

---

## 6. The incident state machine (why you can't jump to "fixed")

An incident moves through four states and can go back, but not sideways into nonsense:

```
INVESTIGATING ──▶ IDENTIFIED ──▶ MONITORING ──▶ RESOLVED
      ▲                                            │
      └────────────── reopen ◀─────────────────────┘
```

- `INVESTIGATING` — we know something is wrong; we don't know what.
- `IDENTIFIED` — we know the cause.
- `MONITORING` — a fix is out; we are watching it hold.
- `RESOLVED` — it is over. `resolvedAt` is stamped. (Reopening is allowed and recorded — it happens.)

Illegal moves (say `INVESTIGATING → RESOLVED`) are rejected by the service layer, not merely hidden
in the UI. **The UI is a convenience; the server is the law.**

Every legal transition writes two things: an `IncidentEvent` (visible timeline) and an `AuditLog`
(invisible, tamper-evident history). That is what makes ARCH usable in a post-mortem, and in a
customer dispute about downtime credits.

---

## 7. The public status page

`/status/<slug>` is ARCH's shop window: unauthenticated, fast, and readable by a non-technical
customer. It shows each service as `OPERATIONAL`, `DEGRADED`, `OUTAGE` or `MAINTENANCE`, plus the
incidents that affect it.

Deliberate decisions:

- **Published or invisible.** If `isPublished` is false, the page is a `404` — half-built status
  pages never leak.
- **Pick what you show.** `StatusPageService` lets you choose which services appear, under a nicer
  display name ("Checkout" instead of `svc-checkout-prod-2`).
- **No internal notes.** Timeline events marked internal stay internal; the public page shows
  customer-safe wording you control.
- **It should never be the thing that is down.** It is a static-friendly route, cached, with no
  dependency on the dashboard's heavier code paths.

---

## 8. How alerts get in (webhooks)

`POST /api/webhooks/:provider` is the front door for machines.

```
Provider (GitHub / Sentry / Grafana / generic)
        │  payload + signature
        ▼
  verify HMAC signature  ──fail──▶ 401, nothing stored
        │  pass
        ▼
  reject stale timestamp ─fail──▶ 401
        │  pass
        ▼
  find WebhookEndpoint by (provider, externalId)
        │
        ▼
  create or update Incident  →  timeline + audit log
```

Rules that matter: only a **hash** of the secret is stored (`secretHash`), never the secret itself;
signatures are checked **before** the payload is parsed; and unsigned or stale requests are dropped
silently from the customer's point of view.

---

## 9. What ARCH is *not* (scope discipline)

Saying no is what makes v1 shippable. ARCH is not:

| Not this | Why not |
|---|---|
| An AI model / code generator / debugger | We are the workflow around the fix, not the fix |
| A hosting platform or CI/CD | That is Vercel/GitHub's job; we integrate, we don't compete |
| A Kubernetes manager | Deep infrastructure tooling is a different company |
| A billing system | Stripe handles money; ARCH stays out of it in v1 |
| A replacement for GitHub / Slack / AWS | We sit between them and make them coherent |
| A real-time chat product | Timeline comments, yes. Chat, no |
| Microservices | One deployable, four clean layers |

---

## 10. Milestones (what "done" looks like, in order)

Each milestone is a thin vertical slice: database → server logic → API → UI → test.

1. **Setup + DB + auth** — `docker compose up`, migrate, register/login, `/api/health` = 200.
2. **Organizations + membership** — create an org (you become OWNER), invite a teammate.
3. **RBAC enforced** — the rulebook table above, in code, with cross-tenant requests returning 404.
4. **Projects & services** — describe what you run, each with a live status.
5. **Incidents + timeline** — create, assign, transition, comment; illegal transitions rejected.
6. **Public status page** — publish/unpublish; unpublished returns 404.
7. **Webhook ingestion** — signature verified; invalid signature rejected.
8. **Notifications** — `PENDING → SENT/FAILED`, one retry, email adapter.
9. **Audit logs** — every mutation recorded, admin-viewable, paginated.
10. **Hardening** — rate limits, error boundaries, empty/loading states, tests green, deploy docs.

Full detail: [`product/ROADMAP.md`](product/ROADMAP.md).

---

## 11. Jargon decoder

| Term | Plain meaning |
|---|---|
| **Tenant** | One customer company; here, one `Organization` row |
| **Multi-tenant** | Many customers share one running app, isolated logically |
| **RBAC** | Role-based access control — the "who can do what" table |
| **HMAC** | A shared-secret signature that proves a webhook really came from your tool |
| **Modular monolith** | One app, cleanly divided internally; opposite of microservices |
| **Repository layer** | The only code allowed to write database queries |
| **Service layer** | Where business rules live (state machine, permissions) |
| **State machine** | The allowed moves for an incident's status |
| **Audit log** | Immutable record of who did what, when |
| **Idempotent failure** | Retrying a webhook doesn't create a duplicate incident |
| **DPDP Act 2023** | India's data protection law, which ARCH must comply with |
| **DPA** | Data Processing Addendum — the contract addendum about personal data |
| **SLA** | Service Level Agreement — our uptime and response promises |

---

## 12. Where to go next

- The build contract for engineers and coding agents → [`../AGENTS.md`](../AGENTS.md)
- Why these choices were made → [`engineering/ARCHITECTURE.md`](engineering/ARCHITECTURE.md)
- What we build, in what order → [`product/ROADMAP.md`](product/ROADMAP.md)
- What it costs → [`product/PRICING.md`](product/PRICING.md)

---

*Owner: Product · Last reviewed: 2026-09-23 · Review cadence: 90 days*
