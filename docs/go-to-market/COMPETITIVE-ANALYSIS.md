# ARCH — Competitive analysis

**Version:** 1.0 · **Owner:** Founders · **Last reviewed:** 2026-09-23
**Ground rule:** every claim below is about a *published, verifiable* fact (price, packaging, format).
Opinions are labelled as opinions. No competitor is misrepresented — engineers check, and being
caught shading a comparison costs more than the deal it wins.

> **Re-verify all pricing before publishing anything externally.** Vendor pricing changes frequently;
> this document is a working reference, not a brochure.

---

## 1. The category in one paragraph

Incident management has three layers that are usually sold separately: **detection** (monitoring and
alerting), **response** (who is on call, who does what, the timeline), and **communication** (the
public status page). The category's dominant pricing model is **per user, per month**, with
notable features (on-call, AI, status pages) frequently charged as **add-ons on top of the seat
price**. This is why a 20-engineer team commonly lands between $400 and $800 per month before
add-ons — for a tool that is needed intensely for maybe ten hours a month.

---

## 2. Competitor map

```
                     MORE ENTERPRISE / HIGHER TCO
                                  ▲
      PagerDuty ●                 │
      ServiceNow ●  xMatters ●    │        ● Atlassian Statuspage
      BigPanda ●                    │        ● Jira Service Management
                                  │
  FEATURE-DEEP ◀──────────────────┼──────────────────▶ FOCUSED / SIMPLE
      Rootly ●   FireHydrant ●    │   ● Better Stack
      incident.io ●               │   ● UptimeRobot  ● Instatus
                                  │   ● OneUptime (OSS)
                                  │   ● ARCH  ◀ (org-priced, response + status)
                                  ▼
                     SIMPLER / LOWER TCO
```

---

## 3. Head-to-head (verified September 2026)

| Competitor | Format | Why teams choose them | Where ARCH differs |
|---|---|---|---|
| **PagerDuty** | $21–41 per user/mo; status pages from $89 per 1,000 subscribers; AIOps from $699/mo | Deepest integration catalogue, hardened paging, enterprise trust | ARCH is per organization, includes the status page, and is deliberately narrower. We do not claim better paging |
| **incident.io** | $15–25 per user/mo + on-call add-on ($10–20 per user) | Slack-native workflow, opinionated defaults, strong retrospectives | ARCH does not require Slack; per-org pricing; audit trail as a first-class feature |
| **Rootly** | ~$20 per user/mo **per product** (IR and On-Call separate) | Customisable workflow modelling, strong API | Simpler workflow, one line on the invoice instead of two |
| **FireHydrant** | ~$25 per responder/mo; free tier for small teams | Service catalogue, runbook automation, retrospectives | ARCH has no service catalogue depth; we win on price and time-to-value |
| **Better Stack** | ~$29–34 per responder/mo (+$9 advanced Slack) | Monitoring, on-call and status page from one vendor | ARCH does not do monitoring. If you already have Datadog/Grafana/CloudWatch, you don't need their monitoring layer — and shouldn't pay for it |
| **Atlassian Statuspage** | Per-subscriber pricing, separate from incident response | The status page standard; integrates with Jira | ARCH bundles response + status, so you're not paying for a status page subscription and an incident tool |
| **Opsgenie → JSM** | Forced migration by April 2027 | Existing Atlassian customers | Migration window is our single biggest near-term acquisition opportunity |
| **Squadcast / Zenduty / Spike.sh** | $6–25 per user/mo | Cheapest per-seat entry, on-call bundled | Similar niche; ARCH differentiates on per-org pricing, audit trail, and public communication quality |
| **Grafana Cloud IRM / OneUptime (OSS)** | Platform fee + per active user; or self-host free | Ecosystem lock-in or self-hosting | For teams who want zero-vendor-risk, self-hosting wins and we don't pretend otherwise (on-prem is a gated v2 item) |

---

## 4. Where ARCH genuinely wins

1. **Pricing format.** Per organization, not per seat. A 25-engineer team pays ~$59/month here versus
   roughly $400–800 elsewhere. This is the single easiest thing to explain and check.
