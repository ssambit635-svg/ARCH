# ARCH — Go-to-market plan

**Version:** 1.0 · **Owner:** Founders · **Last reviewed:** 2026-09-23
**Goal:** 25 paying organizations and a repeatable acquisition motion within 6 months of launch.

---

## 1. Positioning

> **ARCH is where your team goes when your application breaks.**
> Incident response and a public status page, priced per organization — not per seat.

**The one-sentence pitch:**
"Incumbent incident tools charge you per engineer, so teams keep people out of the tool; ARCH includes
25 seats for the price most tools charge for two, so everyone who needs to help actually can."

**Who it is for:** engineering teams of 5–50 who run real customer-facing software, have some
monitoring already, and handle incidents in a Slack thread plus heroism.

**Who it is not for (say this out loud, it builds trust):** 500-engineer platform orgs with dedicated
SRE functions and procurement departments; teams that want AI to fix things for them; anyone needing
PHI, card data, or a SOC 2 report today.

---

## 2. Beachhead segments (in priority order)

| # | Segment | Why them first | Where they are | Entry message |
|---|---|---|---|---|
| **1** | **Opsgenie refugees** | Atlassian is moving Opsgenie users to Jira Service Management by April 2027; thousands of teams must re-evaluate a tool they already pay for | Atlassian community forums, engineering Slack/Discord groups, migration threads | "Migrating off Opsgenie? Here's a status page + incident workflow that takes an afternoon, not a quarter." |
| **2** | **Indian SaaS & product startups (10–50 engineers)** | Underserved by USD per-seat pricing; local billing in INR; we can be in the same timezone for support | Bengaluru/Pune/Hyderabad/Gurugram networks, NASSCOM/ SaaS communities, founder WhatsApp groups | "For the price of two seats elsewhere, your whole team gets incident response and a status page." |
| **3** | **Small product teams with a customer-facing SLA** | They already owe customers uptime communication; a status page is an obvious, immediate need | Support-lead and founder communities, Reddit r/devops, Indie Hackers | "Your customers ask 'is it down?' — answer it once, on a page, instead of in 40 emails." |
| **4** | **Agencies managing multiple client apps** | One org, many projects — our per-org pricing is a structural advantage | Digital agency networks, freelance-dev communities | "All your client status pages in one place, one price." |

**Deliberately not pursued yet:** enterprises, regulated industries, teams under 3 engineers with no
customers (they have nothing to communicate).

---

## 3. Channel plan

