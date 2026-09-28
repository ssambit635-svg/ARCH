# ARCH — backend testing guide

How to prove the backend works, feature by feature. Written for someone who just cloned the repo
(or is reviewing a preview deployment) and wants evidence, not vibes.

---

## 1. Fast path — one command, 122 checks

```bash
npm run dev          # generates the Prisma client, starts PostgreSQL, applies migrations, starts Next.js
npm run smoke:api    # in a second terminal; default target http://localhost:3000
```

The smoke test registers a throwaway account (`smoke-<timestamp>@example.com`), signs in through the
real Auth.js credentials callback, and then walks the API: organizations, projects, services,
incidents (+ timeline, correlation, similar, blast radius), the Copilot surface, **Chat with ARCH**
(sessions, send, follow-up, rename, transcript, delete, clear), status pages, webhook ingestion,
dependencies, changes, SLOs, knowledge sources, repo connections, the v1 bearer API, invitations
and member removal — plus the negative paths (anonymous 401s, cross-tenant 404s — including a
foreign chat id, duplicate email 409, short password 422, unsigned webhook 401, revoked token 401).

For a solo-founder walkthrough of alpha and beta testing (what to click, what to measure, how to
load-test safely), see [`ALPHA-TESTING.md`](ALPHA-TESTING.md).

| Environment variable | Effect |
|---|---|
| `SMOKE_BASE_URL` | target another host, e.g. a preview URL |
| `SMOKE_VERBOSE=1` | print every check, not just the failures |
| `SMOKE_RSS=1` | report the server's resident memory before/after each request (leak hunting) |

Exit code `0` = all checks passed, `1` = at least one failed, `2` = could not even register/sign in.
It **writes real rows** (prefixed `smoke-`) to the target database, so point it at a development
environment, not production data.

## 2. Sign-in and sign-up first

Everything else assumes you can get in. In order:

```bash
# 1. Register through the API (201, returns user + organization).
curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"super-secret-password","name":"You","organizationName":"Acme"}'

# 2. Sign in the way the browser does (csrf round-trip, then the credentials callback).
jar=$(mktemp)
csrf=$(curl -s -c "$jar" http://localhost:3000/api/auth/csrf | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
curl -s -b "$jar" -c "$jar" -o /dev/null -w '%{http_code}\n' \
  -X POST http://localhost:3000/api/auth/callback/credentials \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$csrf" --data-urlencode 'email=you@example.com' \
  --data-urlencode 'password=super-secret-password' --data-urlencode 'callbackUrl=http://localhost:3000/dashboard'
grep -q session-token "$jar" && echo "signed in"
```

In the browser: `/register` creates the account **and** signs you in; `/login` signs you in. Both
password fields have an eye button (Show/Hide) — it must not submit the form, and `aria-pressed`
plus the label must flip.

**The failure nothing else can survive is a dead database.** Stop PostgreSQL (`npm run db:down`) and
the app must say so instead of blaming the password:

| Surface | Expected while the database is down |
|---|---|
| `POST /api/auth/register` | `503` with `error.code = "SERVICE_UNAVAILABLE"` |
| `GET /api/health` | `503`, `checks.database.status = "error"` |
| `/login`, `/register` form submit | "ARCH can't reach its database … start PostgreSQL (`npm run db:up`, or `npm run dev`)" |
| Everything else | does not crash the process; `npm run db:up` restores it without a restart |

Rate limits you will trip while testing: 10 registrations per 10 minutes per IP, 10 credential
sign-ins per minute per email, 120 v1 requests per minute per IP, 60 per minute per token. A `429`
is the limit working, not a bug.

## 3. Feature checklist

Every row is covered by `npm run smoke:api`. Use this table when you want to poke at one thing by
hand: sign in first (section 2), then send the request with the session cookie.

