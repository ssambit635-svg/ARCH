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

### Added — V4.1 · Real GitHub PR creation (M1 + M4 completed)

- **"Approve & create PR" actually opens a pull request now.** Previously `createPullRequest`
  returned a fabricated `https://github.com/{org}/{repo}/pull/{random}` URL *in every mode* —
  including when a real token was configured — so the dashboard and the audit log claimed a PR
  existed that never did. With `GITHUB_TOKEN` set, ARCH now runs the real flow via Octokit:
  resolve the base (pinned commit SHA, the M1 `repo@commit` guarantee, falling back to the base
  branch head), read every file the patch touches **at that commit**, apply the hunks, then push
  one blob per file → one tree → one commit → `refs/heads/arch/fix-*` → a **draft pull request**
  (`GITHUB_PR_DRAFT="true"`).
- **The patch is turned into real file contents in-process** (`src/server/services/github-patch.ts`),
  because GitHub's Git Data API takes blobs, not diffs. Hunks that don't fit the pinned commit abort
  with a conflict the human can act on — nothing is pushed, and the audit log gets a
  `pr.create_failed` entry. A `\ No newline at end of file` marker, multi-file diffs, markdown
  fences around the patch and ±120-line hunk drift are all handled.
- **Repo connect and commit pinning are now validated against GitHub.** Connecting a repo the
  token cannot see fails at connect time (404 with the reason), short commit pins are resolved to
  full 40-char SHAs (a 7-char pin used to explode at approval time, because `git createRef` only
  takes full SHAs), the repository's actual default branch is used instead of a blind `main`
  guess, archived repos are refused, and a read-only token is recorded as a warning in the
  audit note. Duplicate connections are matched case-insensitively (`Acme/Api` IS `acme/api`).
- **New configuration:** `GITHUB_MODE` (`auto`/`mock`/`real`; `auto` = real when a token is set),
  `GITHUB_API_BASE_URL` (GitHub Enterprise), `GITHUB_TIMEOUT_MS`, `GITHUB_PR_DRAFT`. This is
  deliberately **independent of `ARCH_OFFLINE_ONLY`**: that flag is the AI privacy lock (which
  model may see incident data), while opening a PR is an explicit human-approved push. You no
  longer have to permit external AI vendors to get real pull requests — the AI lock stays ON.
- **See the problem before the approval depends on it:** `/dashboard/repos` gains a GitHub token
  panel (mode, masked token, live token probe, repo-access check), `GET/POST /api/github`
  reports the same (`repo.manage` required to probe a repo), and
  `npm run github:check` runs the whole diagnosis from the command line — including
  `--preview-patch fix.patch`, which proves a patch still applies to the pinned commit **without
  pushing anything**.
- **PR state sync from GitHub:** `POST /api/incidents/:id/copilot/pull-requests/sync`
  re-reads every PR ARCH opened for an incident and stores `MERGED`/`CLOSED`, so the UI stops
  claiming "OPEN" for a PR a human merged last week (audited as `pr.sync`).
- **Offline mode is honest.** Mock PRs are recorded with status `MOCK` and *no* URL instead of a
  dead github.com link; the incident panel says so plainly.

### Security — V4.1

- **A live `ghp_…` PAT was committed in `.env.example`** (the one file users are told to copy)
  and is in git history on the default branch — treat it as leaked: revoke it at
  <https://github.com/settings/tokens>. New `tests/secret-hygiene.test.ts` fails CI if any
  token-shaped string appears in tracked files again, and `.env.example` carries placeholders
  only, with a "never put the real token here" warning. In production ARCH now refuses to boot
  with a `replace-with…` placeholder token, refuses `GITHUB_MODE="real"` without a token, and
  requires an `https://` GitHub API base URL.
- Error messages from GitHub are scrubbed of token-shaped strings (`ghp_…`, `github_pat_…`,
  `x-access-token:…@`) before they are logged or returned — a failing request used to echo the
  credential back into ARCH's logs.

### Compatibility — V4.1
- Existing tests, mock mode and the draft→approve flow are unchanged; the suite runs hermetically
  (it pins `GITHUB_MODE=mock`/`GITHUB_TOKEN=""`, so an exported token on the developer machine can
  no longer make tests hit api.github.com). Default behaviour with no token configured is still the
  offline record, exactly as before.


### Added — V3.1 · Model registry, background training and more training data

- **Retraining is now a background job.** "Retrain now" (and `POST /api/copilot/model/train`)
  queues a job and returns `202 Accepted` immediately — training never runs inside a web request.
  The worker claims the job, trains a candidate, evaluates it and promotes it **only if it beats
  the model currently serving** the workspace. Losing runs are kept as `REJECTED` with the reason.
- **Model registry.** Every training run is kept as a version (`arch_model_versions`, migration
  `20260925180000_v3_model_registry`) with its artifact, metrics and evaluation. The new registry
  table on `/dashboard/model` lists every version; OWNER/ADMIN can activate any of them
  (**rollback**), via `POST /api/copilot/model/rollback` or
  `POST /api/copilot/model/versions/:id/activate`.
- **Version audit trail.** Every train/promote/reject and every activation writes an audit entry
  including `fromVersion → version`, so the audit log shows which model version was serving at any
  point in time.
