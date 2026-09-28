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

ARCH is explicitly **not**: a general-purpose chatbot, a code generator, an IDE, a debugger, a
hosting platform, a CI/CD system, a Kubernetes manager, a billing system, or a replacement for
GitHub / Slack / AWS.

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
cp .env.example .env && chmod 600 .env  # set distinct random AUTH_SECRET / AUTH_SECRET_WEBHOOK
npm ci
npm run dev                             # Postgres + migrations + Next.js; register at /register
npm run worker                          # optional second terminal: notification outbox
```

`npm run dev` is the one command that has to work on a fresh machine: it generates the Prisma client,
makes sure a database is reachable, applies migrations, and then starts Next.js. It uses a **Docker**
Postgres when one is already running; otherwise it starts a local embedded PostgreSQL (data in
`ARCH_DEV_DB_DIR`, default under `/tmp`). The database runs **only while the process is alive**, and
`/tmp` can be lost when the sandbox resets; use managed PostgreSQL and a stable URL for durable
staging/production. No demo users are created automatically — sign up at `/register`. (`npm run
dev:all` is an alias kept for existing scripts; `npm run dev:next` starts Next.js alone, assuming the
database is up.) `npm run setup` prepares the database and then stops embedded Postgres. For
disposable demo data, set `ARCH_SEED_DEMO="true"` and a unique 12+ character `SEED_PASSWORD` in your
ignored `.env` before `npm run dev`, or run `npm run db:seed` with `SEED_PASSWORD` set. Never seed
public/production databases.

Two environment-independent details worth knowing:

- **Fonts are self-hosted** (`src/app/fonts/`, OFL-1.1). `next build` never calls
  fonts.googleapis.com, so an air-gapped or egress-restricted machine can build and run ARCH.
- **The dev server runs in a memory-safe mode** (no Turbopack source maps). Extracting source maps
  for every lazily compiled route is what makes a 4 GB container run out of memory after a few dozen
  routes. Set `ARCH_DEV_SOURCE_MAPS="true"` when you have the headroom and want full stack traces.

Day-to-day:

| Command | What it does |
|---|---|
| `npm run dev` | Postgres (Docker or embedded) + migrations + Next.js |
| `npm run dev:next` | Next.js only (assumes the database is already up **and migrated**) |
| `npm run build` / `npm start` | Production build / production server (does **not** migrate — run `npm run db:migrate` first) |
| `npm run db:up` / `db:down` / `db:status` | Embedded Postgres lifecycle |
| `npm run db:migrate` / `db:reset` | Apply migrations — `/` `--reset` drops and rebuilds |
| `npm run db:seed` | Idempotent demo data (only with a private, unique `SEED_PASSWORD`) |
| `npm run smoke:api` | End-to-end backend check against a running server (see below) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest against a real, separate test database |
| `npm run worker` | Outbox drain (add `-- --once` for a single pass) |

### Sign-up or sign-in says the database tables are missing

`npm run dev:next`, `npm start` and a fresh hosted PostgreSQL do not apply migrations. The database
then answers connections but has no `users` table, and `/register` / `/login` say that ARCH's tables
are missing or out of date. Run `npm run db:migrate` against the same `DATABASE_URL` (or start with
`npm run dev`, which migrates automatically). On a hosting platform, either make the build command
`npm run db:migrate && npm run build`, or run `DATABASE_URL="<production url>" npm run db:migrate`
once from your own machine after each release that adds a migration. Managed databases that
require SSL work as-is: the migrator connects with the URL unchanged (including `?sslmode=…`) and
never needs the `postgres` maintenance database. Any other unexpected sign-up/sign-in failure shows an
**Error ID**; the server log has a matching `[register] failed` / `[login] failed` line with the
Prisma/PostgreSQL error codes and the table involved (never passwords, form data or connection
strings).

### Backend smoke test

`npm run smoke:api` exercises every API surface against a server you are already running
(`SMOKE_BASE_URL` overrides `http://localhost:3000`): it registers a throwaway account, signs in
through the real credentials callback, then walks projects, services, incidents (+ timeline,
correlation, similar, blast radius), the whole Copilot surface, status pages, HMAC-signed webhook
ingestion, dependencies, changes, SLOs, knowledge sources, repo connections, the v1 bearer API,
invitations and the negative paths (anonymous 401s, cross-tenant 404s, duplicate email 409, weak
password 422, bad signature 401). It creates only `smoke-*` rows and exits non-zero if anything
fails. `SMOKE_VERBOSE=1` prints each check as it runs; `SMOKE_RSS=1` also reports the server's
resident memory per request, which is how a leaking route shows up.

