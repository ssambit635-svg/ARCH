# ARCH — Operations runbook

**Version:** 1.0 · **Owner:** Engineering · **Last reviewed:** 2026-09-23
**Purpose:** what to do, in order, when something needs deploying, restoring, or fixing.
Written so a tired on-call engineer at 3 a.m. can follow it without thinking.

> **ARCH's own status page is the first thing we update when ARCH breaks.** We are our own customer.

---

## 1. Environments

| Environment | Purpose | Data | Who deploys |
|---|---|---|---|
| **Local** | Development | Fixtures/seed only — **never production data** | Everyone |
| **Staging** | Pre-release verification, migration rehearsal | Synthetic data | Auto on merge to `main` |
| **Production** | Customers | Real | Manual promotion from staging |

Environment variables (never committed):

```env
DATABASE_URL="postgresql://user:pass@host:5432/arch"
AUTH_SECRET="..."              # openssl rand -base64 32
AUTH_SECRET_WEBHOOK="..."      # separate secret — never reuse AUTH_SECRET
APP_URL="https://[domain]"
EMAIL_PROVIDER=""              # empty = console logging in dev
EMAIL_API_KEY=""
ERROR_TRACKING_DSN=""
```

Rotation: `AUTH_SECRET` rotation invalidates all sessions (planned maintenance); `AUTH_SECRET_WEBHOOK`
rotation invalidates inbound webhooks until senders are updated — coordinate with customers.

---

## 2. Deployment

### Routine release
```
1. CI green on main (permission + isolation + transition + signature suites all passing)
2. Migrations reviewed; backwards-compatibility confirmed
3. Deploy to staging  → run migrations → smoke test the 5 critical paths
4. Promote to production during a low-traffic window ([weekday, business hours] preferred)
5. Verify: /api/health = 200 · login · create+resolve a test incident · status page renders
6. Post the changelog entry; update the ARCH status page if there is any customer-visible change
7. Keep the previous release deployable for 24 h (one-click rollback)
```

### The 5 critical-path smoke test (do this every deploy)
1. `GET /api/health` → 200
2. Register/login works
3. Create an incident, move it ` INVESTIGATING → IDENTIFIED`, resolve it → timeline correct
4. A published status page renders publicly and reflects the incident
5. A signed test webhook creates an incident; an unsigned one is rejected with 401

### Rollback
```
1. Roll back the application to the previous release first (fastest, safest)
2. Then decide about the migration:
   - Additive migration (new nullable column/table)  → leave it; app version tolerates it
   - Destructive migration                            → restore from backup (§4), then fix forward
   Never "roll back the code and hope the schema is fine."
3. Verify the 5 critical paths again
4. Write an incident entry with timeline, even for a 10-minute blip
```

**Rule:** a rollback is not a failure. A slow rollback caused by pride is.

---

## 3. Monitoring & alerts

| Signal | Threshold | Alert to | First action |
|---|---|---|---|
| `/api/health` failure | 2 consecutive failures | On-call | Check host + DB; deploy rollback if release-correlated |
| 5xx rate | > 1% over 5 min | On-call | Check error tracker top exception; rollback if new |
| Status page latency | p95 > 500 ms for 10 min | On-call | Check cache invalidation; check DB load |
| Dashboard list latency | p95 > 1 s for 10 min | On-call (business hours) | Check slow queries and index usage |
| Notification failures | FAILED > 5% over 15 min | Owner | Check provider status and API key |
| Webhook rejections | > 20% over 15 min | Owner | Verify customer secret configuration, not our bug first |
| DB connections | > 80% of pool | On-call | Check for leaked connections / long transactions |
| Disk / storage | > 85% | Owner | Grow volume; check log/retention growth |
| Auth failures spike | 5× baseline | Owner | Suspect credential stuffing; tighten rate limits |

Every alert must have: a threshold, an owner, and a documented first action. An alert nobody can act
on gets deleted — noise destroys trust in the whole system.

---

## 4. Backup & restore

| Item | Policy |
|---|---|
| Database backup | Daily automated, encrypted, retained 30 days |
| Point-in-time recovery | Enabled if the provider supports it (target: 7 days) |
| Backups stored | Separate region/account from production where possible |
| **Restore rehearsal** | **Quarterly, on staging, timed and documented** |
| Export for customer portability | On request: incidents + audit logs in a portable format |

**Restore procedure:**
```
1. Declare what you are restoring: whole database, or a single tenant's data?
2. Provision the target (never restore over production by accident — name it clearly)
3. Restore the selected backup; note the recovery point
4. Run migrations to bring the schema to the current version
5. Verify: row counts for organizations/incidents, a login, a status page render
6. If this is a production recovery: update the status page, then notify affected customers with the
   recovery point ("data as of HH:MM UTC")
7. Write the post-mortem the same day, while details are fresh
```

**Untested backups are not backups.** The quarterly rehearsal is the only thing that makes the
policy true.

---

