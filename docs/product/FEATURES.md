# ARCH — Feature list

**Legend:** **M** = Must have (v1) · **S** = Should have (v1 if cheap) · **L** = Later (post-v1)
**Ticket prefix** maps to the milestone plan in `ROADMAP.md`.

---

## 1. Identity & access

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| AUTH-1 | Email + password registration and login | M | 1 | Password stored as strong hash only |
| AUTH-2 | GitHub OAuth sign-in | M | 1 | Auth.js provider |
| AUTH-3 | Session-based dashboard protection | M | 1 | Unauthenticated → login |
| AUTH-4 | Password reset by email | M | 1 | Same adapter as notifications |
| AUTH-5 | Rate limiting on auth endpoints | M | 10 | Brute-force protection |
| AUTH-6 | Magic-link sign-in | L | — | Nice, not necessary |
| AUTH-7 | Two-factor authentication (TOTP) | L | — | Required by some enterprise reviews |
| AUTH-8 | SAML / SSO | L | — | Enterprise tier trigger |
| AUTH-9 | Personal API tokens | L | — | Needed once a public API exists |

## 2. Organizations & people

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| ORG-1 | Create organization; creator becomes OWNER | M | 2 | |
| ORG-2 | Unique org slug | M | 2 | Used in URLs |
| ORG-3 | Invite members by email with a role | M | 2 | Invite expires |
| ORG-4 | Change a member's role | M | 2 | Audited |
| ORG-5 | Remove a member | M | 2 | Audited; incidents keep their history |
| ORG-6 | Multi-org membership + org switcher | M | 2 | One login, several tenants |
| ORG-7 | Org settings (name, slug, defaults) | M | 2 | OWNER only |
| ORG-8 | Delete organization (soft-first, hard later) | S | 10 | Danger zone, confirmed twice |
| ORG-9 | Teams / groups inside an org | L | — | Only if customers ask |
| ORG-10 | On-call schedules & rotation | L | — | Big feature; own milestone |

## 3. Projects & services

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| SVC-1 | Create/edit/archive projects | M | 4 | Slug unique per org |
| SVC-2 | Create/edit services inside a project | M | 4 | |
| SVC-3 | Service status: OPERATIONAL / DEGRADED / OUTAGE / MAINTENANCE | M | 4 | Drives the status page |
| SVC-4 | Manual status change with an audit entry | M | 4 | |
| SVC-5 | Service status history | S | 4 | Simple append-only table later |
| SVC-6 | Dependency links ("Checkout depends on Postgres") | L | — | Blast-radius view |
| SVC-7 | Uptime % per service (30/90 days) | L | — | Needs a status-history table |

## 4. Incidents

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| INC-1 | Create incident (title, description, severity, project, service) | M | 5 | RESPONDER+ |
| INC-2 | Severity: LOW / MEDIUM / HIGH / CRITICAL | M | 5 | Default MEDIUM |
| INC-3 | Status state machine with validated transitions | M | 5 | Server-side enforcement |
| INC-4 | Assign / reassign to a member | M | 5 | Same-org only |
| INC-5 | Timeline events: STATUS_CHANGED, SEVERITY_CHANGED, ASSIGNED, COMMENT, LINKED | M | 5 | Append-only |
| INC-6 | Comments with internal/public visibility | M | 5 | Internal stays internal |
| INC-7 | Link related incidents | S | 5 | Uses `LINKED` event |
| INC-8 | Resolve + reopen with `resolvedAt` handling | M | 5 | Reopen is recorded |
| INC-9 | Filter/sort/search the incident list | M | 5 | Status, severity, service, assignee, date |
| INC-10 | Incident templates (e.g. "DB failover") | L | — | Saves typing at 2 a.m. |
| INC-11 | Post-mortem document attached to a resolved incident | L | — | Natural paid-tier feature |
| INC-12 | Bulk actions | L | — | |