| Area | What to test | Endpoint | Expected |
|---|---|---|---|
| Health | liveness + version + database latency | `GET /api/health` | `200` (or `503` degraded) with `checks.database.latencyMs` |
| Organizations | create/read/update, slug uniqueness | `GET/POST /api/organizations`, `/api/organizations/:id` | `201` on create; creator is OWNER; slug conflict `409` |
| Members | roster, role change, removal guards | `/api/organizations/:id/members`, `/members/:userId` | OWNER/ADMIN only; a RESPONDER deleting a member → `403` |
| Invitations | invite → accept → join | `POST /api/organizations/:id/invitations`, `GET/POST /api/invitations/:token[/accept]` | `201`, invitee sees the org after accepting, token is one-time |
| Projects | CRUD | `/api/projects[/:id]` | `201`/`200`; unknown id → `404` |
| Services | CRUD + status | `/api/services[/:id]` | status change reflected everywhere the service appears |
| Dependencies | graph edges | `POST /api/dependencies` | `201`; self-dependency → `400` |
| Incidents | open, list with filters, update, illegal transitions | `/api/incidents[/:id]` | `201`; bad state change → `409` |
| Incident timeline | append + paginate events | `GET/POST /api/incidents/:id/events` | ordered, paginated |
| Correlation & dedup | repeat alerts collapse; fingerprint groups | `GET /api/incidents/:id/correlation`, `GET /api/incidents/:id/similar` | grouped occurrences, evidence labelled (fact vs hypothesis) |
| Blast radius | services that depend on the affected one | `GET /api/incidents/:id/blast-radius` | graph walk with criticality |
| Copilot | hints, summary, triage, status draft, postmortem, code fix | `POST /api/incidents/:id/copilot/*` | `200/201`; drafts are proposals, not applied silently |
| Copilot review loop | suggestions, verify, approve, verified-fix | `/api/copilot/suggestions/:id/{approve,dismiss,verify}`, `/api/copilot/verifications/:id/approve` | `200`; approvals recorded in the audit log |
| Repo assist | PR drafts and sync | `GET/POST /api/incidents/:id/copilot/pull-requests[/sync]` | mock mode when `GITHUB_MODE=mock` |
| Code review | `POST /api/copilot/code-review` | `200` with findings; modes `review`/`fix`/`explain`/`scaffold`; code is not stored |
| Model registry | train, versions, activate, rollback | `/api/copilot/model[/train|/versions/:id/activate|/rollback]` | new version activates; rollback restores |
| Status pages | create, publish, public read | `POST /api/status-pages`, `POST /api/status-pages/:id/publish`, `GET /api/status-pages/public/:slug` | unpublished slug → `404`; public page cached, no session needed |
| Webhook endpoints | create (secret shown once), rotate, deliveries | `/api/webhook-endpoints[/:id[/rotate|/deliveries]]` | `201`; the secret never appears again |
| Webhook ingestion | HMAC-signed alert → incident | `POST /api/webhooks/:provider?endpoint=:externalId` | signed `202`; unsigned/invalid `401`; unknown endpoint `404` |
| Changes | record a deploy, risk, blast radius | `/api/changes[/risk]`, `GET /api/changes/:id/blast-radius` | `201`; risk score is explainable |
| SLOs | upsert budget, list status | `GET/POST /api/slos` | `200/201`; burn rate falls out of incidents |
| Insights | recurring incident patterns | `GET /api/insights/recurring?sinceDays=90` | clusters with counts |
| Knowledge base | ingest, list, reindex, fetch, delete | `/api/knowledge-sources[/:id[/reindex]]`, `/api/knowledge-sources/fetch` | `201`; `fetch` refuses private IPs (`400/422`) |
| Chat with ARCH | list, create, send, follow-up, rename, transcript, delete, clear all, regenerate | `GET/POST/DELETE /api/copilot/chat/sessions`, `GET/PATCH/DELETE /api/copilot/chat/sessions/:id`, `POST /api/copilot/chat/sessions/:id/messages`, `POST /api/copilot/chat/sessions/:id/regenerate` | `201` on send; first message auto-titles; a rename sticks (`titleSource=USER`); empty message `400/422`; unknown/foreign chat `404`; `403` without `copilot.generate`; regenerate rewrites the last answer in place (same row id, message count unchanged, `400` when there is no answer yet) and is audited as `chat.message.regenerate` with metadata only |
| Repositories | connect, pin a commit, ask | `/api/repo-connections[/:id[/pin]]`, `POST /api/repos/insight` | `201`; mock mode without a token |
| GitHub | mode + token check | `GET /api/github` | `mode`, `tokenConfigured`; no token leak |
| Audit log | every attributed write | `GET /api/audit` | append-only, actor + action + target |
| API tokens | mint, list, revoke | `/api/v1/tokens[/:id]` | OWNER/ADMIN only; secret shown once; revoked → `401` |
| Public API v1 | bearer auth, incidents, timeline, triage, status summary, org | `/api/v1/*` | `401` without/with a bad token; org isolation enforced |

### Signing a webhook by hand

```bash
secret='whsec_...'                       # from POST /api/webhook-endpoints (shown once)
body='{"title":"checkout p99 high","severity":"HIGH","service":"Smoke API"}'
ts=$(date +%s)
sig=$(printf '%s.%s' "$ts" "$body" | openssl dgst -sha256 -hmac "$secret" -r | cut -d' ' -f1)
curl -s -X POST "http://localhost:3000/api/webhooks/grafana?endpoint=<externalId>" \
  -H "content-type: application/json" \
  -H "x-arch-signature: t=$ts,v1=$sig" \
  -d "$body" -w '\n%{http_code}\n'
```

`x-hub-signature-256: sha256=<hex>` over the raw body is also accepted (GitHub-style). A stale `t`
is rejected. The same body sent twice must **not** open a second incident — deduplication keeps one
open incident and records the repeat.

## 4. Guard rails worth breaking on purpose

| Attempt | Must fail with |
|---|---|
| Any `/api/*` route without a session | `401 UNAUTHORIZED` |
| Tenant B reading tenant A's project/incident/status page/token/chat (list, read or delete) | `404` (never `403` — no existence leak) |
| A VIEWER sending a chat message (`copilot.generate` missing) | `403` |
| `POST /api/auth/register` with an existing email | `409 CONFLICT` |
| Password shorter than 10 characters, or a malformed email | `422 VALIDATION_FAILED` with `issues[]` |
| Malformed JSON body | `400 BAD_REQUEST` |
| Webhook without a signature, with a wrong signature, or a stale timestamp | `401` |
| Revoked API token | `401` |
| `POST /api/knowledge-sources/fetch` pointed at `127.0.0.1` / a private range | `400`/`422` (SSRF guard) |
| A RESPONDER deleting an incident/removing a member/minting a token | `403 FORBIDDEN` |

## 5. Before you call a release good

1. `npm run typecheck` — no type errors.
2. `npm test` — unit/integration suite against a real test database (`localhost:55433/arch_test`).
3. `npm run build` then `npm run start`, and `npm run smoke:api` against the production build.
4. `npm run smoke:api` against `npm run dev` as well — that is the surface a new user meets first.

---

*Owner: Engineering · Last reviewed: 2026-09-28 · Related: `api.md`, `engineering/OPERATIONS-RUNBOOK.md`, `../README.md` (local development)*
