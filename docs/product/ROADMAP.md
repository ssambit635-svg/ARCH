# ARCH — Roadmap

**Version:** 1.0 · **Owner:** Product · **Last reviewed:** 2026-09-23

Three horizons: **v1** (the ten milestones), **v1.1–v1.3** (post-launch hardening and the features
customers ask for first), **v2+** (only if the strategy still makes sense).

Rule for the whole roadmap: **one vertical slice per release** — database → server logic → API → UI →
test. Nothing ships half-height.

---

## Horizon 1 — v1.0 "It works, and it can be trusted"

| # | Milestone | Deliverable | Acceptance criteria | Est. |
|---|---|---|---|---|
| 1 | Setup, DB, auth | Dockerised Postgres, Prisma migration, register/login, health check | `docker compose up` → migrate → register/login works; `/api/health` = 200 | 2–3 days |
| 2 | Organizations & membership | Create org, invite by email, role assignment, org switcher | Creator is OWNER; members see only their org; invites expire | 3–4 days |
| 3 | RBAC | Single permission source, enforced on every mutation | Matrix holds per role × action; cross-org ID → 404 | 2–3 days |
| 4 | Projects & services | CRUD, live service status, public display names | Slug unique per org; status changes audited | 2–3 days |
| 5 | Incidents & timeline | CRUD, assignment, comments, validated state machine, filters | Illegal transitions rejected; every change = event + audit | 5–7 days |
| 6 | Public status pages | Compose, publish/unpublish, unauthenticated read | Unpublished → 404; internal notes never public; fast on mobile | 3–4 days |
| 7 | Webhook ingestion | HMAC verify, stale rejection, idempotent incident creation | Bad signature → 401 with nothing stored; duplicate delivery safe | 3–4 days |
| 8 | Notifications | Email on create/assign/resolve, retry once, adapter-based provider | `PENDING → SENT/FAILED`; dev console provider; failures visible | 2–3 days |
| 9 | Audit logs | Record every mutation; admin viewer, paginated | Immutable via product; no secrets in metadata; CSV export | 2–3 days |
| 10 | Hardening & launch | Rate limits, error boundaries, all states, tests, deploy docs | Permission/isolation/transition/signature suites green; staging deploy reproducible | 4–5 days |

**Total estimated build:** 30–40 focused working days for one competent full-stack engineer
(≈ 6–8 weeks calendar with review and life in between).

### v1.0 launch gate (all must be true)
- [ ] All ten milestones accepted.
- [ ] Cross-tenant isolation suite green, including slug and ID probing.
- [ ] An unsigned webhook leaves zero database rows behind.
- [ ] Cold-start onboarding (signup → published status page) completed by a stranger in < 60 min.
- [ ] Public status page survives a dashboard-under-load test.
- [ ] Deployment, backup and rollback procedures documented and rehearsed once.
- [ ] Legal set published with real entity details (no `[PLACEHOLDERS]` left).

---

## Horizon 2 — v1.1 → v1.3 "It earns its keep"

Ordered by expected customer pull, not by our enthusiasm.

### v1.1 — "The integrations people ask for" (4–6 weeks after launch)
- Slack outbound notifications (incident created / resolved).
- Slack slash command: create an incident without leaving the channel.
- Named providers: GitHub Actions, Sentry, Grafana Alertmanager with field mapping.
- Service status history table + 90-day uptime bars on the status page (needs the history table first).
- Notification preferences per member; severity-based routing.
- CSV export for incidents.

### v1.2 — "Sellable to a real company" (4–6 weeks)
- Custom status page domain (`status.customer.com`) and branding (logo, accent colour).
- Status page email/RSS subscribers.
- Post-mortem document attached to resolved incidents.
- Read-only REST API + personal access tokens.
- Configurable audit retention (3 / 12 / 24 months).
- Two-factor authentication (TOTP).

### v1.3 — "Ops maturity" (4–6 weeks)
- On-call schedules and rotation.
- Escalation policies (if unacknowledged in N minutes, page the next person).
- SMS / phone escalation (partner provider).
- Incident templates.
- Bulk actions and saved filters.

---

## Horizon 3 — v2.0+ "Big bets, gated on evidence"

Each item below is **gated**: it does not start until the trigger condition is met.

| Bet | Trigger to start | Why it's risky |
|---|---|---|
| On-premise / self-hosted edition | ≥ 3 enterprise deals blocked on data residency | Doubles deployment and support surface |
| SAML SSO + SCIM provisioning | A signed enterprise contract requires it | Complexity with little pull from smaller teams |
| Dependency graph / blast radius | ≥ 5% of customers actively request it | Needs reliable topology input to be useful |
| Mobile app (responder-only) | Significant mobile usage of the dashboard | Native app = a second product |
| Public API + marketplace of integrations | Developers build on ARCH unprompted | Support burden scales with surface |
| AI: incident summarisation and post-mortem drafts | Timeline data is rich and clean (post-v1.3) | **Explicitly deferred**; not a v1 differentiator and a data-handling liability |
| Billing/payments inside the product | Manual invoicing becomes a bottleneck | Stripe does this better; keep it external |

Note on AI: it is deliberately absent from v1 and gated in v2. ARCH's value is *process and trust*;
adding a model before the data is structured invites cost, risk and distraction.

---

## Sequencing principles

1. **Trust before features.** RBAC, audit and isolation come before anything shiny. A leaky incident
   tool is worse than a spreadsheet.
2. **Public surface last, public-safe first.** The status page (milestone 6) waits until permissions
   and data scoping are proven.
3. **Every milestone ends deployable.** No "half a feature" spanning two releases.
4. **Integrations before internals.** If customers ask for both, the thing that removes manual work
   wins.
5. **No item starts without an owner and an acceptance test.**

---

## What we will *not* do (guards against drift)

Reject — or answer with an integration instead:
AI models · code generation · debugging tools · hosting customer applications · CI/CD pipelines ·
Kubernetes management · payments inside the product · native mobile apps · microservices ·
real-time chat · replacing GitHub / Slack / AWS / IDEs.

---

## Release cadence & versioning

- **Semantic versioning** for the product; `CHANGELOG.md` is the human record.
- **Weekly** patch/minor deploys once launched; major versions only for breaking API changes.
- **Every release** includes: changelog entry, migration (if any), rollback note, and a one-line
  customer-facing summary for the status page ("ARCH updated — no downtime expected").

---

*Owner: Product · Review cadence: 30 days until v1, then 90 days*
