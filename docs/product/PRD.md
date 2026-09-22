# ARCH — Product Requirements Document (PRD)

**Version:** 1.0 · **Status:** Approved for build · **Owner:** Product · **Last reviewed:** 2026-09-23

---

## 1. Problem

When a software system breaks, a small engineering team loses control of three things at once:

1. **Coordination** — who is doing what is negotiated in a group chat, live, under pressure.
2. **Communication** — customers and internal stakeholders ask "is it down?" repeatedly; someone has
   to answer each one by hand.
3. **Memory** — afterwards, nobody can reconstruct the sequence of events, the duration of impact,
   or who decided what.

Enterprise incident tools solve this, but they are priced and packaged for companies with a
dedicated SRE function: per-user pricing that punishes on-call rotation, seat minimums, annual
contracts, and 40-field incident forms nobody fills in at 2 a.m. Smaller teams therefore run
incidents in a chat thread and a spreadsheet — and pay for it in downtime, customer trust, and
post-mortem arguments.

**The gap ARCH fills:** the discipline of an incident process, at the price and setup cost a
20-person engineering team will actually accept.

---

## 2. Goals and non-goals

### Goals for v1
| # | Goal | Success signal |
|---|---|---|
| G1 | A team can be fully operational within one afternoon | Time-to-first-incident < 60 minutes from signup |
| G2 | Incident response is captured without extra admin work | ≥ 80% of incidents have a timeline entry by a non-creator |
| G3 | Customers stop asking if it's down | ≥ 1 published status page per active org |
| G4 | The tool is trustworthy enough for security review | Cross-tenant leaks: zero. Audit log covers 100% of mutations |
| G5 | Running costs stay low enough for honest pricing | Infrastructure < 15% of revenue at 100 orgs |

### Non-goals for v1 (explicitly out of scope)
AI features · code generation · debugging · hosting customer apps · CI/CD · Kubernetes management ·
billing/payments inside the product · mobile apps · microservices · real-time chat ·
replacing GitHub, Slack, AWS or the IDE.

> Reason for the hard line: every one of these would roughly double scope, and none of them is the
> reason a team would choose ARCH over the incumbent on day one.

---

## 3. Users and roles

| Persona | Role in ARCH | What they need | What annoys them |
|---|---|---|---|
| **Priya, SRE / on-call engineer** | RESPONDER | One place to see the incident, claim it, post updates fast | Forms, slow UIs, being asked for status by three people |
| **Arjun, engineering manager / incident commander** | ADMIN | Assign people, see severity, know when it started and ended | Not knowing who is on it; messy post-mortems |
| **Meera, support lead** | VIEWER (or RESPONDER) | A public page to point customers at; confidence in facts | Copy-pasting status updates into email |
| **Rohit, CTO / founder** | OWNER | Cost predictability, security posture, audit trail for enterprise buyers | Per-seat pricing that punishes rotation |
| **Dev, tooling engineer** | ADMIN | Webhook ingestion from GitHub/Sentry/Grafana; API access | Brittle integrations that need babysitting |

---

## 4. Scope of v1 (the 10 milestones, condensed)

1. Setup, containerised Postgres, Prisma migrations, Auth.js login/register, health check.
2. Organizations + membership; creator becomes OWNER; members see only their own org.
3. RBAC enforced server-side on every mutation, per the permission matrix.
4. Projects and services with live status.
5. Incident CRUD, assignment, timeline events, validated state machine.
6. Public status pages: compose, publish, unpublish, unauthenticated read.
7. Webhook ingestion with HMAC verification and stale-timestamp rejection.
8. Notifications with `PENDING → SENT/FAILED` lifecycle and one retry.
9. Audit logs on every mutation, admin-viewable, paginated.
10. Hardening: rate limiting, error boundaries, loading/empty/error states, tests, deploy docs.

---

## 5. Functional requirements

Numbered, testable, and traceable to a milestone.

### FR-1 Authentication & accounts
| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | A user can register with email + password or GitHub OAuth | Must |
| FR-1.2 | Passwords are stored only as a strong hash (never reversible) | Must |
| FR-1.3 | Unauthenticated requests to `/dashboard/*` and protected APIs redirect to login or return 401 | Must |
| FR-1.4 | `GET /api/health` returns 200 without authentication | Must |
| FR-1.5 | Auth endpoints are rate limited | Must |

### FR-2 Organizations & membership
| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Any user can create an organization and becomes its OWNER | Must |
| FR-2.2 | An OWNER/ADMIN can invite a person by email; invited user joins with an assigned role | Must |
| FR-2.3 | A user belongs to one or many organizations and switches between them | Must |
| FR-2.4 | Every tenant-owned row carries `organizationId` | Must |
| FR-2.5 | Changing a member's role writes an audit log entry | Must |

