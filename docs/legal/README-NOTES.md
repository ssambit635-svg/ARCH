# Legal documents — how to use these files

## ⚠️ Read this first

**These are professionally structured templates, not legal advice, and not yet a valid contract.**

They were written to be accurate, honest and complete enough to start from — the structure, the
clauses that actually matter (liability caps, data protection roles, SLA credits, termination and data
portability) and the tone are all deliberate. But:

1. **They contain placeholders** that must be replaced with real details.
2. **They must be reviewed by qualified legal counsel** in every jurisdiction you sell into — India
   first, then the EU/UK if you take customers there.
3. **They do not create a lawyer–client relationship**, and no warranty of legal sufficiency is given.
4. **Once published to customers, a court may hold you to them.** Never publish a claim here that the
   product does not actually deliver — for example, an SLA figure you do not measure, a certification
   you do not hold, or a subprocessor list that is out of date.

Cost of doing this properly: a few hours of a lawyer's time, once. Cost of skipping it: discovered at
the worst possible moment, usually during a customer dispute or a security review.

---

## 1. Placeholders checklist

Replace every bracketed value before publishing. Search the folder for `[` and work through the list:

| Placeholder | Meaning | Where used |
|---|---|---|
| `[LEGAL ENTITY NAME]` | Registered company name (e.g. "Example Technologies Private Limited") | All documents |
| `[REGISTERED ADDRESS]`, `[CITY]`, `[STATE]` | Registered office, and the city whose courts get jurisdiction | All documents |
| `[DOMAIN]` | Primary domain (e.g. `arch.example`) | Privacy, Cookies, SLA |
| `[PRIMARY REGION]` | Where customer data is stored | Privacy, DPA, SLA |
| `[PRIVACY EMAIL]`, `[SUPPORT EMAIL]`, `[BILLING EMAIL]`, `[LEGAL EMAIL]`, `[SECURITY EMAIL]`, `[ABUSE EMAIL]` | Monitored inboxes — **create these mailboxes, don't just write them down** | All documents |
| `[DPO NAME / DESIGNATION]`, `[DPO EMAIL]` | Grievance officer / data protection contact (required under India's DPDP Act for a readily available grievance mechanism) | Privacy, Cookies |
| `[DD MONTH YYYY]` | Effective and "last updated" dates | All documents |
| `[PRICING URL]`, `[STATUS URL]` | Live links | Terms, SLA |
| `[HOSTING PROVIDER]`, `[MANAGED POSTGRES PROVIDER]`, `[EMAIL PROVIDER]`, `[ERROR TRACKING PROVIDER]`, `[LOGGING / METRICS PROVIDER]`, `[PAYMENT PROVIDER]`, `[OAUTH PROVIDER]`, `[ANALYTICS COOKIE]` | Real subprocessors and cookies — must match what the product actually uses | Privacy, Cookies, DPA Annex 3 |
| Retention and threshold numbers `[30]`, `[12]`, `[90]`, `[8]` years, etc. | Choose numbers you can actually honour, then automate them | Privacy, Terms, DPA |

**Consistency rule:** a number that appears in two documents must match. Retention windows appear in
the Privacy Policy, the DPA, and the SLA — change one, change all three.

---

## 2. Before you publish (launch gate)

- [ ] All placeholders replaced; run a search for `[` to confirm none remain.
- [ ] Counsel has reviewed the Terms, Privacy Policy and DPA.
- [ ] The subprocessor list matches reality (check provider dashboards, not memory).
- [ ] The cookie table matches the cookies the shipped product actually sets (open devtools and verify).
- [ ] The SLA figures match what your monitoring measures — and you can produce the numbers.
- [ ] Security posture statements match `engineering/SECURITY-AND-COMPLIANCE.md` (no implied
      certifications).
- [ ] Data export and deletion actually work in the product (they are promised here).
- [ ] Every contact email is a live, monitored mailbox with a stated response target.
- [ ] Documents are published at stable URLs and linked from the marketing footer, signup page and
      dashboard settings.
- [ ] Version and effective date are visible on each published page.
- [ ] You accept that a customer's lawyer will read these in full. Which is the point.

---

## 3. Review cadence

| Document | Review | Trigger for immediate review |
|---|---|---|
| Terms of Service | 90 days | New feature affecting pricing, liability or content |
| Privacy Policy | 90 days | New data category, new subprocessor, new region |
| DPA | 90 days | New subprocessor, new region, regulatory change |
| SLA | 90 days | Any S1 incident, or a change to monitoring |
| Cookie Policy | 90 days | Any change to cookies or analytics |
| Acceptable Use Policy | 90 days | New abuse pattern observed |

---

## 4. Document map

| File | Audience | Purpose |
|---|---|---|
| `PRIVACY-POLICY.md` | Customers, data subjects | What personal data we collect, why, and their rights |
| `TERMS-OF-SERVICE.md` | Customers | The contract: accounts, fees, liability, termination |
| `DATA-PROCESSING-ADDENDUM.md` | Customer legal/security teams | Controller–processor terms, subprocessors, breach handling |
| `SERVICE-LEVEL-AGREEMENT.md` | Paying customers | Uptime commitments, support targets, credits |
| `COOKIE-POLICY.md` | Website visitors | Cookies used and how to control them |
| `ACCEPTABLE-USE-POLICY.md` | All users | What may and may not be done with the Service |

Related, non-legal documents: [`../engineering/SECURITY-AND-COMPLIANCE.md`](../engineering/SECURITY-AND-COMPLIANCE.md)
(security posture), [`../../SECURITY.md`](../../SECURITY.md) (vulnerability disclosure),
[`../support/SUPPORT-POLICY.md`](../support/SUPPORT-POLICY.md) (support tiers in plain language).

---

## 5. A note on honesty

Three rules that matter more than any clause:

1. **Never claim a certification you don't have.** "We follow these practices" beats "SOC 2 compliant
   (in progress)" every time — the second one is a lie a reviewer will catch.
2. **Never promise an SLA you can't measure.** If monitoring doesn't produce the number, the number
   doesn't exist.
3. **Never let a legal document contradict the product.** If the Terms say data is exportable, export
   must work. The document is a promise; the code is whether you keep it.

---

*Owner: Founders (with counsel) · Review cadence: 90 days*
