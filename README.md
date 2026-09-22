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
| **Status** | Pre-launch · v0.1.0 · documentation + architecture frozen, build starting at Milestone 1 |
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
| Jobs | Added only when notifications/webhooks require it |

---

## Repository map

This repository is currently the **product blueprint** — the written spec the code is built from.
It contains no application code yet, by design: agreement first, code second.

```
ARCH/
├── AGENTS.md                     # Engineering contract for coding agents (stack, schema, rules)
├── README.md                     # You are here
├── CHANGELOG.md                  # Version history, Keep-a-Changelog format
├── CONTRIBUTING.md               # How to work in this repo
├── CODE_OF_CONDUCT.md            # Contributor Covenant 2.1
├── SECURITY.md                   # Vulnerability disclosure policy
├── LICENSE                       # Proprietary — all rights reserved
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

## Local development (once Milestone 1 lands)

```bash
npm install
docker compose up -d          # PostgreSQL on :5432
npx prisma migrate dev
npm run dev                   # http://localhost:3000
```

Environment variables are documented in `AGENTS.md` §2. Never commit secrets — `.env` stays local.

---

## Document conventions

- Legal documents use placeholders in `[SQUARE BRACKETS]` for entity details, addresses, dates and
  jurisdiction. Replace them before publishing to customers — see `docs/legal/README-NOTES.md`.
- Pricing figures are working hypotheses, not commitments.
- Every document lists an owner and a "last reviewed" date; review cadence is 90 days.
