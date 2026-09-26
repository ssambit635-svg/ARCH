# ARCH

**"ARCH is where your team goes when your application breaks."**

ARCH is a multi-tenant **incident management + public status page** SaaS for developer teams.
One alert comes in, and ARCH carries it all the way through: incident created → assigned to a
responder → timeline collaboration → resolution → public status page updated → audit trail preserved.

| | |
|---|---|
| **Category** | Incident management / status page SaaS (DevOps tooling) |
| **Buyer** | CTO, VP Engineering, SRE lead, on-call lead at a 10–200 engineer company |
| **User** | On-call engineer, SRE, support lead, engineering manager |
| **Wedge** | Fast to set up, honest pricing, audit-ready trail — without the enterprise bloat |
| **Status** | Pre-launch · v0.1.0 · P0 feature-complete (milestones 1–10 of AGENTS.md) |
| **Model** | B2B SaaS subscription, per organization, tiered by seats + monitored services |

---

## What it does in five lines

1. **Ingests alerts** from your existing tools (webhook → HMAC-verified → incident).
2. **Runs the response** as a real state machine: `INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED`.
3. **Keeps a timeline** of every comment, assignment and status change, with an audit log underneath.
4. **Publishes a status page** your customers can read, so you stop answering "is it down?" by hand.
5. **Keeps tenants separate** — every query is scoped to one organization, enforced on the server.

ARCH is explicitly **not**: an AI model, an IDE, a code generator, a debugger, a hosting platform,
a CI/CD system, a Kubernetes manager, a billing system, or a replacement for GitHub / Slack / AWS.

---

## Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict) |
| Framework | Next.js 14+ App Router |
| Styling | Tailwind CSS |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Validation | Zod |
| Auth | Auth.js (NextAuth v5) |
| Email | Adapter-based (console in dev, Resend in prod) |
| Jobs | Postgres-backed outbox + `npm run worker` (no Redis) |

---

## Repository map

The written spec and the implementation live side by side: documents in `docs/`, code in `src/`.

```
ARCH/
├── AGENTS.md                     # Engineering contract for coding agents (stack, schema, rules)
├── AGENTS-V2.md                  # V2 contract: ARCH Copilot + Slack/status-page improvements
├── README.md                     # You are here
├── CHANGELOG.md                  # Version history, Keep-a-Changelog format
├── CONTRIBUTING.md               # How to work in this repo
├── CODE_OF_CONDUCT.md            # Contributor Covenant 2.1
├── SECURITY.md                   # Vulnerability disclosure policy
├── LICENSE                       # Proprietary — all rights reserved
├── prisma/
│   ├── schema.prisma             # Data model (AGENTS.md §4)
│   └── migrations/               # SQL migrations, applied by scripts/db-migrate.mjs
├── scripts/                      # setup, dev orchestrator, embedded Postgres, migration runner
├── src/
│   ├── app/                      # App Router: (marketing) (auth) dashboard status/[slug] api/
│   ├── components/               # UI primitives, forms, dashboard + incident widgets
│   ├── lib/                      # env, db, errors, permissions, validation, audit, api, session
│   ├── server/
│   │   ├── repositories/         # one per aggregate; every query is organization-scoped
│   │   └── services/             # business rules (RBAC, state machine, tenancy)
│   └── worker/                   # notification outbox drain loop
├── tests/                        # vitest: permission matrix, transitions, tenancy, webhooks
└── docs/
    ├── README.md                 # Documentation map — start here
    ├── EXPLAINED-SIMPLY.md       # The whole product in plain English
    ├── product/                  # What we build and why
    │   ├── PRD.md                # Product requirements
    │   ├── FEATURES.md           # Feature list with priorities
    │   ├── USER-STORIES.md       # Stories + acceptance criteria
    │   ├── ROADMAP.md            # v0.1 → v1.0 → beyond
    │   ├── PRICING.md            # Plans, limits, rationale
    │   └── METRICS.md            # North-star and KPI tree
    ├── engineering/              # How it is built and run
    │   ├── ARCHITECTURE.md       # Layers, requests, tenancy, failure modes
    │   ├── SECURITY-AND-COMPLIANCE.md
    │   └── OPERATIONS-RUNBOOK.md # Deploy, backup, on-call, our own incidents
    ├── go-to-market/             # How it reaches customers
    │   ├── GTM-PLAN.md
    │   ├── COMPETITIVE-ANALYSIS.md
    │   └── BRAND-GUIDE.md
    ├── legal/                    # Customer-facing legal set
    │   ├── PRIVACY-POLICY.md
    │   ├── TERMS-OF-SERVICE.md
    │   ├── DATA-PROCESSING-ADDENDUM.md
    │   ├── SERVICE-LEVEL-AGREEMENT.md
    │   ├── COOKIE-POLICY.md
    │   └── ACCEPTABLE-USE-POLICY.md
    └── support/                  # Customer-facing help
        ├── FAQ.md
        ├── SUPPORT-POLICY.md
        └── CUSTOMER-ONBOARDING.md
```

