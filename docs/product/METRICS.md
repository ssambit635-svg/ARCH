# ARCH — Metrics

**Owner:** Founders · **Last reviewed:** 2026-09-23
**Purpose:** know whether ARCH is working, and be honest with ourselves when it isn't.

Principle: **one north-star metric, a small tree beneath it, and a dashboard a single person can
read in 60 seconds.** Metrics that nobody would act on get deleted.

---

## 1. North-star metric

> **Weekly Active Responding Organizations (WARO):**
> organizations where at least one incident was created **or** updated by a member, and whose status
> page was published, in the last 7 days.

Why this one: it requires the three things that make ARCH valuable to be true at the same time —
people are running incidents *in* the tool, they are collaborating on them, and they are
communicating outward. Signups and seats can both be gamed; this cannot.

*Target: 60% of paying organizations active on this metric by month 6 post-launch.*

---

## 2. The metric tree

```
                        WARO  (north star)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ACQUISITION           ACTIVATION            RETENTION
   new orgs/week         time-to-first-        logo + revenue
   signup→org %          incident,             retention, seat
                         status page           expansion
        │                     │                     │
        └─────────────┬───────┴──────────┬──────────┘
                      │                  │
                 ENGAGEMENT           RELIABILITY
                 incidents/org/mo      status page uptime,
                 timeline entries      notification success
                 per incident          rate, p95 latency
                      │
                 QUALITY/TRUST
                 cross-tenant leaks = 0,
                 audit coverage = 100%
```

---

## 3. Metric definitions

### Acquisition
| Metric | Definition | Target (month 6) |
|---|---|---|
| Signups / week | New verified accounts | 40 |
| Signup → organization created | % of signups that create an org within 24 h | ≥ 70% |
| Org → first incident | % of new orgs creating an incident within 7 days | ≥ 60% |
| Org → published status page | % of new orgs publishing within 14 days | ≥ 40% |
| Trial → paid conversion | % of trials becoming paying within 30 days | ≥ 15% (self-serve) |

### Activation
| Metric | Definition | Target |
|---|---|---|
| **Time-to-first-incident** | Median minutes from org creation to first incident | **< 60 minutes** |
| Onboarding completion | % completing the 6-step checklist (`CUSTOMER-ONBOARDING.md`) | ≥ 50% |
| Webhook connected | % of orgs with ≥ 1 active webhook endpoint | ≥ 35% |
| Invite rate | % of orgs that invite a second member | ≥ 75% |

### Engagement
| Metric | Definition | Target |
|---|---|---|
| Incidents per active org / month | Mean incident count | 5–40 (below 5 = not really used) |
| **Timeline entries per incident** | Mean events per incident | **≥ 4** (proves collaboration) |
| Assignment rate | % of incidents that ever get an assignee | ≥ 85% |
| Time-to-acknowledge | Median minutes from creation to first non-creator event | < 15 min |
| Time-to-resolve | Median minutes from creation to RESOLVED | Tracked, not targeted (varies by severity) |
| Public update coverage | % of customer-impacting incidents with ≥ 1 public update | ≥ 70% |

### Retention & revenue
| Metric | Definition | Target |
|---|---|---|
| Logo retention (monthly) | % of paying orgs still paying | ≥ 97% |
| Net revenue retention | Expansion − churn | ≥ 105% |
| Seat expansion | Mean seats gained per org per quarter | ≥ 1 |
| Free → paid within 90 days | Conversion of free orgs | ≥ 5% |
| Gross margin | (Revenue − infra − email) / revenue | ≥ 80% |
| Infra as % of revenue | Infra cost ÷ revenue | **< 15% at 100 orgs** |

### Reliability & trust (the non-negotiables)
| Metric | Definition | Target |
|---|---|---|
| **Cross-tenant data leaks** | Confirmed incidents of tenant data exposure | **0. Absolute.** |
| **Audit coverage** | Mutations with a corresponding audit entry | **100%** |
| Status page uptime | Monthly availability of `/status/*` | ≥ 99.9% |
| Public page p95 latency | Time to first meaningful render | < 200 ms (cached) |
| Dashboard list p95 | Incident list response | < 400 ms at 10k incidents/org |
| Notification success rate | SENT ÷ (SENT + FAILED) | ≥ 98% |
| Webhook rejection correctness | Invalid signatures rejected, nothing stored | 100% (test-enforced) |
| Mean time to detect our own incidents | ARCH's own outages detected | < 5 min |
| Mean time to recover (ours) | Our own incidents | < 60 min |

### Product quality signals
| Metric | Definition | Target |
|---|---|---|
| Illegal transition attempts | Rejected server-side, logged | Tracked (spikes = unclear UI) |
| 404-vs-403 correctness | Cross-org requests answered 404 | 100% |
| Accessibility checks | Automated WCAG AA violations on key screens | 0 |
| Crash/error rate | Unhandled errors per 1,000 sessions | < 2 |

---

## 4. Instrumentation plan

**Events to emit** (names matter — keep them stable):

| Event | Fired when | Key properties |
|---|---|---|
| `user.registered` | Account created | `method` (password/github) |
| `organization.created` | Org created | `slug_source` |
| `member.invited` | Invite sent | `role` |
| `project.created` / `service.created` | Resource created | `org_id` |
| `webhook.endpoint_created` | Integration added | `provider` |
| `webhook.received` | Payload accepted | `provider`, `result` (created/updated/duplicate) |
| `webhook.rejected` | Signature/staleness failed | `reason` |
| `incident.created` | Incident opened | `severity`, `source` (manual/webhook) |
| `incident.status_changed` | Transition applied | `from`, `to` |
| `incident.assigned` | Assignee set/changed | `self_assigned` |
| `incident.resolved` | Status → RESOLVED | `duration_minutes`, `severity` |
| `incident.reopened` | RESOLVED → INVESTIGATING | `minutes_since_resolve` |
| `timeline.entry_added` | Comment/event posted | `type`, `visibility` |
| `statuspage.created` / `statuspage.published` | Page lifecycle | `service_count` |
| `notification.sent` / `notification.failed` | Delivery outcome | `channel`, `attempt` |
| `audit.entry_written` | Any audit write | `action` |

**Rules:** never send personal data in analytics; use org/user internal IDs only. Analytics is
opt-in for self-hosted setups and documented in the Privacy Policy.

**Dashboard:** a single page showing the metric tree above, refreshed daily. If it needs more than
60 seconds to read, it is wrong.

---

## 5. Review rituals

| Ritual | Cadence | Question answered |
|---|---|---|
| Weekly metrics read | Monday, 30 min | Are activation and engagement moving? |
| Monthly retention review | Monthly | Which orgs went quiet, and why? |
| Post-launch feature review | Per release | Did the feature move any metric above? If not, why keep it? |
| Quarterly trust review | Quarterly | Reliability suite green? Zero leaks? Audit coverage 100%? |
| Pricing review | At 10, 50, 100 paying orgs | Do upgrade triggers match reality? |

---

## 6. Anti-goals (metrics we refuse to optimise)

- **Incidents created per org, upward.** More incidents is not success — fewer *surprises* is.
- **Time-in-app.** A good incident tool is used for two minutes and closed.
- **Notification volume.** More email is not engagement; it is fatigue.
- **Signups without organizations.** Vanity. We report signup→org instead.
- **Any metric that requires surveillance of individual engineers.** Measure organizations, never
  people. Anyone who might be blamed by a metric is incentivised to hide incidents — which is the
  exact opposite of the product's purpose.

---

*Owner: Founders · Review cadence: 90 days*
