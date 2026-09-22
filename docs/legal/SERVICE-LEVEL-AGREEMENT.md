> ⚠️ **TEMPLATE — NOT LEGAL ADVICE.** Replace every `[PLACEHOLDER]` and confirm the credit figures
> and measurement method against your actual monitoring before publishing.

---

# Service Level Agreement (SLA)

**Effective date:** [DD MONTH YYYY] · **Version:** 1.0

This SLA applies to paid subscriptions of the ARCH incident management and status page Service and
forms part of the [Terms of Service](TERMS-OF-SERVICE.md). It does not apply to the Free Tier.

**The Free Tier and all beta/preview features are provided without any availability commitment.**

---

## 1. Definitions

- **Service** — the ARCH platform, excluding third-party integrations and network paths outside our
  control.
- **Public Status Page** — the customer-facing page served at `/status/<slug>`.
- **Dashboard** — the authenticated application at [DOMAIN].
- **Ingest Path** — the webhook endpoints (`/api/webhooks/*`) used to create incidents automatically.
- **Available** — the applicable surface responds to monitoring requests with the expected HTTP status
  within the latency threshold, as measured by our external monitoring.
- **Downtime** — any full minute in which the applicable surface is not Available, excluding §4
  exclusions.
- **Monthly Uptime Percentage** — `(total minutes in the month − Downtime minutes) ÷ total minutes in
  the month × 100`.
- **Service Credit** — a credit against future fees, granted under §6.

---

## 2. Uptime commitments

Uptime is measured **per surface**, because a team can tolerate a slow dashboard far less gracefully
than a wrong status page, and vice versa.

| Surface | Free | Starter | Growth | Scale | Enterprise |
|---|---|---|---|---|---|
| **Public Status Page** | No SLA | No SLA | **99.9%** | **99.9%** | **99.95%** |
| **Dashboard** | No SLA | No SLA | 99.5% | 99.9% | 99.9% |
| **Ingest Path (webhooks)** | No SLA | No SLA | 99.5% | 99.9% | 99.9% |

**Why the public status page has the strictest target:** it is the surface your customers see, and a
status page that is down during an outage is worse than no status page at all. It is cached and
isolated from dashboard load for exactly this reason.

**Monthly equivalent of 99.9%:** approximately **43 minutes** of allowed downtime per month.

---

## 3. Data durability and correctness commitments

Availability is not the whole promise in an incident tool. We also commit to:

| Commitment | Target |
|---|---|
| **Durability of accepted data** | 99.999999% (once a webhook is accepted with a 2xx, the incident is not lost) |
| **Status page correctness** | A published status reflects the current service status within **60 seconds** of a change |
| **Notification attempt** | Notifications are attempted within **5 minutes** of the triggering event; one retry on failure |
| **Audit completeness** | 100% of mutations produce an audit entry, written in the same transaction |
| **Tenant isolation** | Zero cross-tenant data exposure. A confirmed exposure is a Severity 1 incident and is treated under the disclosure process in [SECURITY.md](../../SECURITY.md) |

We would rather over-commit on correctness than pad an uptime number. A status page that is up but
wrong is a failure, not a success.

---

## 4. Exclusions

Downtime does **not** include unavailability caused by:

1. Scheduled maintenance announced at least **48 hours** in advance (we target low-traffic windows and
   aim for zero-downtime deploys).
2. Emergency maintenance required to protect security or data integrity, announced as soon as
   practicable.
3. Customer-side issues: misconfiguration, revoked credentials, publishing errors, exceeding plan
   limits, or use of unsupported browsers.
4. Third-party services outside our control (customer's monitoring tool, chat platform, email
   provider, DNS, or the public internet).
5. Force majeure events.
6. Beta, preview or experimental features, which are excluded entirely.
7. Free Tier use.
8. Customer-initiated suspension or non-payment.

---

## 5. Support response targets

Response = a human acknowledgement with a substantive first reply, not an auto-responder.

| Severity | Description | Growth | Scale | Enterprise |
|---|---|---|---|---|
| **S1** | Service unavailable, data loss, or suspected security incident | 4 business hours | 2 hours (24×7 for S1) | 1 hour (24×7) |
| **S2** | Major feature broken; significant impact with a workaround | 1 business day | 8 business hours | 4 business hours |
| **S3** | Minor issue, question, or configuration help | 2 business days | 1 business day | 1 business day |
| **S4** | Feature request, documentation feedback | Tracked | Tracked | Tracked |

Support hours: **[09:00–21:00 IST, Monday–Saturday]**, excluding Indian public holidays. S1 coverage
for Scale and Enterprise is 24×7 as stated above. Support channel: [SUPPORT EMAIL] (Enterprise may
also have a named contact and chat channel).

---

## 6. Service credits

If the Monthly Uptime Percentage for a covered surface falls below its commitment, the Customer may
claim credits against future fees:

| Monthly Uptime Percentage | Credit (% of monthly fee for the affected month) |
|---|---|
| 99.0% – below commitment | 10% |
| 95.0% – 98.99% | 25% |
| 90.0% – 94.99% | 50% |
| Below 90.0% | 100% |

**Claim process:**
1. Submit a claim to [SUPPORT EMAIL] within **30 days** of the end of the affected month.
2. Include the surface affected, the dates and times (with timezone), and any evidence you have.
3. We verify against our monitoring data, and will share the relevant measurements with you.
4. Approved credits are applied to the next invoice. Credits are not paid in cash, are not
   transferable, and are capped at **100% of the monthly fee** for the affected month.

**Sole remedy:** except for the security disclosure commitments in §3 and rights that cannot be
limited by law, Service Credits are the Customer's **sole and exclusive remedy** for availability
failures.

---

## 7. Measurement methodology

- Availability is measured by external monitoring that polls each surface **every 60 seconds** from at
  least **two geographically distinct locations**, over HTTPS, verifying expected content — not merely
  an open port.
- The Ingest Path is measured using synthetic signed webhook checks.
- Downtime begins at the **second consecutive failed check** (to avoid false positives from transient
  network noise) and ends at the first successful check.
- Monthly reports are available on request, and our own status page history is public.
- We publish our incidents — including our own mistakes — at [STATUS URL].

---

## 8. Customer responsibilities

To benefit from this SLA, the Customer must: be on a paid plan with fees current; use the Service in
accordance with the Terms and [AUP](ACCEPTABLE-USE-POLICY.md); report the issue promptly with enough
detail to investigate; and not have caused the issue through its own configuration or actions.

---

## 9. Changes

We may update this SLA with **30 days'** notice to the Organization OWNER by email. Changes apply from
the next renewal. Enterprise customers may negotiate bespoke commitments in an Order, which prevails
over this SLA.

---

*Owner: Founders (with counsel) · Review cadence: 90 days — and after every S1 incident, to check
whether the numbers we publish are still true*
