# ARCH — Frequently asked questions

Written for the people who actually evaluate and use the product. If an answer here is vague, that is
a bug in this document — tell us at [SUPPORT EMAIL].

---

## Getting started

**What is ARCH, in one sentence?**
ARCH is where your team goes when your application breaks — incident response, a timeline, and a public
status page, priced per organization instead of per engineer.

**How long does setup take?**
Under an hour for a typical team: create an organization, add a project, add your services, wire one
webhook, publish a status page.

**Do I need monitoring to use ARCH?**
No. Monitoring is not included and is not required. You can create incidents by hand, or connect any
tool that can send a webhook (GitHub, Sentry, Grafana, Datadog, CloudWatch, a cron job with `curl`).

**Do I need Slack?**
No, and we don't force it. Slack notifications are an optional add-on in a later release. Everything
works in the web dashboard.

**What do I need to sign up?**
An email address, or a GitHub account. No credit card for the Free tier or the trial.

---

## Pricing and plans

**What does it cost?**
Free for small teams; paid plans start at ₹1,499 (~$19) per month for the whole organization. See the
[pricing document](../product/PRICING.md) for the current table.

**Wait — per organization, not per user?**
Yes. That is the point. Include 25 seats on a mid-tier plan for the price most tools charge for one or
two. On-call rotations shouldn't be limited by a finance decision.

**What happens if I exceed my seat limit?**
Nothing breaks, and nobody loses access. The dashboard asks you to upgrade before you can invite
someone new. A downgrade never removes access to an open incident.

**Is there a free trial?**
Yes — 14 days of full features, no credit card required.

**Do you offer discounts?**
Yes: annual billing (~2 months free), early adopters, startups, and open-source/non-profit/education
projects. Details in [Pricing §4](../product/PRICING.md).

**Will you raise prices?**
Possibly, as the product grows. Existing customers get at least 30 days' notice and the change applies
from their next renewal, never mid-term.

---

## Incidents and workflow

**What are the incident statuses?**
`INVESTIGATING` → `IDENTIFIED` → `MONITORING` → `RESOLVED`, and an incident can be reopened (which is
recorded). Skipping forward is allowed; jumping sideways into a state that makes no sense is rejected
by the server, not just hidden in the UI.

**What are the severities?**
LOW, MEDIUM, HIGH, CRITICAL. Severity is separate from status — "how bad" and "where are we" are
different questions.

**Can I keep internal notes off the public status page?**
Yes. Every update is marked internal or public, and only public updates appear on your status page.

**Can two people work the same incident at once?**
Yes. Updates are stored as an append-only timeline, so nothing is overwritten. Two responders may need
a refresh to see each other's entries (real-time streaming is not in v1).

**Can I edit or delete a timeline entry?**
No — and that is deliberate. The timeline is the record. You can add a correcting entry, which is
itself visible, so the history stays honest. This is what makes it usable in a post-mortem or a
customer dispute.

**How long does history stay?**
By plan: Free 30 days · Starter 12 months · Growth 24 months · Scale 36 months. When a window
expires, the data is permanently deleted by an automated job.

---

## Status pages

**Can customers see it without an account?**
Yes. `/status/<slug>` is public and requires no login. Unpublished pages return a 404, so half-built
pages never leak.

**Can I hide internal service names?**
Yes. Attach a service to a page with a public display name — "Checkout" instead of
`svc-checkout-prod-2`.

**Can I use my own domain, like status.mycompany.com?**
On Growth and Scale plans (from v1.2). Free and Starter use the ARCH subdomain.

**What if my status page itself goes down?**
It is cached and separated from dashboard load for exactly that reason, and it carries the strictest
uptime target in our SLA (99.9%). It is the one public surface we treat as critical.

**Is the status page accessible?**
Status is always conveyed by colour **plus** a shape and a text label, never colour alone. Pages are
readable if JavaScript fails.

---

## Integrations and webhooks

**Which tools can send alerts?**
Anything that can send an HTTP POST: GitHub, Sentry, Grafana/Prometheus Alertmanager, Datadog,
CloudWatch via a Lambda, Uptime Kuma, or a shell script. Named first-class providers come first for
GitHub, Sentry and Grafana; "generic" covers everything else.

