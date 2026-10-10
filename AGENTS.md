# ARCH — Engineering context

**Current product:** ARCH **0.3.0**, early access. This is a working application, not a blueprint-only repository. Use this file for current engineering rules; use the linked source docs for detailed behaviour.

## Product and operating model

ARCH helps engineering teams receive configured alerts, coordinate incident response, preserve an audit trail, and publish customer-facing status updates. It is self-hosted and designed to work alongside monitoring tools, GitHub, and existing team workflows.

ARCH is a modular monolith: one Next.js web application, PostgreSQL, and a separately supervised worker for queued notifications and model-training jobs. The built-in assistant is a small native engine; generated advice and changes require human review.

## Stack

- Node.js 20.19+ · Next.js 16 · React 19 · strict TypeScript
- Tailwind CSS 4 · PostgreSQL · Prisma 7 · Zod
- Auth.js 5 · PostgreSQL-backed worker/outbox
- Vitest with a separate real PostgreSQL test database
- Python CLI under `clients/python`

## Source map

```text
src/app/                    Pages, route handlers, and server actions
src/components/             Product, marketing, and shared UI
src/lib/                     Auth, configuration, permissions, validation
src/server/services/        Business rules and orchestration
src/server/repositories/    Organization-scoped database access
src/server/ai/              Native inference, retrieval, and guardrails
src/worker/                 Notification processing and model training
prisma/                     Schema and SQL migrations
clients/python/             Python CLI and tests
tests/                      Unit and database-backed integration tests
docs/                       Product, engineering, support, and operations
```

## Required engineering rules

1. **Tenant isolation:** every organization-owned read or write must be scoped by the organization resolved from the authenticated session or token. Never trust an organization ID or role sent by the browser.
2. **Authorization:** enforce permissions on the server for every protected action. A non-member or cross-tenant resource is `404`; a member without the required role is `403`.
3. **Layering:** route handlers validate input and call services; services enforce business rules and call repositories. Keep Prisma queries in repositories unless an existing, documented exception applies.
4. **Validation:** validate request bodies, query parameters, webhook payloads, and action input with the existing Zod schemas.
5. **Writes:** use transactions for related data changes. Preserve the incident event and audit trail together; do not silently skip audit writes.
6. **Secrets:** never log, return, or commit passwords, tokens, webhook secrets, or customer content. Verify webhook signatures and timestamps before trusting payloads.
7. **AI:** use only the shipped `arch` or `mock` provider. Keep context organization-scoped, treat model output as untrusted, and preserve human approval for incident updates and GitHub pull requests. Do not add external AI providers without an explicit product/security decision.
8. **User experience:** support keyboard use, visible focus, labelled controls, loading/empty/error states, and narrow screens. Respect reduced-motion preferences.
9. **Documentation:** update the relevant guide and changelog in the same change when shipped behaviour changes.
10. **Scope:** prefer a tested vertical slice over a broad rewrite. Do not claim uptime, compliance, accuracy, or performance guarantees without measured evidence and approval.

## Local setup

Use Node.js **20.19+**. Start from the checked-in example, keep local secrets private, and use two different secrets:

```bash
npm ci
cp .env.example .env
chmod 600 .env
openssl rand -base64 32   # set as AUTH_SECRET
openssl rand -base64 32   # set as AUTH_SECRET_WEBHOOK
npm run dev
```

The development command generates Prisma, starts the local database fallback when needed, applies migrations, and starts Next.js. It does not seed a shared demo account. Run `npm run worker` in another terminal to process email notifications and scheduled model-training jobs.

For Docker, managed PostgreSQL, OAuth, demo data, and production setup, follow [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). Never use the embedded development database in production.

## Verification before review

```bash
npm run db:generate
npm run typecheck
npm test
npm run build
```

The test suite provisions its own PostgreSQL database. `npm run build` needs valid environment configuration; use the production environment's secrets only through its secret manager, never local committed values. When testing a running app, `npm run smoke:api` exercises key API and tenant-isolation paths. Run Python CLI tests when changing `clients/python`.

## Authoritative references

- [`README.md`](README.md) — current product overview and local quick start.
- [`docs/product/CURRENT-STATUS.md`](docs/product/CURRENT-STATUS.md) — simple, current product facts and known limits.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — setup and deploy preparation.
- [`docs/api.md`](docs/api.md) — beta API contract.
- [`docs/engineering/ARCHITECTURE.md`](docs/engineering/ARCHITECTURE.md) — request flow and system architecture.
- [`docs/engineering/ARCH-MODEL.md`](docs/engineering/ARCH-MODEL.md), [`ARCH-AGENT.md`](docs/engineering/ARCH-AGENT.md), and [`AI-GUARDRAILS.md`](docs/engineering/AI-GUARDRAILS.md) — native assistance and its boundaries.
- [`docs/engineering/OPERATIONS-RUNBOOK.md`](docs/engineering/OPERATIONS-RUNBOOK.md) — operations, recovery, and release checks.
- [`SECURITY.md`](SECURITY.md) — how to report a vulnerability.

`AGENTS-V2.md` is a historical implementation log. If it conflicts with this file, the current source, or the linked engineering docs, follow the current source and docs and fix the stale note in the same change.

---

Owner: Engineering · Last reviewed: 2026-10-11
