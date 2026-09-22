# Changelog

All notable changes to ARCH are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rules for this file:
- One entry per release, written for a **customer** to read, not for a compiler.
- Security fixes are always listed, with a severity and the affected versions.
- Breaking changes get their own section and a migration note.
- If a release contains nothing a customer would care about, say so in one line instead of padding it.

---

## [Unreleased]

### Planned — v1.1, P1 features
Slack notifications behind `FEATURE_SLACK_NOTIFICATIONS`, on-call schedules and escalation, custom
status page domains, two-factor authentication, and the first monitoring integrations.

See [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) for the full milestone plan.

---

## [0.2.0] — 2026-09-22

**P0 feature-complete: ARCH now runs.** Milestones 1–10 of `AGENTS.md` are implemented and the whole
P0 scope of `docs/product/FEATURES.md` works end to end — register, create an organization, invite
your team, open an incident from the dashboard or from an incoming alert, resolve it, and let your
customers watch on a status page.

### Added
- **Authentication** — email/password registration and login (bcrypt, JWT sessions via Auth.js v5),
  optional GitHub OAuth, protected `/dashboard/*` routes, and a `GET /api/health` endpoint that
  reports database reachability for uptime checks.
- **Multi-tenancy** — organizations, memberships and invitations. The creator becomes OWNER; the last
  OWNER can never be demoted or removed; invitations are single-use, expire after 7 days and can only
  be accepted by the person they were sent to.
- **Roles and permissions** — OWNER, ADMIN, RESPONDER, VIEWER, enforced server-side on every request
  and asserted cell-by-cell in the test suite. Insufficient role is `403`; a resource belonging to
  another organization is `404` so ids cannot be probed.
- **Projects and services** — CRUD, with a service status (`OPERATIONAL`, `DEGRADED`, `PARTIAL_OUTAGE`,
  `OUTAGE`, `MAINTENANCE`) that follows open incidents automatically and can be pinned manually.
- **Incidents** — create, assign, triage, comment. Status moves through
  `INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED`, may skip forward, and can be reopened from
  RESOLVED. Illegal transitions are rejected with `409` and a list of what *is* allowed. Every write
  records a timeline event and an audit entry in the same database transaction.
- **Timeline** — one chronological history per incident: creation, status changes, assignments,
  comments, with the actor marked as a person or as `webhook:<provider>`.
- **Filters and pagination** — search across title and description, filter by status, severity, open
  state and project; paginated server-side.
- **Public status page** — `/{slug}` with per-service components, active incidents and their latest
  update. Publish and unpublish from the dashboard; an unpublished page is `404` for everyone.
- **Webhook ingestion** — `POST /api/webhooks/{provider}` for GitHub, Sentry and Grafana payloads,
  HMAC-verified before parsing, replay-protected by timestamp tolerance, idempotent by delivery id and
  by provider dedupe key, and fully logged per endpoint so failures can be diagnosed.
- **Email notifications** — a Postgres-backed outbox: incident and invitation emails are queued inside
  the same transaction as the change that caused them, then delivered by `npm run worker` with retries
  and a visible PENDING → SENT/FAILED state. Console adapter in development.
- **Audit log** — an admin-only, paginated, append-only record of every meaningful action.
- **Hardening** — rate limiting on registration, login, webhook ingestion and public status reads;
  Zod validation on every input; loading, empty and error states throughout the dashboard and on the
  public status page; structured error envelopes with stable codes.
- **Developer experience** — `npm run setup` (embedded PostgreSQL when Docker is unavailable),
  repeatable SQL migrations, `npm run db:seed` demo data for four roles, and 104 tests covering the
  permission matrix, incident transitions, tenant isolation and webhook signatures.

### Known limitations (disclosed, not hidden)
- Notifications are email-only; Slack is behind a feature flag and not wired to a real workspace yet.
- The background worker is a polling loop started with `npm run worker`; scheduling is the deployer's
  job until the managed deployment exists.
- No on-call schedules, escalation policies or SMS/voice paging — those are v1.2 scope.

---

## [0.1.0] — 2026-09-23

**Documentation and architecture baseline.** No application code yet — this release freezes the
blueprint that the build follows.

### Added
- **Product definition** — `docs/product/PRD.md` (scope, requirements, risks, success criteria),
  `docs/product/FEATURES.md` (every feature marked Must/Should/Later), and
  `docs/product/USER-STORIES.md` (stories with testable acceptance criteria).
- **Plain-English product explanation** — `docs/EXPLAINED-SIMPLY.md`: the whole product explained
  without jargon, including the journey of one alert from webhook to post-mortem.
- **Roadmap and economics** — `docs/product/ROADMAP.md` (10 milestones to v1.0, with estimates and a
  launch gate), `docs/product/PRICING.md` (plans, limits, unit economics, market positioning),
  `docs/product/METRICS.md` (north-star metric and KPI tree).
- **Engineering documentation** — `docs/engineering/ARCHITECTURE.md` (layers, request lifecycle,
  tenancy enforcement, state machine, decision log), `docs/engineering/SECURITY-AND-COMPLIANCE.md`
  (threat model, controls, honest compliance status),
  `docs/engineering/OPERATIONS-RUNBOOK.md` (deploy, rollback, backup/restore, our own incident process).
- **Go-to-market** — `docs/go-to-market/GTM-PLAN.md`, `COMPETITIVE-ANALYSIS.md` (verified September 2026
  pricing), and `BRAND-GUIDE.md`.
- **Legal set (templates, pending counsel review)** — Privacy Policy, Terms of Service, Data Processing
  Addendum, Service Level Agreement, Cookie Policy, Acceptable Use Policy, and a placeholder checklist
  in `docs/legal/README-NOTES.md`.
- **Support set** — `docs/support/FAQ.md`, `SUPPORT-POLICY.md`, `CUSTOMER-ONBOARDING.md`.
- **Repository hygiene** — `AGENTS.md` (the engineering build contract), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, `.gitignore`, `.env.example`.

### Decisions frozen in this release
- Modular monolith on Next.js App Router, PostgreSQL 16 with Prisma, Auth.js for identity.
- Organization-scoped tenancy enforced at the repository layer; cross-tenant access returns **404**.
- Incident state machine `INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED` with legal forward skips
  and a recorded reopen.
- HTTP-verified webhook ingestion with HMAC-before-parse and idempotent handling.
- Email behind an adapter; no external job runner until notifications require one.
- **No AI features in v1.** Not the differentiator, and it adds data-handling risk before trust exists.
- Pricing per **organization**, not per seat — the primary competitive wedge.

### Known limitations (disclosed, not hidden)
- No SOC 2 / ISO 27001 certification; the security posture is documented honestly instead.
- No HIPAA support and no card-data handling; both are prohibited by the Acceptable Use Policy.
- No two-factor authentication until v1.2; no SAML/SSO until v2 (gated).
- No on-call paging, escalation policies, or SMS/voice notification in v1.
- No monitoring or detection; ARCH ingests alerts, it does not generate them.
- Legal documents require placeholder replacement and counsel review before publication.

---

## How to write an entry

```markdown
## [1.2.0] — YYYY-MM-DD

### Added
- Custom status page domains (`status.yourcompany.com`) on Growth and Scale plans.

### Fixed
- Status page no longer briefly shows a stale service status after an incident is resolved. (#412)

### Security
- Patched a cross-tenant read in the audit export endpoint (Severity: High). All versions before
  1.2.0 were affected; no evidence of exploitation. Thank you to [reporter].
```