2. **Everyone can be in the tool.** Because seats are not the constraint, teams stop keeping people
   out of incident response — which is exactly who you want helping at 2 a.m.
3. **Status page included, not an add-on.** Communication is part of the response, not a separate SKU.
4. **Audit trail as a first-class feature.** Every mutation recorded, immutable, exportable — useful
   for post-mortems, customer disputes, and lightweight compliance conversations.
5. **Honest documentation.** Our security posture states plainly what we do *not* hold (SOC 2, HIPAA).
   Engineers and reviewers trust that more than a badge wall.
6. **Speed to value.** A team can be fully operational in an afternoon because the product does fewer
   things deliberately.

## 5. Where ARCH genuinely loses (know this before a sales call)

1. **Paging depth.** No on-call schedules, escalation policies, SMS/voice in v1. If paging reliability
   is the requirement, buy PagerDuty or Better Stack.
2. **Integrations.** A handful of providers versus catalogues of hundreds.
3. **No monitoring.** We don't detect anything; you bring alerts.
4. **Certifications.** No SOC 2 / ISO 27001 / HIPAA. Enterprise procurement will stop here.
5. **No AI features.** Competitors ship AI post-mortems and root-cause hints; we deliberately don't
   (yet).
6. **Track record.** Zero production history at launch. Incumbents have years of it.
7. **Ecosystem.** No marketplace, no service catalogue, no Terraform provider.

**Use this list in sales.** A team that buys ARCH knowing its limits is a team that doesn't churn
three months later when it discovers them.

---

## 6. Positioning statements (reusable)

**Against PagerDuty:**
> "PagerDuty is the right answer if you need enterprise-grade paging. ARCH is the right answer if you
> already get paged by something else and the missing piece is coordination and communication — and
> you'd rather pay for the organization than for every engineer."

**Against incident.io / Rootly:**
> "They're excellent Slack-native tools priced per user with on-call as an add-on. ARCH is a smaller,
> opinionated product: incident workflow, timeline, status page, audit trail, one price for the whole
> team. Choose them for depth; choose us for cost and clarity."

**Against Atlassian Statuspage:**
> "Statuspage communicates. It doesn't run the incident. ARCH does both, so you're not paying twice
> and stitching two tools together during your worst hour."

**Against a spreadsheet and a Slack thread (the real competitor):**
> "You already have an incident process — it lives in a chat log nobody can search and a memory that
> fades by Friday. ARCH makes it one page, one timeline, and one link you can send a customer."

**Against 'we'll build it ourselves':**
> "You could. It's a permissions matrix, a state machine, an audit log, a cached public page, and
> webhook verification. That's the four weeks you were going to spend on your actual product."

---

## 7. Watch list & triggers

| Signal to watch | What it would mean | Our response |
|---|---|---|
| PagerDuty/incident.io introduces an org-priced tier | Our core wedge is copied | Compete on simplicity and honesty; ship the paid-tier features people actually ask for |
| Opsgenie migration deadline slips or extends | The acquisition window is longer | Keep migration content evergreen |
| A well-funded OSS competitor (e.g. OneUptime-style) gains traction | Price floor collapses to zero | Focus on hosted reliability, audit and compliance posture, and support — not on price |
| AI post-mortems become a purchase criterion | Table stakes shift | Revisit the gated v2 AI item with clean timeline data |
| Customers repeatedly ask for paging | We are being used as a PagerDuty replacement | Consider an on-call add-on rather than building a full paging product |

---

## 8. What we will never do in competitive marketing

- No invented prices or features. Link to the vendor's own page.
- No FUD about a competitor's funding, roadmap or stability.
- No "we're better at everything" claims. The losses list in §5 exists so we don't.
- No publishing a comparison without re-checking it that week.
- If a prospect is genuinely better served by a competitor, say so. That conversation creates more
  referrals than a won deal creates revenue.

---

*Owner: Founders · Review cadence: 90 days, or whenever a competitor's pricing changes*
