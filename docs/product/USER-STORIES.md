# ARCH — User stories & acceptance criteria

**Format:** As a *role*, I want *capability*, so that *outcome*.
Each story carries the acceptance criteria a test can be written from — if it cannot be tested, it
is not a story yet.

Roles: **OWNER**, **ADMIN**, **RESPONDER**, **VIEWER** (definitions in `EXPLAINED-SIMPLY.md` §5).

---

## Epic 1 — Getting in

### US-1.1 Register
*As a new user, I want to create an account, so that I can start using ARCH.*
- Given a valid email + password, when I register, then an account exists and I am signed in.
- Given an email that already exists, when I register, then I see a clear error and no second account is created.
- Given a weak password, when I register, then I am told the requirement before submitting.
- Passwords are never stored in plaintext anywhere, including logs.

### US-1.2 Sign in with GitHub
*As a developer, I want to sign in with GitHub, so that I don't manage another password.*
- Given a GitHub account, when I authorize, then I am signed in and my email/name populate my profile.
- Given a GitHub email that matches an existing account, then the accounts link instead of duplicating.
- Given a cancelled authorization, then I return to the login screen with a non-scary message.

### US-1.3 Reset password
- Given a registered email, when I request a reset, then I receive a single-use link that expires.
- Given an unknown email, then the response is identical to the success case (no account enumeration).

---

## Epic 2 — Organizations

### US-2.1 Create an organization
*As a founder, I want my own organization, so that my team's incidents are separate from everyone else's.*
- Given I'm signed in and have no org, when I create one with a name, then I become its OWNER and land on the dashboard.
- Given a taken slug, then I'm offered a suggestion rather than a raw error.

### US-2.2 Invite a teammate
*As an ADMIN, I want to invite a teammate with a role, so that they can help during incidents.*
- Given a valid email + role, when I invite, then the invitee receives an email and appears as pending.
- Given an invite to an existing member, then I'm told they're already in the org.
- Given an invite expires, then the link stops working and it can be re-sent.
- Invite creation is written to the audit log.

### US-2.3 Change a role
*As an OWNER, I want to change someone's role, so that access matches their job.*
- Given a member and a new role, when I change it, then permissions change immediately (next request).
- Given an attempt to demote the last OWNER, then it's rejected.
- The change is recorded with actor, target, before and after.

### US-2.4 Switch organization
- Given membership of two orgs, when I switch, then every screen and API call is scoped to the new org.
- Given I switch mid-session, then no cached data from the previous org is visible.

### US-2.5 Isolation
*As a customer, I want certainty that other tenants can't see my data.*
- Given an ID belonging to another org, when I request it, then the response is 404 — never 200, never 403.
- Given I tamper with `organizationId` in a request body, then the server ignores it and uses my session's org.
- Given a status page slug that is unpublished, then an unauthenticated visitor gets 404.

---

## Epic 3 — Projects & services

### US-3.1 Model what I run
*As an ADMIN, I want to describe my projects and services, so that incidents attach to real things.*
- Given an org, when I create a project, then its slug is unique within the org.
- Given a project, when I add services, then each appears with a default status OPERATIONAL.
- Given a VIEWER, then create/edit controls are absent *and* the API rejects the same request.

### US-3.2 Change a service status
- Given a service, when I set it to DEGRADED, then the status changes, the change is audited, and any attached published status page reflects it.

---

## Epic 4 — Incidents

### US-4.1 Create an incident
*As a RESPONDER, I want to declare an incident fast, so that the team converges immediately.*
- Given title + severity (+ optional project/service), when I create, then the incident exists with status INVESTIGATING, `startedAt` now, and me as creator.
- Given I supply only a title, then creation still succeeds with sensible defaults.
- Given a VIEWER, then creation is rejected with 403.
- Creation writes an incident event and an audit entry.

### US-4.2 Move through the state machine
*As a RESPONDER, I want status to reflect reality, so that everyone knows where we are.*
- Legal: `INVESTIGATING→IDENTIFIED`, `IDENTIFIED→MONITORING`, `MONITORING→RESOLVED`, `RESOLVED→INVESTIGATING` (reopen). Forward skips are also legal (`INVESTIGATING→MONITORING`, `INVESTIGATING→RESOLVED`, `IDENTIFIED→RESOLVED`) because real incidents get fixed before they are fully understood.
- Illegal (e.g. `MONITORING→IDENTIFIED`, or `RESOLVED→MONITORING` without reopening): rejected with a message naming the allowed next states.
- Given a transition to RESOLVED, then `resolvedAt` is stamped. Given a reopen, then it is cleared.
- Every transition writes an `IncidentEvent(STATUS_CHANGED)` with before/after and an audit entry.

### US-4.3 Assign an incident
- Given an incident and a same-org member, when I assign, then `assignedToId` updates, the assignee is notified, and an `ASSIGNED` event is recorded.
- Given a user from another org, then assignment is rejected (404 for the user, no leak).

