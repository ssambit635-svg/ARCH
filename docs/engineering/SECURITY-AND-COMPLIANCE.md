# ARCH — Security & compliance

**Version:** 1.0 · **Owner:** Engineering · **Last reviewed:** 2026-09-23
**Audience:** internal engineers, and customers running a security review.

> This document describes controls that are **required by the build contract** (`AGENTS.md` §9) and
> the status of each. Anything marked *Planned* must be implemented before v1.0 ships;
> anything marked *Later* is a known gap we disclose rather than hide.

---

## 1. Security principles

1. **The server is the only authority.** Roles, organization, severity limits and transitions are
   never trusted from the client.
2. **Deny by default.** Every route starts closed; access is granted explicitly.
3. **No existence disclosure.** Foreign resources return 404, never 403.
4. **Validate everything at the boundary.** Zod on bodies, query params, and webhook payloads.
5. **Secrets live in one place.** Environment variables. Never in code, logs, responses or the repo.
6. **Every mutation is recorded.** If it changed data, an audit row exists in the same transaction.
7. **Blast radius is designed, not discovered.** A single-tenant bug must not become a multi-tenant
   incident — enforced by the repository layer, not by reviewer vigilance.
8. **Fail loudly, never silently.** A wrong number on a status page is worse than an error page.

---

## 2. Threat model

Assets: tenant incident data, member identities, webhook secrets, audit history, and the public
status page's *correctness*.

| # | Threat | Vector | Impact | Control |
|---|---|---|---|---|
| T1 | Cross-tenant data access (IDOR) | Guessing/altering IDs, slugs, query params | Severe — trust-ending | Org-scoped repositories, 404 rule, blocking isolation tests |
| T2 | Privilege escalation | Forging role/org in request body or cookie | Severe | Role read from `Membership` in DB; client values ignored |
| T3 | Webhook spoofing | Crafted payload to create fake incidents / status storm | High | HMAC verification before parse; secret hash storage only |
| T4 | Replay attack | Re-sending a valid signed payload | Medium | Timestamp freshness window; idempotency keys |
| T5 | Credential stuffing | Automated login attempts | High | Rate limits, generic error messages, optional 2FA (Later) |
| T6 | Account enumeration | Reset/login responses differ for known emails | Medium | Identical responses and timings for unknown accounts |
| T7 | Injection | Malicious input through forms or webhooks | High | Zod validation, Prisma parameterised queries, no raw SQL |
| T8 | XSS | User content rendered on public status page | High | Framework escaping, no `dangerouslySetInnerHTML` on user content, CSP |
| T9 | Secret leakage | Secrets in logs, errors or API responses | High | Response shaping, no secret fields in selects, log scrubber |
| T10 | Audit tampering | Editing/deleting history to hide actions | High | No product path to update/delete audit rows; DB-level restriction |
| T11 | Denial of service | Flooding public status page or ingest endpoint | Medium | Caching, rate limits, payload size caps |
| T12 | Malicious insider / rogue admin | Admin exporting or altering tenant data | Medium | Audit trail, least privilege, own data export logged |
| T13 | Supply chain | Compromised dependency | High | Lockfile commits, dependency audit in CI, minimal dependency policy |
| T14 | Status page misinformation | Stale cache showing "OPERATIONAL" during an outage | High (reputational) | Invalidation on every relevant write; correctness test |
| T15 | Notification spam | Loop/duplicate events emailing members repeatedly | Medium | Event selection, batching, per-member preferences |

---

## 3. Controls by layer

### Authentication
| Control | Status |
|---|---|
| Email + password and GitHub OAuth via Auth.js | Required (M1) |
| Passwords stored as bcrypt/argon2 hash; never logged or returned | Required (M1) |
| Session cookies: httpOnly, secure, sameSite | Required (M1) |
| Password reset with single-use, expiring token; no account enumeration | Required (M1) |
| Rate limiting on login/register/reset | Required (M10) |
| TOTP two-factor authentication | Later (v1.2) |
| SAML SSO | Later (v2, gated) |
| Session listing and remote revoke | Later |

### Authorization
| Control | Status |
|---|---|
| Single permission source (`lib/permissions.ts`) | Required (M3) |
| `requirePermission(orgId, actor, action)` on every mutation | Required (M3) |
| Role read from DB membership, never from client | Required (M3) |
| Cross-tenant access → 404 | Required (M3) |
| Deny-by-default route coverage tests | Required (M10) |

