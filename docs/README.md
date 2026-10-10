# ARCH documentation map

Start with the row that matches who you are.

| I am… | Read this | Then |
|---|---|---|
| Curious / non-technical | [`EXPLAINED-SIMPLY.md`](EXPLAINED-SIMPLY.md) | [`support/FAQ.md`](support/FAQ.md) |
| Developing locally | [`DEVELOPMENT.md`](DEVELOPMENT.md) | [`../AGENTS.md`](../AGENTS.md) → [`engineering/ARCHITECTURE.md`](engineering/ARCHITECTURE.md) |
| Deciding what to build | [`product/PRD.md`](product/PRD.md) | [`product/FEATURES.md`](product/FEATURES.md) → [`product/USER-STORIES.md`](product/USER-STORIES.md) |
| Selling / marketing | [`go-to-market/GTM-PLAN.md`](go-to-market/GTM-PLAN.md) | [`product/PRICING.md`](product/PRICING.md) → [`go-to-market/COMPETITIVE-ANALYSIS.md`](go-to-market/COMPETITIVE-ANALYSIS.md) |
| Buying / security-reviewing | [`legal/TERMS-OF-SERVICE.md`](legal/TERMS-OF-SERVICE.md) | [`legal/PRIVACY-POLICY.md`](legal/PRIVACY-POLICY.md) → [`engineering/SECURITY-AND-COMPLIANCE.md`](engineering/SECURITY-AND-COMPLIANCE.md) |
| Running it on-call | [`engineering/OPERATIONS-RUNBOOK.md`](engineering/OPERATIONS-RUNBOOK.md) | [`support/SUPPORT-POLICY.md`](support/SUPPORT-POLICY.md) |
| Being onboarded as a customer | [`support/CUSTOMER-ONBOARDING.md`](support/CUSTOMER-ONBOARDING.md) | [`support/FAQ.md`](support/FAQ.md) |

## All documents

### Product (`docs/product/`)
- **CURRENT-STATUS.md** — plain-language current facts, dashboard numbers, features, and limits.
- **PRD.md** — problem, users, scope, requirements, success criteria for v1.
- **FEATURES.md** — every feature, marked Must / Should / Later.
- **USER-STORIES.md** — stories with testable acceptance criteria.
- **ROADMAP.md** — milestone plan from v0.1 to v1.0 and beyond.
- **PRICING.md** — plans, limits, upgrade triggers, rationale.
- **METRICS.md** — north-star metric and the KPI tree behind it.

### Engineering (`docs/engineering/`)
- **ARCHITECTURE.md** — components, request lifecycle, tenancy, data flow, failure modes.
- **BACKEND-TESTING.md** — how to prove the backend works: the 122-check smoke suite, manual curl
  recipes, the feature checklist and the guard rails to break on purpose.
- **ALPHA-TESTING.md** — a solo founder's playbook: alpha on your own data, beta with 3–7 friendly
  users, then load and failure-injection testing, with the numbers to watch.
- **SECURITY-AND-COMPLIANCE.md** — controls, threat model, DPDP/GDPR posture, subprocessors.
- **OPERATIONS-RUNBOOK.md** — deploy, rollback, backups, on-call, our own incident process.

### Go-to-market (`docs/go-to-market/`)
- **GTM-PLAN.md** — positioning, segments, channels, launch sequence.
- **COMPETITIVE-ANALYSIS.md** — who else is in the space and where ARCH differs.
- **BRAND-GUIDE.md** — name usage, voice, colour, typography, logo rules.

### Legal (`docs/legal/`)
Customer-facing and publishable once placeholders are replaced:
- **PRIVACY-POLICY.md** · **TERMS-OF-SERVICE.md** · **DATA-PROCESSING-ADDENDUM.md**
- **SERVICE-LEVEL-AGREEMENT.md** · **COOKIE-POLICY.md** · **ACCEPTABLE-USE-POLICY.md**

### Support (`docs/support/`)
- **FAQ.md** — the questions buyers actually ask.
- **SUPPORT-POLICY.md** — tiers, response targets, escalation.
- **CUSTOMER-ONBOARDING.md** — day-1 checklist for a new tenant.

## House rules for these docs

1. **One owner per document**, named in the footer. Review every 90 days.
2. **No secret sauce in code comments** — product decisions belong here, in prose.
3. **Numbers are hypotheses** until a customer, a bill or a benchmark proves them.
4. **When the docs and the code disagree, fix one of them the same day.**