---

## Getting started (reading order)

**If you are a new engineer or AI agent:** read `AGENTS.md` first (it is the build contract), then
`docs/engineering/ARCHITECTURE.md`, then `docs/product/FEATURES.md`. Then start Milestone 1 of
`docs/product/ROADMAP.md`.

**If you are a founder, designer or marketer:** read `docs/EXPLAINED-SIMPLY.md`, then
`docs/product/PRD.md`, `docs/product/PRICING.md` and `docs/go-to-market/GTM-PLAN.md`.

**If you are a customer or evaluating ARCH:** read `docs/support/FAQ.md`,
`docs/legal/TERMS-OF-SERVICE.md` and `docs/legal/SERVICE-LEVEL-AGREEMENT.md`.

---

## Local development

```bash
cp .env.example .env          # then set AUTH_SECRET and AUTH_SECRET_WEBHOOK
npm install
npm run setup                 # starts Postgres, generates the Prisma client, applies migrations
npm run db:seed               # optional: demo org, incidents, status page, webhook endpoint
npm run dev:all               # http://localhost:3000
npm run worker                # second terminal: drains the notification outbox
```

`npm run setup` uses a **Docker** Postgres when one is available; in a sandbox without Docker it
starts a local embedded PostgreSQL (data in `ARCH_DEV_DB_DIR`, default under `/tmp`) — same URL,
same commands. Day-to-day:

| Command | What it does |
|---|---|
| `npm run dev` | Next.js only (assumes the database is already up) |
| `npm run db:up` / `db:down` / `db:status` | Embedded Postgres lifecycle |
| `npm run db:migrate` / `db:reset` | Apply migrations — `/` `--reset` drops and rebuilds |
| `npm run db:seed` | Idempotent demo data (owner/admin/responder/viewer accounts) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest against a real, separate test database |
| `npm run worker` | Outbox drain (add `-- --once` for a single pass) |

Environment variables are documented in `AGENTS.md` §2. Never commit secrets — `.env` stays local.
Production requires `AUTH_SECRET` and `AUTH_SECRET_WEBHOOK`; the app refuses to boot with the
placeholder values.

### API in one table

Everything is JSON under `/api`. Success is `{ "data": ... }`; failures are
`{ "error": { "code", "message", "issues?" } }` with `401` unauthenticated, `403` wrong role,
`404` cross-tenant or missing, `409` illegal transition, `422` validation, `429` rate limited.

| Area | Routes |
|---|---|
| Health | `GET /api/health` (database + GitHub mode, no token) |
| Auth | `/api/auth/*` (Auth.js), `POST /api/auth/register` |
| Organizations | `/api/organizations`, `/api/organizations/{id}`, `/members`, `/invitations` |
| Invitations | `GET /api/invitations/{token}`, `POST /api/invitations/{token}/accept` |
| Projects & services | `/api/projects`, `/api/services` (+ `/{id}`), `?organizationId=` |
| Incidents | `/api/incidents` (+ `/{id}`, `/{id}/events`) — filters `q`, `status`, `severity`, `open`, `projectId`, `page`, `pageSize` |
| Status pages | `/api/status-pages` (+ `/{id}`, `/{id}/publish`), public `GET /api/status-pages/public/{slug}`, page `/status/{slug}` |
| Webhooks | `POST /api/webhooks/{provider}?endpoint={externalId}` (HMAC only), `/api/webhook-endpoints` (+ `/{id}/rotate`, `/{id}/deliveries`) |
| Audit | `GET /api/audit` (OWNER/ADMIN, paginated, `?summary=true`) |
| Copilot (V2) | `POST /api/incidents/{id}/copilot/{summary,triage,status-draft,postmortem}`, `GET /api/incidents/{id}/copilot/suggestions?status=`, `POST /api/copilot/suggestions/{id}/{approve,dismiss}` |
| ARCH Model + Code Assist (V3) | `POST /api/incidents/{id}/copilot/code-fix` (`{attachment?}`), `POST /api/copilot/code-review` (`{code, mode?, language?}`), `GET /api/copilot/model`, `POST /api/copilot/model/train` (OWNER/ADMIN) |

