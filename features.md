ARCH v1 — Features & System Design
Part 1: Feature list
P0 = must ship in v1 · P1 = nice-to-have after

🔐 Auth & onboarding
Feature
P0	Email/password register + login, protected routes
P0	Onboarding: create first organization → creator becomes OWNER
P1	Password reset, email verification, GitHub OAuth
👥 Organizations & RBAC
Feature
P0	Org profile (name, slug), invite members by email
P0	4 roles: OWNER / ADMIN / RESPONDER / VIEWER + server-side permission checks
P0	Change/remove members, tenant isolation via organizationId
P1	Multiple orgs per user, org branding
📦 Projects & services
Feature
P0	CRUD projects & services; service status (operational/degraded/outage/maintenance)
P0	Link incidents to project + service
P1	Service dependencies, team ownership
🔥 Incidents (core)
Feature
P0	Create incident (title, severity, project, service), assign to member
P0	Status machine: INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED (+ reopen), validated transitions
P0	Timeline/comments; status & assignment changes auto-recorded as events
P0	Incident list (filters + pagination) + detail page
P1	Incident templates, post-incident review fields
🟢 Public status page
Feature
P0	Create page, add services, publish/unpublish, public URL /status/[slug]
P0	Show current service status, active incidents, incident updates
P1	Custom domain, branding, uptime history
🔌 Webhooks / integrations
Feature
P0	Generated webhook endpoint, HMAC signature verify, reject invalid
P0	Valid payload → auto-create incident; delivery logs; idempotency (no duplicates)
P1	Sentry, GitHub, Slack integrations
🔔 Notifications
Feature
P0	Email on incident created / status changed; status pending → sent → failed; retry
P1	Slack, per-user preferences, status-page subscribers
📋 Audit & admin
Feature
P0	Audit log for all security/data changes, admin-only view, pagination
P0	Error logging, /api/health
P1	Export, analytics dashboard
❌ Explicitly NOT in v1
AI/copilot · code gen/debugging · hosting user apps · CI/CD · Kubernetes · billing · mobile apps · microservices · real-time chat · custom domains · multi-region.

Part 2: System design architecture
Component diagram

                    ┌──────────────────────┐
                    │  Developer browser   │
                    └──────────┬───────────┘
        ┌──────────────────────┼──────────────────────┐
   Marketing pages        Dashboard            Public status
   (static/SEO)       (authenticated)           (anonymous)
        └──────────────────────┼──────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │  Next.js App Router  │
                    │  Server Components + │
                    │  Route Handlers      │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  Middleware / API     │
                    │  auth · Zod validation│
                    │  rate limiting · RBAC │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  Services (business) │
                    │ incident · org ·      │
                    │ status · webhook ·    │
                    │ notification · audit  │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  Repositories        │
                    │  Prisma, ALWAYS      │
                    │  org-scoped          │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  PostgreSQL          │
                    │ users · orgs · RBAC  │
                    │ incidents · events   │
                    │ notifications · audit│
                    └──────────────────────┘

External tools ──HMAC──▶ /api/webhooks/:provider ──▶ Webhook service
                         (verify → dedupe → create incident) ──▶ Postgres

Postgres (pending notifications)
      ▼
┌──────────────────┐
│ Worker process   │──▶ Email adapter ──▶ Email provider
│ polls PENDING    │    (console in dev)
└──────────────────┘
Infrastructure decisions (v1)
Concern	Decision
App	One modular monolith (Next.js) — deploy as 1 web process + 1 worker process
DB	PostgreSQL (sessions + app data in same DB)
Async jobs	Postgres-backed outbox — worker polls PENDING rows. No Redis yet — add only when volume demands
Email	EmailAdapter interface → console in dev, provider (Resend/SES) in prod
Files	No user uploads in v1
Status page cache	Next.js revalidation/CDN; invalidate on status change
Rate limiting	On login, register, webhook, public endpoints
3 key request flows
1️⃣ User creates an incident


form submit → route handler reads session → Zod validate →
requirePermission(RESPONDER+) → verify project/service belong to org →
TRANSACTION { Incident + IncidentEvent + AuditLog + pending Notifications } →
return incident → UI refresh → worker sends emails async →
revalidate status page cache if public status changed
2️⃣ External tool fires a webhook


POST /api/webhooks/:provider → read raw body →
verify HMAC + timestamp (bad → 401) →
idempotency check (duplicate → 202, no-op) →
Zod-parse payload → map to org/project/service →
TRANSACTION { incident + event + audit + notifications } → 202 Accepted →
worker emails
3️⃣ Anonymous visitor opens /status/acme


GET /status/[slug] → no auth needed →
query only isPublished=true status page → load services + active incidents →
serve cacheable HTML (CDN) → unknown/unpublished slug → 404 →
dashboard changes trigger revalidation