**How are webhooks secured?**
Each endpoint has a secret. Requests must carry a valid HMAC signature, verified **before** the payload
is parsed, and stale timestamps are rejected. We store only a hash of the secret — we cannot show it
to you again after creation, so save it when it is displayed.

**Will retries create duplicate incidents?**
No. Delivery is idempotent: a repeated event updates the existing incident instead of creating another.

**What happens if someone sends a forged payload?**
It is rejected with 401 and nothing is written to the database.

---

## Security and privacy

**Who can see my incidents?**
Only members of your organization, with the access their role grants. Cross-organization requests
return 404 — even a request with a valid ID from another tenant reveals nothing.

**Is data encrypted?**
Yes: TLS in transit, encryption at rest, hashed passwords, and secrets stored only as hashes.

**Do you train AI on my data?**
No. ARCH has no AI features in v1, and we do not train models on customer content.

**Do you sell data?**
No. Not to anyone, at any price.

**Where is my data stored?**
[PRIMARY REGION]. The full subprocessor list, with locations, is in the
[DPA Annex 3](../legal/DATA-PROCESSING-ADDENDUM.md).

**Are you SOC 2 / ISO 27001 / HIPAA compliant?**
**No — not yet.** We publish exactly what we do and don't have rather than implying otherwise. Our
controls are documented in [Security & Compliance](../engineering/SECURITY-AND-COMPLIANCE.md). If a
certification is a hard requirement for you today, we are not the right choice yet, and we would rather
tell you that now.

**Is ARCH suitable for storing patient or card data?**
No, and the [Acceptable Use Policy](../legal/ACCEPTABLE-USE-POLICY.md) prohibits it. Incident content
should never contain health records, card numbers, or plaintext secrets.

**Can I test your security?**
Yes — coordinated disclosure is welcome, see [SECURITY.md](../../SECURITY.md). Do not run load tests
against production without asking first.

---

## Accounts, roles and teams

**What are the roles?**
OWNER (everything, including billing and deletion) · ADMIN (people, integrations, publishing) ·
RESPONDER (works incidents) · VIEWER (read-only).

**Can someone be in two organizations?**
Yes, with a different role in each, and an organization switcher in the dashboard.

**What happens when an employee leaves?**
An OWNER or ADMIN removes them; their timeline entries remain attributed to them (history is not
rewritten, for audit integrity). Revoke their access in any connected tools separately.

**How do I delete my organization?**
OWNER-only, from settings. You get [30] days to export, then content is deleted or anonymised, except
where retention is legally required. This is a promised feature, not a support ticket.

---

## Reliability and support

**What uptime do you promise?**
Public status page 99.9% (Growth and above), dashboard and webhook ingestion 99.5–99.9%. Free tier
carries no SLA. Full detail, including credits, in the [SLA](../legal/SERVICE-LEVEL-AGREEMENT.md).

**What if ARCH itself has an incident?**
We run it in ARCH, publicly: declared incident, status page updated before the root cause is known,
updates every 30 minutes, then a blameless post-mortem published within 5 business days.

**How do I get support?**
[SUPPORT EMAIL]. Response targets by plan are in the [Support Policy](SUPPORT-POLICY.md) — the
shortest is 1 hour for S1 on Enterprise.

**Can I file a bug or request a feature?**
Yes, and please do. Features are prioritised by how many customers ask and whether the request removes
manual work. The full feature list, with what's planned and what is deliberately excluded, is in
[FEATURES.md](../product/FEATURES.md).

---

## Migrating from another tool

**Can I import my existing incidents?**
Spreadsheet/CSV import is on the roadmap; in the meantime we import history for you as part of
onboarding, on paid plans. Ask [SUPPORT EMAIL].

**We're on Opsgenie and Atlassian is moving us to JSM. Can you help?**
Yes — this is a common case. Add your projects and services, point your existing integrations at an
ARCH webhook, publish a status page, and run both tools in parallel for one incident cycle before
switching.

**How do we leave if we want to?**
Export incidents, timeline and audit logs in a portable format, in-product or on request. No lock-in
clauses, no export fees, no "contact your account manager" to get your own data.

---

*Owner: Support · Last reviewed: 2026-09-23 · Review cadence: 90 days*
