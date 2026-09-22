# ARCH — Pricing

**Version:** 0.3 (working hypothesis) · **Owner:** Founders · **Last reviewed:** 2026-09-23
**Status:** Not yet validated with paying customers. Treat every number here as a hypothesis to test.

---

## 1. Pricing principles

1. **Never punish on-call rotation.** Seat limits apply to *members who log in*, not to how many
   people share a phone. Charging per human is what makes teams avoid adding responders.
2. **Charge for what a company runs, not for how often it breaks.** Monitored services and seats are
   the axes — not incident volume. Metring incidents punishes the customer for having a bad month.
3. **The free tier must be genuinely usable**, because incident tooling is only valuable when the
   whole team is in it.
4. **No credit-card wall for a trial.** A 14-day full-feature trial without a card.
5. **One public price list.** Enterprise gets volume and procurement handling, not secret discounting.
6. **Upgrade triggers must be obvious** — the customer should hit a limit and understand exactly why.

---

## 2. Plans

Prices shown per organization, per month. **INR is the primary market price; USD is indicative.**

| | **Free** | **Starter** | **Growth** | **Scale** | **Enterprise** |
|---|---|---|---|---|---|
| **Price (monthly)** | ₹0 | ₹1,499 (~$19) | ₹4,999 (~$59) | ₹12,999 (~$149) | Custom |
| **Price (annual, per month)** | — | ₹1,249 | ₹4,166 | ₹10,833 | Custom |
| **Best for** | Side projects, first try | 2–10 engineer teams | 10–50 engineer teams | 50–200 engineers | Regulated / large orgs |
| **Seats (login members)** | 3 | 10 | 25 | 100 | Unlimited |
| **Monitored services** | 5 | 25 | 100 | 500 | Unlimited |
| **Projects** | 1 | 3 | 10 | Unlimited | Unlimited |
| **Status pages** | 1 | 2 | 5 | Unlimited | Unlimited |
| **Incident history retention** | 30 days | 12 months | 24 months | 36 months | Custom |
| **Audit log retention** | 30 days | 12 months | 24 months | 36 months | Custom |
| **Webhook endpoints** | 1 | 5 | 25 | Unlimited | Unlimited |
| **Email notifications** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Slack notifications** *(v1.1)* | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Custom domain on status page** *(v1.2)* | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Status page branding** *(v1.2)* | ARCH logo | ARCH logo | Logo + accent | Full theming | Full + custom CSS |
| **Public API access** *(v1.2)* | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Audit CSV export** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Two-factor auth** *(v1.2)* | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Support** | Community | Email, 2 business days | Email, 1 business day | Priority, 8 business hours | Named contact + SLA |
| **Uptime SLA** | ✗ | ✗ | 99.9% | 99.9% | 99.95% + DPA |
| **SSO / SAML** *(v2)* | ❌ | ❌ | ❌ | Add-on | ✅ |

### Overage behaviour

| Limit exceeded | What happens |
|---|---|
| Seats | Prompt to upgrade; existing members keep working, new invites blocked until resolved |
| Monitored services | Extra services allowed at ₹99 (~$1.20) per service per month, visible before confirming |
| Retention window | Older data is **not deleted** on downgrade — it becomes read-only for 30 days, then follows the plan |

Nothing is ever deleted mid-incident. A downgrade never removes access to an open incident.

---

## 3. Add-ons

| Add-on | Price | Notes |
|---|---|---|
| Extra seats (Growth/Scale) | ₹149 (~$1.80) per seat/month | Above the plan's included seats |
| Extra services | ₹99 (~$1.20) per service/month | Beyond plan allowance |
| SMS / phone escalation *(v1.3)* | ₹8 (~$0.10) per SMS | Pass-through cost + margin; opt-in |
| Extended retention (Scale) | ₹1,999/month per +12 months | For regulated customers |
| Onboarding & migration (one-time) | ₹24,999 (~$299) | Import from incumbent tool, runbook setup |
| On-premise licence *(v2, gated)* | Custom, from ₹5,00,000/year | Only if the v2 trigger is met |

---

## 4. Discounts & special programs

| Program | Discount | Terms |
|---|---|---|
| Annual billing | ~2 months free (≈17%) | Paid upfront |
| Early adopters (first 25 orgs) | 40% for 12 months | In exchange for feedback + a logo/case study |
| Startups (< 2 years, < $1M raised) | 50% for 12 months | Verified |
| Open source / non-profit / education | 100% on Starter | Public repo or registration proof |
| Volume (100+ seats) | Negotiated | Sales-assisted |

---

## 5. Upgrade triggers (the *why* behind each limit)

The limits are chosen so a team hits them at the moment ARCH is clearly earning money for them.