### Input & output
| Control | Status |
|---|---|
| Zod schemas for every body, query and webhook payload | Required (M1+) |
| Request payload size caps | Required (M10) |
| Output shaping — no internal/hash/token fields in responses | Required |
| CSP, HSTS, `X-Content-Type-Options`, frame-ancestors | Required (M10) |
| No raw SQL; parameterised queries only | Required |
| No `dangerouslySetInnerHTML` for user content | Required |

### Webhooks
| Control | Status |
|---|---|
| HMAC signature verified before parsing | Required (M7) |
| Reject stale timestamps | Required (M7) |
| Store `secretHash` only; show raw secret once at creation | Required (M7) |
| Idempotent handling of repeated deliveries | Required (M7) |
| Per-endpoint rate limit and payload cap | Required (M10) |
| Signature failure returns 401 and writes nothing | Required (M7) |

### Data protection
| Control | Status |
|---|---|
| TLS everywhere; database not publicly reachable | Required |
| Encryption at rest (provider-managed) | Required |
| Tenant scoping enforced in repositories | Required (M3) |
| Backups: daily, encrypted, restore rehearsed quarterly | Required (M10) |
| Per-tenant data export (portability) | Required (M10) |
| Account/org deletion with documented anonymisation | Required (M10) |
| Field-level encryption of webhook secrets (already hashed — not needed) | n/a |
| Per-tenant encryption keys | Not planned |

### Audit & monitoring
| Control | Status |
|---|---|
| Audit row for every mutation, same transaction | Required (M9) |
| Audit rows immutable via the product | Required (M9) |
| No secrets, tokens or password hashes in audit metadata | Required (M9) — test-enforced |
| Structured logs with request id, org id, actor id (never secrets) | Required |
| Error tracking with PII scrubbing | Required (M10) |
| Alerting on auth failures, webhook rejections, 5xx spikes | Required (M10) |

---

## 4. Data classification

| Class | Examples | Handling |
|---|---|---|
| **Personal data** | Name, email, role, session records, IP in logs | Minimal collection; DPDP/GDPR handling; deletable on request |
| **Customer content** | Incident titles, descriptions, timeline comments, service names | Tenant-owned; never read by ARCH staff except with explicit permission for support, and that access is logged |
| **Public content** | Published status page, public incident updates | Intended for the open internet — UI must make "this becomes public" unmistakable |
| **Sensitive-adjacent content** | Incident details referencing customer systems, tokens pasted into comments | **We do not scan customer content.** Acceptable-use policy forbids secrets in comments; UI warns |
| **Secrets (ours)** | `AUTH_SECRET`, webhook signing secret, DB URL, provider keys | Environment only; rotated on exposure; never in repo or logs |
| **Audit data** | Who did what, when | Retained per plan; immutable; exportable |

**Data minimisation:** ARCH asks for an email, an optional name, and whatever the customer chooses to
type into an incident. No tracking pixels, no advertising identifiers, no analytics that identify
people (see Privacy Policy).

---

## 5. Privacy & regulatory posture

| Regime | Applies to | ARCH posture |
|---|---|---|
| **DPDP Act 2023 (India)** | Processing personal data of people in India | Notice + consent via Terms/Privacy acceptance; purpose limitation (providing the service); deletion on request; breach notification process documented |
| **GDPR (EU/UK)** | EU/UK data subjects, if we serve them | Legal-basis mapping (contract performance for account data, legitimate interest for security logs); DPA published; data subject request process; subprocessor list |
| **Data residency** | Customers with locality requirements | Primary region named in the DPA; multi-region or on-prem is a gated v2 item |
| **PCI DSS** | Card data | **Out of scope** — ARCH does not touch card data in v1; payment is handled by an external provider |
| **SOC 2 / ISO 27001** | Enterprise procurement | Not held. Posture described honestly; controls in this document are the starting point. Revisit at ~20 enterprise conversations |
| **HIPAA** | Health data | **Not supported.** Acceptable-use policy forbids PHI/PII of patients in incident content |

**Data subject requests:** export and deletion are product features, not manual tickets — that is why
they are Must requirements in the PRD (AUD-7, AUD-8).

---

## 6. Subprocessors (to be finalised before launch)

Customers must be told exactly who touches their data. Working list:

| Subprocessor | Purpose | Data touched | Region |
|---|---|---|---|
| [Cloud host — e.g. Render / Railway / AWS] | Application + database hosting | All customer data | [Region — e.g. Mumbai / Frankfurt] |
| [Managed Postgres provider] | Database | All customer data | [Region] |
| [Transactional email provider — e.g. Resend] | Notification delivery | Recipient email, incident summary text | [Region] |
| [Error tracking — e.g. Sentry] | Error diagnosis | Stack traces, scrubbed of PII | [Region] |
| [Log/metrics provider] | Observability | Operational metadata, no content | [Region] |
| [Payment provider — e.g. Stripe / Razorpay] | Invoicing | Billing contact + card data (not stored by ARCH) | [Region] |

Rules: every subprocessor is named in the DPA, given 30 days' notice before addition, and bound by
confidentiality terms at least as strict as ours.

---

## 7. Incident response (security)

Distinct from *customer* incidents; both are run with the same discipline.

| Stage | Action | Owner | Target |
|---|---|---|---|
| Detect | Alert from monitoring, report to `security@[domain]`, or employee observation | On-call | < 5 min for automated alerts |
| Triage | Classify: data exposure? confidentiality, integrity, availability? | Engineering lead | < 30 min |
| Contain | Revoke secrets, disable endpoint, block vector — **stop the bleeding first** | On-call | < 1 h for Severe |
| Eradicate | Patch root cause, verify with a regression test | Engineering | < 24 h |
| Notify | Affected customers, and regulators if personal data was breached (DPDP/GDPR timelines) | Founders + counsel | Within statutory windows; no delay to "finish the investigation" first |
| Review | Written post-mortem, blameless, published internally within 5 business days | Incident owner | 5 days |
| Improve | Every action item has an owner and a date | Engineering lead | Tracked to completion |

**Severity for security incidents:** S1 = confirmed tenant data exposure or credential compromise ·
S2 = exploitable vulnerability without confirmed exposure · S3 = misconfiguration with theoretical
impact · S4 = hardening opportunity.

We commit to **disclosing security incidents that could affect customer data**, including when the
impact is uncertain. Silence is the only unforgivable option.

---

## 8. Vulnerability management

| Activity | Cadence | Notes |
|---|---|---|
| Dependency audit (`npm audit` / equivalent) in CI | Every push | Fails on high/critical |
| Dependency updates | Monthly, or immediately for critical CVEs | Lockfile committed |
| Static analysis / linter (TypeScript strict) | Every push | `any` banned in service/repository signatures |
| Secret scanning | Pre-commit + CI | Blocks commits containing key patterns |
| Penetration test | Annually, from v1.1 | Or after any S1 incident |
| Access review (who can reach production) | Quarterly | Least privilege; no shared accounts |

**Disclosure policy:** see [`../../SECURITY.md`](../../SECURITY.md). Report to
`security@[domain]`. Acknowledgement in 48 hours, assessment in 5 business days, coordinated
disclosure, and credit offered unless the reporter declines. We will not pursue legal action against
good-faith researchers who avoid privacy violations and service disruption.

---

## 9. Secure development practices

- **TypeScript strict**, no `any` in service or repository signatures.
- **Every PR is reviewed** — even when the team is one person, the rule is "explain the change in
  writing before merging".
- **Blocking CI suites:** permission matrix, tenant isolation, state machine, webhook signatures.
- **Migrations reviewed as carefully as application code** — a bad migration is a data-loss event.
- **No production data in development.** Ever. Test fixtures only.
- **Secrets rotated** on any suspicion of exposure, and on offboarding.
- **Least privilege for humans too:** production database access is limited to the engineers who need
  it, is per-person, and is logged.

---

## 10. Compliance status summary (honest version)

| Item | Status |
|---|---|
| Multi-tenant isolation controls | Designed, test-enforced at implementation |
| Audit logging of all mutations | Required for v1.0 |
| Encryption in transit / at rest | Required for v1.0 |
| Privacy Policy, Terms, DPA, SLA, Cookie Policy, AUP | Written — placeholders awaiting entity details |
| DPDP/GDPR data subject request handling | Product features in v1.0 (export, delete) |
| Breach notification process | Documented (§7); rehearsed at launch |
| SOC 2 / ISO 27001 | **Not held.** No date committed. Revisit with demand. |
| Penetration test | Planned post-v1.1 |
| HIPAA / PCI | **Not applicable / not supported** — card data never touches ARCH |
| Subprocessor list | Drafted; finalised before launch |

We would rather write "not held" here than insinuate otherwise in a sales call. Customers who need
certifications are not our first customers, and pretending otherwise costs more than it earns.

---

*Owner: Engineering · Review cadence: 90 days, or immediately after any S1/S2 incident*