### FR-3 Authorization (RBAC)
| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Permissions are defined in one place and checked server-side on every mutation | Must |
| FR-3.2 | Insufficient role → 403 | Must |
| FR-3.3 | Resource belonging to another organization → 404 (never 403/200) | Must |
| FR-3.4 | Server ignores any organization or role sent by the client | Must |

### FR-4 Projects & services
| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | ADMIN+ can create projects within their org; project slugs unique per org | Must |
| FR-4.2 | ADMIN+ can create services inside a project | Must |
| FR-4.3 | Each service has a status: `OPERATIONAL`, `DEGRADED`, `OUTAGE`, `MAINTENANCE` | Must |
| FR-4.4 | Service status changes are audited | Must |

### FR-5 Incidents
| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | RESPONDER+ can create an incident with title, description, severity, project and optional service | Must |
| FR-5.2 | Severity ∈ {LOW, MEDIUM, HIGH, CRITICAL}; default MEDIUM | Must |
| FR-5.3 | Status transitions follow the state machine; illegal transitions rejected server-side | Must |
| FR-5.4 | RESPONDER+ can assign/reassign an incident to a member of the same org | Must |
| FR-5.5 | Timeline: status changes, severity changes, assignments, comments and links are recorded | Must |
| FR-5.6 | Resolving stamps `resolvedAt`; reopening clears it and is recorded | Must |
| FR-5.7 | The list view filters by status, severity, service, assignee and date; default sort newest first | Must |
| FR-5.8 | Every incident mutation writes an audit log entry | Must |
| FR-5.9 | An incident update can be marked internal (not shown on public status page) | Should |

### FR-6 Status pages
| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | ADMIN+ creates a status page with a globally unique slug and a name | Must |
| FR-6.2 | Services are attached to a page with an optional public display name and order | Must |
| FR-6.3 | ADMIN+ publishes/unpublishes; unpublished pages return 404 publicly | Must |
| FR-6.4 | `/status/<slug>` is readable without authentication and shows per-service status + active incidents | Must |
| FR-6.5 | Only public (non-internal) updates appear on the public page | Must |
| FR-6.6 | The public page renders acceptably on a slow mobile connection | Should |
| FR-6.7 | Historical uptime (last 30/90 days) per service | Later |

### FR-7 Webhooks & integrations
| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | POST `/api/webhooks/:provider` accepts provider payloads | Must |
| FR-7.2 | Requests are verified via HMAC signature before parsing; failure → 401 and nothing stored | Must |
| FR-7.3 | Stale timestamps are rejected | Must |
| FR-7.4 | Only `secretHash` is stored; raw secrets are never persisted or logged | Must |
| FR-7.5 | A valid payload creates or updates an incident and its timeline | Must |
| FR-7.6 | Duplicate delivery of the same event does not create a duplicate incident (idempotency) | Must |
| FR-7.7 | Named first-class providers: generic, GitHub, Sentry, Grafana | Should |
| FR-7.8 | Endpoint can be deactivated without deletion | Must |

### FR-8 Notifications
| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | Notifications are created on incident creation, assignment and resolution (per org settings) | Must |
| FR-8.2 | Channels: EMAIL (v1), SLACK (later) | Must / Later |
| FR-8.3 | Lifecycle `PENDING → SENT` or `PENDING → FAILED`, with `sentAt` stamped | Must |
| FR-8.4 | One automatic retry on failure; failures visible to admins | Must |
| FR-8.5 | Email provider is swappable behind an adapter; dev uses console output | Must |
| FR-8.6 | Members can opt out of non-critical notifications | Should |

### FR-9 Audit & observability
| ID | Requirement | Priority |
|---|---|---|
| FR-9.1 | Every mutating action is recorded with actor, action, entity, timestamp and metadata | Must |
| FR-9.2 | ADMIN+ can view audit logs, org-scoped and paginated | Must |
| FR-9.3 | Audit log entries cannot be edited or deleted via the product | Must |
| FR-9.4 | Logs never contain tokens, password hashes or webhook secrets | Must |
| FR-9.5 | Export audit log as CSV | Should |