## 5. Public status pages

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| SP-1 | Create status page with unique slug + name | M | 6 | |
| SP-2 | Attach services with public display name and order | M | 6 | Hide internal service names |
| SP-3 | Publish / unpublish toggle | M | 6 | Unpublished = 404 |
| SP-4 | Unauthenticated `/status/<slug>` view | M | 6 | Only public data |
| SP-5 | Active + resolved incident history on the page | M | 6 | |
| SP-6 | Customer-facing wording for incidents | M | 6 | Separate from internal notes |
| SP-7 | Email/RSS subscribers to status updates | L | — | Strong retention feature |
| SP-8 | Custom domain (status.customer.com) | L | — | Paid-tier feature |
| SP-9 | Branding: logo, accent colour | L | — | Paid-tier feature |
| SP-10 | Component uptime bars (90-day history) | L | — | Classic expectation, needs history table |

## 6. Integrations & ingestion

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| INT-1 | Generic webhook endpoint with HMAC verification | M | 7 | Front door for machines |
| INT-2 | Stale-timestamp rejection | M | 7 | Replay protection |
| INT-3 | Idempotent event handling | M | 7 | No duplicate incidents |
| INT-4 | Endpoint enable/disable + rotate secret | M | 7 | Store hash only |
| INT-5 | GitHub provider mapping | S | 7 | Deploy failures → incident |
| INT-6 | Sentry provider mapping | S | 7 | Error spike → incident |
| INT-7 | Grafana / Prometheus Alertmanager mapping | S | 7 | Classic monitoring source |
| INT-8 | Slack outbound notifications | L | — | Await first paying request |
| INT-9 | Slack slash-command incident creation | L | — | Very popular request |
| INT-10 | Outbound webhooks (customer receives events) | L | — | Enables customer automations |
| INT-11 | Read-only REST API + tokens | L | — | |

## 7. Notifications

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| NOT-1 | Email on incident created / assigned / resolved | M | 8 | Per org settings |
| NOT-2 | `PENDING → SENT/FAILED` lifecycle + `sentAt` | M | 8 | Visible to admins |
| NOT-3 | One retry on failure | M | 8 | |
| NOT-4 | Pluggable provider adapter (console / Resend) | M | 8 | Dev-friendly |
| NOT-5 | Per-member notification preferences | S | 8 | Avoids alert fatigue |
| NOT-6 | Severity-based routing (only HIGH+ at night) | L | — | On-call realism |
| NOT-7 | SMS / phone escalation | L | — | Costly; only if demanded |
| NOT-8 | Digest of past-week incidents | L | — | Good for managers |

## 8. Audit, security & compliance

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| AUD-1 | Audit log of every mutation (actor, action, entity, metadata) | M | 9 | |
| AUD-2 | Admin-only, org-scoped, paginated audit viewer | M | 9 | |
| AUD-3 | Immutable entries (no edit/delete in product) | M | 9 | |
| AUD-4 | No secrets/tokens/hashes ever logged | M | 9 | Test-enforced |
| AUD-5 | CSV export of audit logs | S | 9 | Auditors love this |
| AUD-6 | Configurable retention (default 12 months) | S | 9 | Cost vs trust |
| AUD-7 | Data export (incidents + audit) on request | S | 10 | Portability promise |
| AUD-8 | Account deletion / right-to-erasure flow | M | 10 | DPDP/GDPR requirement |
| AUD-9 | Session management (see + revoke devices) | L | — | |
| AUD-10 | IP allowlist for dashboard | L | — | Enterprise trigger |

## 9. Dashboard & experience

| ID | Feature | P | Milestone | Notes |
|---|---|:--:|---|---|
| UX-1 | Overview: active incidents, service statuses, recent activity | M | 5 | Landing screen after login |
| UX-2 | Loading, empty and error states on every screen | M | 10 | Non-negotiable quality bar |
| UX-3 | Accessible forms (labels, focus, keyboard) | M | 10 | WCAG 2.1 AA |
| UX-4 | Keyboard shortcuts for responders | S | 10 | `c` to create incident |
| UX-5 | Tablet-usable layout | S | 10 | Phone is read-mostly |
| UX-6 | Dark mode | L | — | Popular, cheap to add |
| UX-7 | Public status page theming | L | — | Paid tier |
| UX-8 | In-app command palette | L | — | Delight, not necessity |

---

## Explicitly excluded from ARCH (v1 and probably forever)

AI models · code generation · debugging tools · hosting customer applications · CI/CD pipelines ·
Kubernetes management · billing/payments inside the product · native mobile apps · microservices ·
real-time chat · replacing GitHub / Slack / AWS / IDEs.

Anything on this list that a customer requests should be answered with an **integration**, not a
new product surface.
