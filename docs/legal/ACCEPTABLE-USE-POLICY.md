> ⚠️ **TEMPLATE — NOT LEGAL ADVICE.** Replace every `[PLACEHOLDER]` and have counsel review before
> publishing.

---

# Acceptable Use Policy (AUP)

**Effective date:** [DD MONTH YYYY] · **Version:** 1.0

This Acceptable Use Policy forms part of the [Terms of Service](TERMS-OF-SERVICE.md) and applies to
every user of the ARCH Platform. "**You**" means the Customer organization and each of its Members.

The purpose of this policy is simple: ARCH is a tool for coordinating and communicating during
technical incidents. Use it for that, and you will never have a problem with this document.

---

## 1. Do not use ARCH to store or publish

1. **Prohibited data.** Do not put the following into ARCH — including in incident titles,
   descriptions, timeline comments, attachments, service names, or status page text:
   - card numbers, CVV, or full payment credentials;
   - patient health information, medical records, or other special-category personal data;
   - government-classified or export-controlled information;
   - biometric or genetic data;
   - passwords, private keys, API tokens, or production secrets
     *(use a secret manager; if one is pasted in error, rotate it immediately and delete the entry)*;
   - personal data of individuals who have not been informed it will be processed by a third-party
     tool, where the law requires that notice.
2. **Illegal content.** No content that infringes intellectual property, defames, harasses, threatens,
   or violates any applicable law (including India's IT Act and rules thereunder, and laws on
   obscenity, hate speech, and child sexual abuse material).
3. **Malicious content.** No malware, ransomware, phishing pages, or links distributed for the purpose
   of harming others.
4. **Misleading emergency content.** Do not use a public status page to impersonate another
   organization, publish knowingly false outage claims about another company, or conduct scams.

**If you must reference sensitive material in an incident, reference it — don't paste it.**
Write "credentials rotated, see vault entry INC-4021", not the credential itself.

---

## 2. Do not abuse the Service

1. **No security probing without authorisation.** Do not attempt to access accounts, data, or systems
   that are not yours; do not probe, scan, or test the vulnerability of the Service except through the
   coordinated disclosure process in [SECURITY.md](../../SECURITY.md). Good-faith research under that
   policy is explicitly welcome.
2. **No overloading.** Do not run automated load tests against production, or generate traffic or
   webhook volume intended to degrade the Service for others. (Want to load-test? Ask us first —
   [SUPPORT EMAIL].)
3. **No rate-limit circumvention.** Do not evade, disable, or work around rate limits, quotas, plan
   limits, or access controls.
4. **No scraping or resale.** Do not resell, sublicense, or provide the Service to third parties as a
   service bureau without our written agreement.
5. **No reverse engineering** of the Service except where permitted by law.
6. **No shared or automated accounts.** Do not create accounts to bypass seat or plan limits, and do
   not automate interactions that a real user would not perform.
7. **No spam.** Do not use notifications, invitations, or status page subscriptions to send
   unsolicited messages.
8. **No misrepresenting ARCH.** Do not state or imply that ARCH endorses your organization, certifies
   your compliance, or guarantees your uptime.

---

## 3. Fair use of shared infrastructure

ARCH is multi-tenant: many organizations share the same infrastructure. To keep it fast for everyone:

| Resource | Reasonable expectation |
|---|---|
| Webhook ingestion | Up to **[500] events/hour per organization** (higher limits available on request) |
| Notification sends | Up to **[2,000] emails/day per organization** |
| Public status page requests | Cached and effectively unlimited for human traffic; automated polling above **[1] request/minute** may be throttled |
| API/UI requests | Normal interactive use; sustained automated access requires our written agreement |
| Storage | Within your plan's retention window; exports are provided, not archived indefinitely |

We will always contact you before throttling, except where an immediate risk to other tenants requires
action — in which case we will tell you immediately afterwards.

---

## 4. Public status pages

Publishing makes content visible to anyone with the link. Before publishing:

1. Verify no personal data, customer names, or internal system details appear in public-facing text.
2. Keep internal notes internal — ARCH provides an internal/public visibility control for this reason.
3. Do not publish content that would mislead customers about the nature, scope or duration of an
   incident.

You are responsible for what your status page says. ARCH provides the mechanism; the message is yours.

---

## 5. Enforcement

We prefer a conversation to a suspension. Where we must act, we escalate in proportion to the harm:

| Stage | Action |
|---|---|
| 1 | **Notice** — we contact the Organization OWNER, explain the concern, and ask for a fix within a reasonable period |
| 2 | **Throttle or restrict** the specific offending functionality |
| 3 | **Suspend** the account (content preserved) pending resolution |
| 4 | **Terminate** the subscription for serious or repeated violations, or where legally required |

**Immediate suspension without notice** may occur where: there is a security risk to other tenants;
illegal content is involved; or continued operation would cause harm or legal exposure to ARCH or
third parties. In such cases we will notify you as soon as we lawfully can and will restore access
promptly once the issue is resolved.

We will not monitor the content your organization stores in ARCH as a matter of routine. We act on
reports, on signs of abuse in operational data (volume, error patterns), and where legally required.

---

## 6. Reporting abuse

Report abuse, illegal content, or security concerns to **[ABUSE EMAIL]** (or [SECURITY EMAIL] for
security matters). Include the organization slug or URL, what you observed, and when. We acknowledge
reports within **2 business days** and act on credible reports.

If you believe a status page is impersonating your organization, contact [ABUSE EMAIL] — we prioritise
these and will investigate immediately.

---

## 7. Cooperation with law enforcement

We comply with lawful legal process and may disclose information where required by law, as described
in the [Privacy Policy](PRIVACY-POLICY.md) §4. Where not legally prohibited, we will notify the
affected Organization OWNER before disclosure unless doing so would compromise an investigation.

---

## 8. Consequences for the Customer

Violations by a Member are treated as violations by the Customer. The Customer is responsible for
making its Members aware of this policy and for their compliance. Termination for a serious AUP
violation does not entitle the Customer to a refund, except where required by law.

---

## 9. Changes

We may update this policy, and will notify Organization OWNERS of material changes at least **14 days**
before they take effect. Continued use after the effective date means acceptance.

---

## 10. Contact

| Purpose | Contact |
|---|---|
| Abuse reports | [ABUSE EMAIL] |
| Security research | [SECURITY EMAIL] |
| Legal notices | [LEGAL EMAIL] |
| General support | [SUPPORT EMAIL] |

---

*Owner: Founders (with counsel) · Review cadence: 90 days*