### FR-10 Dashboard experience
| ID | Requirement | Priority |
|---|---|---|
| FR-10.1 | Overview: active incidents, services by status, recent activity | Must |
| FR-10.2 | Every screen ships loading, empty and error states | Must |
| FR-10.3 | Forms use accessible labels, keyboard-operable controls, sensible error messages | Must |
| FR-10.4 | Usable on a tablet-sized viewport; phone is read-mostly | Should |
| FR-10.5 | Dark mode | Later |

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| **Multi-tenant safety** | No query may return data without an `organizationId` filter; verified by tests that attempt cross-tenant access and expect 404 |
| **Performance** | Dashboard lists respond < 400 ms p95 at 10k incidents/org; public status page < 200 ms p95 (cached) |
| **Availability** | Status page target 99.9% monthly (see SLA); dashboard best-effort |
| **Security** | OWASP Top 10 reviewed; strict TypeScript; all external input validated by Zod; secrets only in env |
| **Privacy** | Personal data limited to name, email, role, and content the customer chooses to store; DPDP Act 2023 and GDPR-aware posture |
| **Accessibility** | WCAG 2.1 AA for dashboard forms and public status page |
| **Auditability** | 100% of mutations audited; retention configurable, default 12 months |
| **Portability** | Customer can export incidents + audit logs; no lock-in on the raw record |
| **Observability** | Structured logs with request IDs; error tracking; health endpoint |
| **Cost** | Single deployable + managed Postgres; infra < 15% of revenue at 100 orgs |

---

## 7. Data model summary

Canonical definition lives in `AGENTS.md` §4 (`prisma/schema.prisma`). Entities:

| Entity | Purpose | Tenant-owned |
|---|---|---|
| `User`, `Account`, `Session`, `VerificationToken` | Auth.js-compatible identity tables | No |
| `Organization` | The tenant | Root |
| `Membership` | User ↔ Organization with role | Yes |
| `Project`, `Service` | What the customer runs and monitors | Yes |
| `Incident`, `IncidentEvent` | The incident record and its timeline | Yes |
| `StatusPage`, `StatusPageService` | What customers see publicly | Yes |
| `WebhookEndpoint` | Inbound integration + secret hash | Yes |
| `AuditLog` | Immutable action history | Yes |
| `Notification` | Outbound message attempts | Yes |

Enums: `MembershipRole`, `IncidentSeverity`, `IncidentStatus`, `ServiceStatus`,
`IncidentEventType`, `NotificationChannel`, `NotificationStatus`.

---

## 8. Key user flows

**Flow A — First run (target: under 60 minutes)**
Sign up → create organization → create project → add two services → connect one webhook → publish
status page → send the link to support.

**Flow B — Alert to resolved**
Webhook fires → incident auto-created → on-call is notified → claims it → posts a public update →
status page shows OUTAGE → fix deployed → status MONITORING → RESOLVED → customers emailed → audit
trail complete.

**Flow C — Manual incident (no monitoring yet)**
RESPONDER creates incident from the dashboard → severity CRITICAL → assigns a peer → timeline
updates → resolve.

**Flow D — Security review**
Reviewer asks: who can see our data, where is it stored, can you prove who changed a role?
Answers live in `engineering/SECURITY-AND-COMPLIANCE.md` + the audit log screen.

---

## 9. Success criteria for v1

- [ ] All ten milestones accepted, with the required tests green.
- [ ] A cold-start team completes Flow A without documentation or hand-holding in under 60 minutes.
- [ ] Cross-tenant isolation test suite passes, including attempts to leak by ID and by slug.
- [ ] An illegal incident transition is impossible via API (not merely hidden in the UI).
- [ ] An unsigned webhook is rejected and leaves no database row behind.
- [ ] Public status page stays correct and fast while the dashboard is under load.
- [ ] Infra cost per 100 organizations stays within the G5 target.

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Incumbents are free at low tiers (Better Stack, UptimeRobot) | Hard to charge small teams | Compete on process depth + audit trail + honest seat pricing; win teams with real on-call burden |
| Alerts are the moat-less part; ingestion is commoditised | Churn to cheaper tools | Own the *response workflow and public communication*, not the alerting |
| Small team, broad legal surface (DPA, SLA, DPA-India) | Slow enterprise deals | Publish a clean, honest legal set now (this repo) rather than retrofitting after a security review |
| Scope creep into AI/debugging/CI | v1 never ships | Out-of-scope list in §2 is contractual with ourselves |
| Multi-tenant data leak | Existential | Repository-layer enforcement + mandatory isolation tests in CI |
| Webhook spoofing | Data integrity | HMAC before parse, timestamp freshness, secret hashes only |

---

## 11. Open questions

1. Should RESPONDER be allowed to publish public status updates in v1, or is that ADMIN-only?
   *(Current spec: ADMIN+ publishes; respond to the pressure after real usage.)*
2. Free tier: 1 org, 2 seats, 1 status page — generous enough to seed adoption, or does it cannibalise
   the paid plan?
3. Do we need Slack *outbound* notifications in v1, or is email enough until a paying customer asks?
4. Retention default: 12 months of audit logs — is that the right trust/cost trade-off?
5. On-premise/self-host: later, or never? (Currently: never in v1, revisit at 25 customers.)

---

*Owner: Product · Review cadence: 90 days · Related: `FEATURES.md`, `USER-STORIES.md`, `ROADMAP.md`*