Environment variables are documented in `AGENTS.md` §2. Never commit secrets — `.env` stays local.
A previously committed `.env` was removed from tracking, but it remains in Git history: rotate
anything copied to a hosted environment. New webhook endpoint envelopes use `AUTH_SECRET_WEBHOOK`;
legacy v1 envelopes use `AUTH_SECRET`. If a live DB has legacy endpoints, back it up, set a NEW
`AUTH_SECRET_WEBHOOK`, then run `npm run webhooks:rekey` (dry run) and
`npm run webhooks:rekey -- --apply` while the OLD `AUTH_SECRET` is still available. Verify a signed
webhook, then rotate `AUTH_SECRET` (this signs users out). If the old key is lost, rotate/reissue
the affected endpoint credentials instead. Never log or commit either key.
Production requires `AUTH_SECRET` and `AUTH_SECRET_WEBHOOK`; the app refuses to boot with the
placeholder values. GitHub OAuth setup without a local checkout: [`docs/GITHUB-OAUTH-SETUP.md`](docs/GITHUB-OAUTH-SETUP.md).

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
| Chat with ARCH (V8) | `GET/POST/DELETE /api/copilot/chat/sessions`, `GET/PATCH/DELETE /api/copilot/chat/sessions/{id}`, `POST /api/copilot/chat/sessions/{id}/messages` — page `/dashboard/chat` |

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

### Knowledge base + learning (V6): Copilot cites your own runbooks

Guardrails and their enforcement points: [`docs/engineering/AI-GUARDRAILS.md`](docs/engineering/AI-GUARDRAILS.md).

- **Knowledge page** (`/dashboard/knowledge`). Paste a runbook, a doc or a note — or fetch a public
  documentation page — and ARCH chunks it, embeds it on your server, and retrieves the relevant
  passages when Copilot answers. Drafts cite the source by name and only once it clears a relevance
  floor. No external vector database, no embedding API, no tenant data leaving the boundary.
- **No fetching at inference time.** Fetching is a human action, SSRF-guarded (private/loopback/
  link-local addresses refused on every DNS record, ≤3 re-checked redirects, 10s timeout, 2MB cap),
  rate-limited, audited, and disabled by `ARCH_OFFLINE_ONLY`.
- **Calibrated confidence** (temperature fitted on your holdout), **learning from corrections**
  (approve / edit / dismiss / a manual severity change, corrections at 3× weight), and **drift
  detection** that flags a regressing model instead of promoting it.
- **"Have we seen this before?"** on each incident and **change-risk ranking** on the declare-incident
  page — both context for the responder, never an automated action.
- **Verified fixes prove themselves:** a generated test must fail before the patch and pass after
  it, and the panel shows both runs. When it cannot reproduce, it says so.

```bash
npm run knowledge:fetch -- --org <organizationId> --user <userId>   # seed from public docs
npm run model:eval                                                  # golden-set accuracy, no database
```

### Chat with ARCH (V8): a real chat, on your own model

`/dashboard/chat` is a ChatGPT-style assistant that runs entirely on ARCH's own model — no vendor,
no API key, nothing leaves your server. It is grounded, not generative: every answer is built from
this workspace (open incidents, history, runbooks, the trained model) and cites what it used.

- **A real chat.** Conversations persist: previous sessions in the sidebar (grouped by recency,
  searchable), rename inline, delete one or clear all. Follow-ups keep the thread. Sessions are
  private to the member who created them — even inside the same organization.
- **Answers with evidence.** "What is open right now?" lists the live queue; "what did we learn
  from <incident>?" pulls the root cause and fix the model extracted; "have we seen this before?"
  searches your incidents first, then the pattern library, and each source appears as a clickable
  citation. Ask about the roster, services, runbooks, or an ops problem in plain English or
  Hinglish.
- **No code generation, by design.** Ask for a function and ARCH refuses, explains why, and points
  at Code Assist (Review / Fix / Thinker) instead. A wrong snippet pasted into production is worse
  than no snippet, and code needs the repo, not a chat window.
- **Honest when it does not know.** An empty workspace gets "I have nothing to ground this on"
  plus how to fix that — never an invented incident. Chat answers from a 30-day resolve-time
  window and the open queue only.
- **Fast and free.** Warm answers land in tens of milliseconds (the engine is deterministic
  retrieval + templates, not an LLM call), it is rate-limited per organization like the rest of the
  Copilot surface, and it works with `ARCH_OFFLINE_ONLY="true"`.

Permission: reading your own chats needs `copilot.read`; sending messages, renaming and deleting
need `copilot.generate` (RESPONDER or above). Every session write is audited with metadata only —
the conversation itself is never written to the audit log. Testing guide: [`docs/ALPHA-TESTING.md`](docs/ALPHA-TESTING.md).

---

## Document conventions

- Legal documents use placeholders in `[SQUARE BRACKETS]` for entity details, addresses, dates and
  jurisdiction. Replace them before publishing to customers — see `docs/legal/README-NOTES.md`.
- Pricing figures are working hypotheses, not commitments.
- Every document lists an owner and a "last reviewed" date; review cadence is 90 days.