| Plan | Most likely trigger to move up | Why it's fair |
|---|---|---|
| Free → Starter | 4th teammate asks for access, or 6th service added | The whole team joining is exactly when value appears |
| Starter → Growth | Team passes 10 people, or Slack notifications + custom domain wanted | Both are "we now communicate with customers externally" signals |
| Growth → Scale | 25+ seats, 100+ services, or an auditor asks for longer retention | Compliance and scale, not polish |
| Scale → Enterprise | SSO, DPA, custom retention, or procurement needs an MSA | Enterprise features, engineering-grade support |

---

## 6. Cost model & unit economics (the sanity check)

Assumed at **100 paying organizations**, blended ARPA **₹3,000/month**:

| Item | Monthly estimate |
|---|---|
| Revenue (100 orgs × ₹3,000) | **₹3,00,000** |
| Managed Postgres (HA, backed up) | ₹8,000 |
| Application hosting (1–2 instance deployable) | ₹6,000 |
| Email provider (transactional) | ₹2,500 |
| Error tracking, logging, uptime monitoring | ₹3,000 |
| Object storage (exports, attachments) | ₹1,000 |
| Domain, TLS, misc. | ₹500 |
| **Total infrastructure** | **≈ ₹21,000 (7% of revenue)** |

Result: comfortably inside the target of infrastructure < 15% of revenue at 100 orgs
(goal G5 in the PRD). The model stays true while a single deployable serves all tenants.

**Two cost cliffs to watch:**
1. **Email volume** — a chatty incident can email many people many times. Mitigation: event
   selection and batching, not per-keystroke mail.
2. **Long retention** — 36-month audit logs on thousands of incidents. Mitigation: retention is a
   paid axis, and old partitions are cheap storage, not hot rows.

---

## 7. Price positioning against the market (verified Sept 2026)

The category prices **per user**, which means a team of 20 pays for 20 seats whether or not 20 people
are on call. Public list prices at the time of writing:

| Tool | List price | Format | Cost for a 20-person team / month |
|---|---|---|---|
| PagerDuty | $21–41 per user/mo; status pages from $89 per 1,000 subscribers; AIOps from $699/mo | Per user + add-ons | ~$420–820 + add-ons |
| incident.io | $15–25 per user/mo, on-call +$10–20 per user | Per user + add-on | ~$500–620 |
| Rootly | ~$20 per user/mo **per product** (IR and On-Call sold separately) | Per user × 2 | ~$600–800 |
| FireHydrant | ~$25 per responder/mo | Per responder | ~$500 |
| Better Stack | ~$29–34 per responder/mo + $9 for advanced Slack workflows | Per responder | ~$580–760 |
| Squadcast / Zenduty / others | $6–25 per user/mo | Per user | ~$120–400 |
| **ARCH Growth** | **₹4,999 (~$59) per organization/mo, 25 seats included** | **Per organization** | **~$59** |

That comparison is the strategy: **ARCH prices the organization, not the headcount.** The customer
who feels this most is the 15–50 engineer team that wants everyone in the tool during an incident but
refuses to pay for seats that sit idle 350 days a year.

**This also means we are leaving money on the table**, deliberately, while we earn trust. Revisit
upward once we have (a) 25 paying customers, (b) measurable time-to-resolve improvements we can quote,
and (c) a feature set where the value is obvious — see §8, questions 1 and 3.

*Sources: vendor pricing pages and third-party comparisons, September 2026. Pricing changes often —
re-verify before any published comparison.*

---

## 8. What we deliberately don't do

- **No per-incident pricing.** It punishes customers for outages, which destroys trust instantly.
- **No per-responder pricing during an incident.** Someone helping at 3 a.m. never gets blocked.
- **No hidden "contact us" for basic limits.** Only Enterprise is quote-based, and the reasons are
  listed in the table above.
- **No payments inside the product in v1.** Invoicing and card handling are outsourced; ARCH's own
  engineers do not touch card data.

---

## 9. Open questions to test

1. Is ₹1,499 the right Starter price in India, or should it be ₹999 to reduce the "let's just use a
   spreadsheet" objection? *(Test with the first 20 conversations.)*
2. Do customers prefer 2 projects on Free (more generous) or 1 project (stronger upgrade pressure)?
3. Would a **pay-what-you-use** tier for solo developers help adoption without cannibalising paid?
4. Is custom domain a Growth feature or a Scale feature? *(Current: Growth — it's the first thing
   customer-facing teams ask for.)*
5. Should the Free tier ever expire? *(Current: no. Free is the top of funnel, not a trial.)*

---

## 10. Change log for this document

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-20 | First draft: two plans, seat-based |
| 0.2 | 2026-09-22 | Added Free tier and service limits; removed per-incident metering |
| 0.3 | 2026-09-23 | Added add-ons, discounts, cost model, upgrade triggers |

---

*Owner: Founders · Review cadence: 30 days until first 10 paying customers, then quarterly*