### US-4.4 Collaborate on the timeline
*As a responder, I want one chronological truth, so the post-mortem writes itself.*
- Given an incident, when I post a comment, then it appears with author and timestamp, newest last.
- Given I mark it internal, then it does not appear on any public surface.
- Given concurrent updates, then no timeline entry is lost or duplicated.
- Timeline is append-only: entries cannot be edited or deleted through the product.

### US-4.5 Find the incident I mean
- Given many incidents, when I filter by status/severity/service/assignee/date, then results match exactly and pagination is stable.
- Given no matches, then I see a helpful empty state, not a blank table.

### US-4.6 Severity reflects reality
- Given severity CRITICAL, then it's visually unmistakable and (by org setting) notifies with higher urgency.
- Given a severity change, then it's a timeline event and audit entry with before/after.

---

## Epic 5 — Status pages

### US-5.1 Build a status page
*As an ADMIN, I want customers to check status without emailing support.*
- Given an org, when I create a status page, then it has a unique global slug and is unpublished by default.
- Given a taken slug, then I get a suggestion.

### US-5.2 Choose what customers see
- Given services, when I attach them, then I can set a public display name, order, and hide internal-only ones.
- Given an attached service, then its live status renders on the page.

### US-5.3 Publish safely
- Given an unpublished page, when a visitor opens `/status/<slug>`, then they get 404.
- Given I publish, then the page is publicly readable with no login, and only public-safe content appears.
- Given I unpublish, then the page returns 404 again within seconds.
- Publishing/unpublishing is audited.

### US-5.4 Read it as a customer
- Given a customer on a slow phone, then the page renders useful content quickly and remains readable if JS fails.
- Given active incidents, then they are listed with customer-facing wording and timestamps.
- Given internal comments on that incident, then they never appear here.

---

## Epic 6 — Integrations

### US-6.1 Alert lands as an incident
*As an on-call engineer, I want my monitoring tool to open an incident automatically.*
- Given a correctly signed payload, when it arrives, then an incident is created or updated and a timeline entry records the source.
- Given an invalid signature, then the request is rejected with 401 and **nothing** is written to the database.
- Given a stale timestamp, then it is rejected.
- Given the same event delivered twice, then no duplicate incident is created (idempotency).

### US-6.2 Manage endpoint secrets
- Given an endpoint, when I create it, then the secret is shown once and only its hash is stored.
- Given I rotate the secret, then old signatures stop working and the change is audited.
- Given I disable an endpoint, then new payloads are rejected while history is preserved.
- Secrets never appear in logs or API responses.

---

## Epic 7 — Notifications

### US-7.1 Know what happened without watching the screen
- Given an org setting, when an incident is created/assigned/resolved, then the relevant members receive an email.
- Given a send succeeds, then status becomes SENT with `sentAt`.
- Given a send fails, then it is retried once, and if it fails again status becomes FAILED and admins can see it.
- Given a member opted out of non-critical mail, then they are skipped for LOW/MEDIUM.

### US-7.2 No alert fatigue
- Given repeated updates on one incident, then a member doesn't receive one email per keystroke (batching or event selection).
- Given quiet hours are configured (later), then only CRITICAL breaks through.

---

## Epic 8 — Trust & audit

### US-8.1 Prove who did what
*As a CTO, I want evidence of every change, so security reviews and post-mortems are cheap.*
- Given any mutation, then an audit entry exists with actor, action, entity, metadata and timestamp.
- Given I'm an ADMIN, when I open the audit screen, then I see only my org's entries, paginated.
- Given I'm a VIEWER, then I cannot read the audit API even with a hand-crafted request.
- Given metadata, then it contains no tokens, hashes or secrets.

### US-8.2 Leave with my data / delete my data
- Given I request an export, then I receive my incidents and audit logs in a portable format.
- Given I request deletion, then personal data is deleted or irreversibly anonymised on a stated timeline, and remaining records are explained.

---

## Epic 9 — Dashboard quality

### US-9.1 Understand state at a glance
- Given I log in, then I see active incidents, service statuses and recent activity within one screen.
- Given a slow network, then skeletons appear rather than a blank page or a jump.
- Given zero data, then I'm told what to do next, not shown an empty table.

### US-9.2 Use it with a keyboard and a screen reader
- Given I navigate by keyboard only, then every control is reachable and focus is visible.
- Given a screen reader, then form fields announce labels, errors and required status.

---

## Cross-cutting: definition of done for any story

1. Database, service, API and UI shipped together (thin vertical slice).
2. All external input validated with Zod.
3. Permission checked server-side; cross-tenant access returns 404.
4. Audit entry written for every mutation.
5. Loading, empty and error states present.
6. Automated tests: happy path, permission failure, and cross-tenant isolation.
7. Docs updated if behaviour differs from the PRD.

---

*Owner: Product · Last reviewed: 2026-09-23*