- **More training data** — the model gets smarter with every corpus you download (git-ignored,
  fetched at run time, license texts and notices saved alongside):
  - `npm run model:fetch-code` — real bug-fix knowledge: **SWE-bench / SWE-bench Verified (MIT)**
    and **ManySStuBs4J (Apache-2.0)**. Feeds code-fix suggestions (stack trace → patch).
  - `npm run model:fetch-review` — human code-review knowledge: **github-codereview (MIT)** and
    **Microsoft CodeReviewer (Apache-2.0)**. Grounds Code Assist answers in what real reviewers said.
  - `npm run model:fetch-public` now also indexes **saystone/awesome-postmortem (CC0)**.
- **License documents.** `docs/legal/TRAINING-DATA-LICENSES.md` (every dataset, verified license,
  commercial-use guidance) and `docs/legal/ARCH-MODEL-LICENSE.md` (the ARCH Model's own license /
  model card: ownership, draft-only acceptable use, no warranty).

### Compatibility — V3.1
- **`EngineOutput` is unchanged.** The four V2 features (summary, triage, status update,
  postmortem) keep their exact JSON contracts and knowledge mix; the code/review corpora enrich
  only code tasks (`CODE_FIX`, Code Assist).
- **Safeguards unchanged.** Everything stays draft-only with human approval, organization-scoped
  data, redaction and audit trail. Code-fix patches are displayed and posted as text after
  approval — never applied to a repository.

### Migration notes — V3.1
- Run `npm run db:migrate`. It adds `arch_model_versions` + `arch_model_jobs` and points
  `arch_models` at the registry. Existing models keep serving; their first retrain registers v1.
- Start the worker (`npm run worker`) — it now drains the training queue as well as notifications.

### Added — V3 · ARCH's own AI (no external AI vendors)
- **ARCH Copilot now runs on ARCH's own model by default.** Summaries, triage, status-update drafts
  and postmortems are produced on your server. Incident data is no longer sent to OpenAI or
  Anthropic. No API key, no GPU and no per-call cost.
- **It learns from your team.** Each workspace gets its own model, trained on its resolved incidents
  and approved postmortems (never on another workspace's data). Drafts point to similar past
  incidents, what fixed them and how long they took. The model retrains automatically as incidents
  are resolved; admins can retrain on demand and see its measured accuracy on the new
  **ARCH Model** page.
- **Code fix suggestions** in the incident Copilot panel. Paste a stack trace, error log or code
  snippet to get a diagnosis, the likely cause, fix steps and a patch when a safe fix exists. It is
  a draft, like everything else.
- **Code Assist** (new page). Review code for the bugs that cause incidents (missing timeouts,
  swallowed errors, SQL injection, hard-coded secrets, retry storms), get a safer version, or get a
  stack trace explained. Code is not stored, and secrets are never echoed back.
- **Optional local LLM.** Point ARCH at a free open-source model on your own machine (for example
  Qwen2.5-Coder-7B via Ollama, which runs on CPU with 16 GB RAM) for more fluent drafts and code
  rewrites. ARCH falls back to its own model if the LLM is slow or unavailable.
- **Privacy lock.** `ARCH_OFFLINE_ONLY` (on by default) refuses external AI vendors and any
  non-private model URL.

### Changed
- `AI_PROVIDER` now defaults to `arch` (was `mock`). The external `openai` / `anthropic` providers
  require `ARCH_OFFLINE_ONLY="false"`.

### Migration notes
- Run `npm run db:migrate`. It adds the `arch_models` table and the `CODE_FIX` suggestion type.
- No configuration is required. To use a local LLM, see `docs/engineering/ARCH-MODEL.md`.

### Added — V2 · ARCH Copilot (milestones M1–M3 of `AGENTS-V2.md`)
- **AI drafts in the incident workspace.** Ask ARCH Copilot for an incident summary (at most five
  bullets), a triage suggestion (severity and assignee), a customer-safe status-page update, or a
  blameless postmortem with Timeline / Impact / Root cause / Action items.
- **Humans stay in charge.** Every draft waits for review. Responders, admins and owners can edit
  and approve it — which posts it to the timeline (and therefore to your status page, for status
  updates) or applies the triage — or dismiss it. Viewers can read drafts but not act on them.
  Reviewer and time are recorded, and dismissed drafts stay in the audit trail.
- **Privacy by default.** Only the incident title, severity, status, timing, affected service and
  timeline entries are sent to the AI provider, after passwords, API keys, tokens, connection-string
  credentials and email addresses are redacted. Names, ids and other organizations' data are never
  sent. Status drafts are scrubbed of internal hostnames, IP addresses and URLs.
- **Predictable behaviour.** 15-second timeout, one automatic retry, then a friendly error; a limit
  of 20 AI calls per minute per organization; token usage recorded on every draft and audit entry.
- **Bring your own provider.** OpenAI or Anthropic via `AI_PROVIDER` / `AI_API_KEY`; the default
  `mock` provider works offline with no key.

### Changed
- New `503 SERVICE_UNAVAILABLE` error code for failures of external dependencies (the AI provider).
- Database migration `20260925000000_v2_ai_suggestions` adds the `ai_suggestions` table.

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