| Channel | Tactic | Effort | Expected contribution (month 6) |
|---|---|---|---|
| **Content / SEO** | Comparison and migration pages: "ARCH vs PagerDuty", "Opsgenie migration guide", "status page setup in 20 minutes", "incident post-mortem template" | High, compounding | 40% of qualified signups |
| **Communities** | Be genuinely useful in DevOps/startup communities; publish our own post-mortems publicly; answer Opsgenie-migration questions in detail without hard-selling | Medium, compounding | 25% |
| **Founder-led outbound** | 10 personalized emails/day to CTOs of 10–50-engineer companies; lead with their downtime, not our features | High, immediate | 20% |
| **Product-led / free tier** | Free tier is the top of funnel: 3 seats, 5 services, 1 status page. In-product upgrade prompts at the moment a limit bites | Low, compounding | 10% |
| **Launch moments** | Product Hunt, Hacker News "Show HN" (only with a genuinely interesting angle — e.g. public build-in-public numbers), Indian startup communities | Spiky | 5% |
| **Partnerships** | Agency referrers, MSPs, and complementary tool vendors (monitoring providers who don't do status pages well) | Medium | Later-stage |

**Explicitly skipped for now:** paid ads (expensive in this category, poor intent), conference
sponsorships (budget), SDR teams (no budget, and the founder's voice is the asset).

---

## 4. First 90 days after launch (the sequence)

### Days 0–14 — "Prove it works for someone who isn't us"
- Onboard 5 design-partner organizations by hand, free for 12 months in exchange for feedback.
- Watch them use it (screen share), fix every piece of friction found in the first 30 minutes of use.
- Publish the ARCH status page and the docs site.
- **Success:** time-to-first-incident under 30 minutes for a stranger, unaided.

### Days 15–45 — "Find the message that lands"
- Write and publish 4 comparison/migration pages (opsgenie, pagerduty, incident.io, statuspage).
- 10 outbound emails/day, hand-written, referencing the recipient's actual stack.
- 2 public build-in-public posts (what we shipped, what broke, what we learned).
- **Success:** 20 signups, 5 organizations with a real incident run in the product.

### Days 46–90 — "Turn usage into revenue"
- Turn on paid plans; convert design partners at the early-adopter discount.
- Publish 2 case studies with real numbers (time-to-acknowledge, incidents handled).
- Launch on Product Hunt + HN once there is a story worth telling.
- Hire nothing. Small teams with high prices beat big teams with low prices.
- **Success:** 10 paying organizations, ₹40,000+ MRR, 2 case studies.

---

## 5. Proof assets we need (build these before outbound scales)

| Asset | Why | Status |
|---|---|---|
| Public ARCH status page | Demonstrates the product and dogfoods it | At launch |
| Comparison pages (4) | High-intent search traffic | Post-launch week 1 |
| Opsgenie migration guide | Time-limited but enormous opportunity | Post-launch week 2 |
| Live demo org (read-only, populated with realistic data) | "Try it without signing up" converts | Post-launch |
| 2 customer case studies with numbers | The only marketing that convinces an engineer | Day 60–90 |
| Public post-mortems of our own incidents | The strongest possible credibility in this category | After our first incident |
| Pricing calculator (team size → cost vs incumbents) | Makes the per-org advantage undeniable | Post-launch |

---

## 6. Sales motion

**Self-serve first.** Card, instant access, no demo required. Most of our target buyers will decide in
a browser tab, and gating that behind a call loses them.

**Human-assisted when the motion says so** — a defined set of triggers, checked weekly:

| Trigger | Action |
|---|---|
| Org reaches 8+ seats on Free | Founder email: offer a walkthrough, apply early-adopter discount |
| No incident created in first 7 days | Helpful check-in: "want help wiring the first webhook?" — not a pitch |
| 3+ projects created on Starter | Flag for Growth conversation when Slack/custom-domain is released |
| Any organization asking about SSO/DPA | Route to founders directly; these are enterprise signals |
| Organization goes quiet for 30 days | Churn-risk call: what broke in the workflow? |

**No discounts without a reason.** Discount list lives in `product/PRICING.md` §4. "Can we get a deal?"
is answered with the published annual price, not a negotiation.

---

## 7. Launch checklist

- [ ] Landing page states the problem, the wedge, and the price in the first screen
- [ ] Free tier usable without a credit card; 14-day full trial available
- [ ] Interactive demo org available without signup
- [ ] Six legal documents published with real entity details
- [ ] Docs site live: onboarding, FAQ, status page setup, webhook setup, comparison pages
- [ ] Support inbox monitored with a published response target
- [ ] ARCH's own status page published and linked from the marketing footer
- [ ] Analytics live (org-level, no personal tracking) matching `METRICS.md` event names
- [ ] Changelog started; first entry written before the launch post
- [ ] 5 design partners onboarded and using it weekly
- [ ] Backup/restore rehearsed; rollback rehearsed; on-call rota named
- [ ] Answers prepared for the three hard questions: *"why not PagerDuty?"*, *"are you SOC 2?"*,
      *"what happens if you shut down?"* (answer: documented export, no lock-in, source-of-truth
      export in open formats)

---

## 8. Metrics this plan is judged by

From `product/METRICS.md`: signup→org rate, time-to-first-incident, orgs publishing a status page,
weekly active responding organizations, trial→paid conversion, logo retention, infra as % of revenue.

**The one number to watch weekly in the first 6 months:** organizations that ran at least one incident
this week. Everything else is downstream of that.

---

## 9. Risks to the plan

| Risk | Mitigation |
|---|---|
| Incumbents have generous free tiers | We compete on the *team-wide* model and the audit trail, not on beating them at free |
| Opsgenie migration window closes (April 2027) | Treat it as a 12-month tailwind, not the whole strategy; the segment list is priority-ordered for a reason |
| Content takes months to rank | Start now; outbound pays the bills while content compounds |
| Solo/small founding team bandwidth | One channel at a time, done properly; skip the rest |
| Churn after the first incident-free month | Activation metric is incidents run, not signups; push webhook setup in onboarding |
| Being undercut by a cheaper clone | Our moat is trust and process depth (audit trail, isolation, honest docs) — hard to clone quickly and invisible in a feature list |

---

*Owner: Founders · Review cadence: 30 days for the first 6 months, then quarterly*