Webhook senders sign `"{timestamp}.{rawBody}"` with the endpoint secret and send
`X-Arch-Signature: t=<unix>,v1=<hex>`; GitHub-style `X-Hub-Signature-256` is also accepted.
Requests older than `WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS` are rejected, repeat deliveries are
recorded once, and every attempt (accepted, duplicate, rejected, failed) lands in the delivery log.

### Roles

| Action | OWNER | ADMIN | RESPONDER | VIEWER |
|---|---|---|---|---|
| Read incidents, projects, services, status pages, members | ✅ | ✅ | ✅ | ✅ |
| Change incidents, comment, assign | ✅ | ✅ | ✅ | — |
| Manage projects/services, members, webhooks, publish status pages | ✅ | ✅ | — | — |
| Organization settings, delete organization | ✅ | — | — | — |
| Read audit log | ✅ | ✅ | — | — |
| Read ARCH Copilot drafts | ✅ | ✅ | ✅ | ✅ |
| Request, approve or dismiss ARCH Copilot drafts | ✅ | ✅ | ✅ | — |
| Use Code Assist | ✅ | ✅ | ✅ | — |
| Retrain the ARCH model | ✅ | ✅ | — | — |

Enforced server-side on every request (`src/lib/permissions.ts`); the UI only hides what the API
would refuse anyway. Cross-tenant ids answer `404`, never `403`.

### ARCH Copilot (V2)

AI assistance inside the incident workspace — spec in [`AGENTS-V2.md`](AGENTS-V2.md). From an
incident page a responder can ask for a **summary** (≤ 5 bullets), a **triage** suggestion
(severity + assignee), a customer-safe **status-update draft**, or a **postmortem** draft
(Timeline / Impact / Root cause / Action items).

- **Always a draft.** Output is stored as a `PENDING` `AiSuggestion`. Nothing touches the incident,
  the status page or notifications until a RESPONDER+ approves it (text can be edited first).
  Approving posts to the timeline — or, for triage, applies severity/assignee through the normal
  incident service. Dismissed drafts are kept for the audit trail.
- **Minimal, redacted context.** Only the incident title, severity, status, times, affected service
  name and timeline entries are sent — after credentials, emails and long hex tokens are redacted.
  No ids, names or other tenants' data; triage candidates are opaque refs mapped back server-side.
- **Guardrails.** 15 s timeout per attempt, one retry, schema-validated output, then a friendly
  `503`. Status drafts are scrubbed of hostnames/IPs/URLs after generation. 20 calls/min per org.
  Every generate, failure, approve and dismiss writes an audit entry with token usage.
- **Providers.** Since V3 the default is **ARCH's own model** (`AI_PROVIDER="arch"`), see below.
  `"mock"` is used by the tests. `"openai"` / `"anthropic"` still exist but are refused while
  `ARCH_OFFLINE_ONLY="true"`. Code lives in `src/server/ai/`; prompts only in `src/server/ai/prompts.ts`.

### ARCH Model + Code Assist (V3): no external AI

Copilot runs on **ARCH's own AI**, on your server: free, CPU-only, no API key. Incident data and
code never go to OpenAI or Anthropic. Full guide: [`docs/engineering/ARCH-MODEL.md`](docs/engineering/ARCH-MODEL.md).

- **ARCH native model (default).** Classifiers and similar-incident retrieval trained on *your*
  resolved incidents, a built-in library of 44 failure patterns, and optionally about 340 public
  postmortems. It retrains automatically (worker) or on demand (`/dashboard/model`, OWNER/ADMIN).
  Drafts cite what fixed similar incidents before.
- **Optional local LLM** (`AI_PROVIDER="arch-hybrid"`). An open-source model such as
  `qwen2.5-coder:7b` runs via Ollama or llama.cpp on the same machine (8–16 GB RAM, no GPU) for
  fluent drafts and code rewrites. If it is slow or down, the ARCH model answers.
- **Code fix in the incident panel.** Paste a stack trace or snippet to get a diagnosis, the first
  frame in your code, fixes and a patch.
- **Code Assist** (`/dashboard/code`). Paste code to get a review, a safer version, or a
  stack-trace explanation. Secrets are detected and never echoed, and code is not stored.

```bash
npm run model:fetch-public     # optional: download public postmortems (git-ignored, check licences)
npm run model:train            # train every workspace now (the worker also does this hourly)
npm run model:eval             # offline accuracy report, no database needed
npm run model:export-finetune -- --org <slug>   # JSONL to fine-tune the local LLM
```

---

## Document conventions

- Legal documents use placeholders in `[SQUARE BRACKETS]` for entity details, addresses, dates and
  jurisdiction. Replace them before publishing to customers — see `docs/legal/README-NOTES.md`.
- Pricing figures are working hypotheses, not commitments.
- Every document lists an owner and a "last reviewed" date; review cadence is 90 days.