## 5. Routine operations calendar

| Task | Cadence | Owner | Notes |
|---|---|---|---|
| Dependency audit + updates | Monthly | Engineering | Critical CVEs immediately |
| Backup restore rehearsal | Quarterly | Engineering | On staging; time it and record the result |
| Access review (production, provider accounts) | Quarterly | Founders | No shared accounts |
| Secret rotation | Quarterly, or on suspicion | Engineering | See §1 for blast radius of each secret |
| Retention job verification | Monthly | Engineering | Confirm expired data is actually gone |
| Alert review (delete useless alerts) | Monthly | On-call | Retire anything that never leads to action |
| Capacity review (DB size, email volume, cost) | Monthly | Founders | Compare against `METRICS.md` cost targets |
| Legal document review | Every 90 days | Founders + counsel | No stale policies |

---

## 6. Common problems and what they usually are

| Symptom | Likely cause | Fix |
|---|---|---|
| "Everyone is logged out" | `AUTH_SECRET` changed or redeployed without env | Set env correctly; notify users; avoid rotating during business hours |
| "Status page shows OPERATIONAL during an outage" | Cache not invalidated on write | **S1 correctness bug.** Invalidate, patch the write path, add a regression test |
| "Webhooks stopped working" | Customer rotated their secret, or our `AUTH_SECRET_WEBHOOK` changed | Verify signatures against the customer's secret; check recent rotations |
| "We're getting duplicate incidents" | Idempotency key not being honoured for that provider | Check event id extraction for that provider's payload shape |
| "Emails are not arriving" | Provider key expired, domain reputation, or notifications stuck `PENDING` | Check provider dashboard, then the `notifications` table by status |
| "Dashboard is slow" | Missing index or an unbounded query | Check slow query log; confirm composite indexes exist |
| "A customer sees another customer's data" | **S1. Stop everything.** | Contain (disable the path), assess scope, notify per §7 of the security doc, fix with a regression test |
| "Database is at connection limit" | Leaked connections, long transaction, or traffic spike | Check for idle-in-transaction; add pooling; look for a missing `await` |

---

## 7. Our own incident process (we eat our own cooking)

ARCH is an incident tool. When we have an incident, we run it in ARCH, publicly.

| Step | Action | Target |
|---|---|---|
| 1 | Declare the incident in ARCH (yes, in the product) with honest severity | < 5 min from detection |
| 2 | Update the public status page **before** the root cause is known — say what customers experience | < 10 min |
| 3 | Assign a responder and a communications owner (can be the same person early on) | Immediately |
| 4 | Post updates every 30 min, even if the update is "still investigating" | Cadence, not progress |
| 5 | Resolve, mark affected services, email subscribers | On resolution |
| 6 | Blameless post-mortem within 5 business days; publish a customer-facing summary | 5 days |
| 7 | Action items get owners and dates; review them at the next weekly meeting | Tracked to done |

**Communication rules:** no jargon in customer-facing updates · no blaming a provider by name ·
never say "resolved" before monitoring confirms it · state times in UTC with the customer's local
time noted.

---

## 8. On-call expectations (pre-scale)

Until there is a real rotation:

- One primary on-call person per week, nominated in advance; a named backup.
- Response targets: **S1** acknowledge in 15 min, **S2** in 1 h (business hours), **S3** next
  business day.
- Any alert firing outside business hours must be **customer-impacting** to justify waking someone.
  If it isn't, fix the alert.
- After any wake-up: the responder gets the next morning off, no negotiation.
- Every on-call week ends with a 10-minute note: what fired, what was noisy, what to change.

---

## 9. Cost & capacity guardrails

| Resource | Watch level | Action |
|---|---|---|
| Database size | 70% of provisioned | Review retention + indexes; plan growth |
| Email volume | 60% of provider plan | Audit notification rules for chattiness |
| Compute | Sustained > 70% CPU | Scale instance; check for a leaked loop |
| Storage / exports | 70% | Review retention; move cold data to cheaper storage |
| **Infra as % of revenue** | **> 15%** | Reprice, optimise queries, or renegotiate providers — see `product/METRICS.md` |

---

## 10. Launch-day checklist

- [ ] Migrations applied and rehearsed on staging, then production
- [ ] `/api/health` monitored externally, not just internally
- [ ] Backups running and **one restore rehearsed on staging**
- [ ] Status page for ARCH itself published, with subscribers enabled
- [ ] Error tracking live with PII scrubbing verified
- [ ] Legal pages published with real entity details (no placeholders)
- [ ] Support inbox `support@[domain]` monitored; auto-responder with response targets
- [ ] Rollback rehearsed once, timed, written down
- [ ] Rate limits active on auth and webhook endpoints
- [ ] Incident response contact list current (who to wake, and how)
- [ ] Daily brief: what changed, what's at risk, what's next — posted where the team reads it

---

*Owner: Engineering · Review cadence: 90 days, or after every S1 incident*
