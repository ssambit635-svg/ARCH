# ARCH — Support policy

**Version:** 1.0 · **Owner:** Support · **Last reviewed:** 2026-09-23
**Purpose:** tell customers exactly what to expect from us, so nobody has to guess during an incident.

---

## 1. Where to write

| Topic | Channel | Notes |
|---|---|---|
| Product issues, configuration help | [SUPPORT EMAIL] | Monitored per §3 |
| Suspected security vulnerability | [SECURITY EMAIL] | See [SECURITY.md](../../SECURITY.md) — do not use the public tracker |
| Abuse, illegal content, impersonation | [ABUSE EMAIL] | Acknowledged within 2 business days |
| Billing, invoices, tax details | [BILLING EMAIL] | |
| Legal notices, DPA, MSA requests | [LEGAL EMAIL] | |
| Status of ARCH itself | [STATUS URL] | Always check here first during an outage |
| Feature ideas | [SUPPORT EMAIL] | Or the public roadmap |

**Never send secrets, credentials, or card details to support.** If you need to share a configuration
detail, describe it or redact it.

---

## 2. Severity definitions

Severity is set by **impact on you**, not by how difficult the bug is for us.

| Severity | Definition | Typical examples |
|---|---|---|
| **S1 — Critical** | The Service is unavailable or unusable for your whole team; data loss; a suspected security incident; or a public status page is wrong or down | Cannot log in · status page shows OPERATIONAL during a real outage · suspected cross-tenant exposure |
| **S2 — Major** | A core function is broken with no reasonable workaround | Webhooks not creating incidents · notifications not sending · audit log non-functional |
| **S3 — Minor** | A function is degraded but work continues; or a question about configuration | Slow dashboard · a filter behaving oddly · assistance setting up a provider |
| **S4 — Request** | Feature request, documentation feedback, general enquiry | "Please add Slack", "this page is unclear" |

**Please state the severity in your first message** and include: organization slug, what you expected,
what happened, when (with timezone), affected surface, and any request IDs or screenshots. A good
first message is usually the whole investigation.

---

## 3. Response targets

Response = a human acknowledgement with a substantive first reply — not an auto-responder, and not a
copy-paste link to documentation.

| Severity | Free | Starter | Growth | Scale | Enterprise |
|---|---|---|---|---|---|
| **S1** | Best effort | Best effort | 4 business hours | **2 hours, 24×7** | **1 hour, 24×7** |
| **S2** | Best effort | 3 business days | 1 business day | 8 business hours | 4 business hours |
| **S3** | Best effort | 3 business days | 2 business days | 1 business day | 1 business day |
| **S4** | Tracked | Tracked | Tracked | Tracked | Tracked |

**Support hours:** [09:00–21:00 IST, Monday–Saturday], excluding Indian public holidays. S1 coverage
for Scale and Enterprise is 24×7, as stated. Enterprise customers may also have a named contact and a
private chat channel.

**Business hours** exclude weekends and Indian public holidays.

### What "response" does and does not promise
- It promises we will acknowledge, assess and give you a next step or a workaround.
- It does not promise a fix within that time. Fix timing depends on severity and cause; we will tell
  you honestly when we don't know yet.
- Resolution times, not response times, are the ones customers actually remember. We would rather
  give you an honest "3 days" than an optimistic "1 hour".

---

## 4. Update cadence during an active issue

| Severity | Update frequency |
|---|---|
| S1 | Every **60 minutes** until resolved, even if the update is "still investigating" |
| S2 | Every **business day** |
| S3 | On meaningful progress |
| S4 | On decision or release |

An update that says nothing new is still an update — silence is what damages trust, not bad news.

---

## 5. Escalation

If you are not getting what you need:

| Step | Contact | When |
|---|---|---|
| 1 | Reply on the existing thread: "Please escalate to S1/S2" | Any time; severity is re-assessed immediately |
| 2 | [ESCALATION EMAIL] | If step 1 does not produce a response within the target for that severity |
| 3 | The founder on call (contact shared with Scale/Enterprise) | S1 only, if step 2 is unanswered past target |

Escalation is not rude — it is a signal, and we log and review every escalation at the weekly meeting.
If a customer had to escalate, our process failed somewhere before that point.

---

## 6. What support covers

**Included**
- Configuration help for any supported feature (projects, services, webhooks, status pages, roles).
- Investigation of suspected bugs, with a workaround where possible.
- Guidance on the API and webhook payloads.
- Import assistance for migration (paid plans, reasonable scope).
- Security and compliance questionnaires for Scale/Enterprise, and the DPA/security documentation for
  anyone who asks.

**Not included**
- Building or debugging your monitoring, CI/CD, infrastructure, or application code.
- Custom development, bespoke integrations, or features outside the roadmap (available as paid
  professional services by agreement).
- Deep remediation of *your* incidents — we provide the tool and the craft, not your on-call rota.
- Support in languages other than English (and Hindi on a best-effort basis).
- Requests to bypass the [AUP](../legal/ACCEPTABLE-USE-POLICY.md), or to access another tenant's data.

---

## 7. Service status and our own incidents

- Check [STATUS URL] before reporting — if we already know, you get the answer in one click instead of
  waiting for a reply.
- Every ARCH incident is run **in ARCH**: declared, assigned, timed, publicly communicated, and closed
  with a blameless post-mortem published within 5 business days.
- Affected customers are notified proactively — you should never have to discover our outage by
  noticing your page is stale.

---

## 8. Maintenance windows

| Type | Notice | Window |
|---|---|---|
| Scheduled non-disruptive | None required (we deploy without downtime as standard) | Anytime |
| Scheduled disruptive | ≥ 48 hours, on the status page + email to OWNERs | Low traffic, [02:00–05:00 IST] preferred |
| Emergency (security/data integrity) | As soon as practicable, before or during | Immediate |

---

## 9. Feedback loop

| Practice | Cadence |
|---|---|
| Support themes reviewed at the weekly team meeting | Weekly |
| Documentation updated when the same question arrives twice | Immediately |
| Feature requests logged, tagged and reviewed against the roadmap | Weekly |
| Every escalation and every S1 gets a written review | After each |
| Churn-risk check-in for organizations quiet for 30 days | Monthly (see GTM plan §6) |

---

## 10. Customers' responsibilities

We ask for four things, and they make support dramatically faster:

1. **One thread per issue** — no split conversations across email and chat.
2. **Reproduction steps or timestamps** — "broken since Tuesday" is a rumour; "fails since 14:02 UTC,
   request id abc123" is a bug report.
3. **Accurate severity** — inflating everything to S1 delays the actual S1s.
4. **A named contact** for S1 coordination, so we are not updating five people separately at 3 a.m.

---

*Owner: Support · Review cadence: 90 days, or after every escalation*
