# Security policy

**Version:** 1.0 · **Owner:** Engineering · **Last reviewed:** 2026-09-23

ARCH handles incident data for many organizations, so security is not a feature bolted on later —
it is the reason a customer can trust the product at all. We welcome reports, and we will not
retaliate against anyone who reports in good faith.

---

## Reporting a vulnerability

**Email:** [SECURITY EMAIL] (PGP key available at [DOMAIN]/security.txt — include your public key if
you want an encrypted reply)

**Please do not:**
- open a public GitHub issue,
- post about it publicly before we have responded,
- access, modify or exfiltrate data that is not yours,
- run load or denial-of-service tests against production,
- use social engineering against ARCH staff or customers.

**Please do include:**
- a description of the issue and its potential impact,
- the affected URL, endpoint or component,
- reproduction steps, proof-of-concept, or a request ID,
- your assessment of severity,
- how you would like to be credited (or if you prefer to remain anonymous).

---

## What you can expect from us

| Stage | Target |
|---|---|
| Acknowledgement of your report | Within **48 hours** |
| Initial assessment and severity classification | Within **5 business days** |
| Fix or mitigation for **Critical** | Within **7 days** of confirmation |
| Fix or mitigation for **High** | Within **30 days** |
| Fix or mitigation for **Medium / Low** | Next scheduled release |
| Update to you on progress | At least every **7 days** until resolved |

If we cannot meet a target, we will tell you why and when to expect the fix — silently missing a
deadline is worse than a delayed one.

---

## Scope

**In scope:**
- Authentication, session handling and account takeover paths.
- Authorization flaws, including **any** cross-tenant access to data (`*.ARCH` production domains).
- Injection, XSS, SSRF, CSRF and similar classes.
- Webhook signature verification bypass, replay, and forged-incident creation.
- Exposure of secrets, tokens, password hashes, or customer content.
- Public status page: leaking unpublished content, internal notes, or another tenant's data.

**Out of scope (report anyway if unsure — but these are known and accepted):**
- Denial of service through brute volume.
- Missing security headers or cookie flags without a demonstrated impact.
- Self-XSS, clickjacking on pages with no sensitive action.
- Reports from automated scanners without a proof of concept.
- Outdated dependency versions with no demonstrated exploitability.
- Social engineering, physical security, and issues in third-party services we merely integrate with
  (report those to the vendor — though we'd appreciate a heads-up).
- Findings that require a compromised device or an already-compromised account.

---

## Our commitments

1. **We will not pursue legal action** against researchers who act in good faith, follow this policy,
   and avoid privacy violations, data destruction and service disruption.
2. **We will treat your report as confidential** and share it only with those who need to know.
3. **We will tell you the truth** about what we found, including when the issue is a duplicate, a
   known limitation, or out of scope.
4. **We will credit you** in the fix's changelog entry and on our security acknowledgements page, at
   your preference, unless you ask to stay anonymous.
5. **We will fix the system, not just the symptom** — including adding a regression test that would
   have caught the issue.

**We do not currently operate a paid bug-bounty programme.** We do not want to imply a reward we cannot
commit to, and we would rather be honest about that than waste a researcher's time. We will publicly
thank you, and for significant findings we will discuss recognition or a discretionary reward on a
case-by-case basis.

---

## Disclosure policy

We follow **coordinated disclosure**:

1. You report privately and give us a reasonable window to fix (typically 90 days, or 7 days for
   Critical).
2. We confirm the issue, develop and ship a fix, and verify it.
3. We agree on a publication date with you. We will never pressure you to stay silent beyond the
   window, and if we are slow, we will say so publicly rather than blaming the reporter.
4. We publish a security advisory with a technical summary, impact, timeline and remediation.

If we conclude a report is not a vulnerability, we will explain why with technical reasoning, and we
welcome being shown where that reasoning is wrong.

---

## What we already do (so you don't have to test it)

Summarised here; full detail in
[`docs/engineering/SECURITY-AND-COMPLIANCE.md`](docs/engineering/SECURITY-AND-COMPLIANCE.md):

- Role-based authorization enforced server-side on every mutation; roles read from the database, never
  from client input.
- Every tenant-owned query scoped by `organizationId` at the repository layer; foreign resources
  return 404 so existence is never disclosed.
- HMAC verification of inbound webhooks **before** payload parsing; only secret **hashes** stored;
  stale timestamps rejected; idempotent handling of duplicate deliveries.
- Zod validation on all external input; TypeScript strict; parameterised queries only.
- Passwords hashed with a strong adaptive algorithm; secrets only in environment variables; nothing
  sensitive logged or returned.
- Immutable audit log of every mutation, written in the same transaction as the change.
- Rate limiting on authentication and webhook endpoints; encryption in transit and at rest.

**Known gaps we disclose rather than hide:** no SOC 2 or ISO 27001 certification, no HIPAA support,
no TOTP two-factor authentication until v1.2, and no self-hosted deployment option in v1.

---

## Security-related documents

| Document | Contents |
|---|---|
| [`docs/engineering/SECURITY-AND-COMPLIANCE.md`](docs/engineering/SECURITY-AND-COMPLIANCE.md) | Controls, threat model, compliance posture, subprocessors |
| [`docs/legal/DATA-PROCESSING-ADDENDUM.md`](docs/legal/DATA-PROCESSING-ADDENDUM.md) | Processor terms, breach notification, technical measures |
| [`docs/legal/PRIVACY-POLICY.md`](docs/legal/PRIVACY-POLICY.md) | Personal data handling and rights |
| [`docs/engineering/OPERATIONS-RUNBOOK.md`](docs/engineering/OPERATIONS-RUNBOOK.md) | Backup, restore, rollback, our own incident process |

---

*Owner: Engineering · Review cadence: 90 days, or after any security incident*
