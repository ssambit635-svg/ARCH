# ARCH — Coding Agent Context (AGENTS.md)

## 1. Product

ARCH is a **multi-tenant incident-management + public-status-page SaaS** for developer teams.

Workflow it supports:
alert comes in → incident created → assigned to responder → timeline collaboration →
resolution → public status page updated → audit trail preserved.

ARCH is **NOT**: an AI model, IDE, code generator, debugger, hosting platform, CI/CD,
Kubernetes manager, billing system, or a replacement for GitHub/Slack/AWS.

**Positioning:** "ARCH is where your team goes when your application breaks."

### Core principles
- Modular monolith — NO microservices in v1.
- Every tenant-owned query MUST be scoped by `organizationId`.
- Never trust org ID / role / permission from the client — authorize server-side on every mutation.
- Smallest working vertical slice first: DB → server logic → API → UI → test.
- No AI in v1. Readable code over premature abstraction.

---

## 2. Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict) |
| Framework | Next.js 14+ App Router |
| Styling | Tailwind CSS |
| Database | PostgreSQL 16 (Docker, local) |
| ORM | Prisma |
| Validation | Zod |
| Auth | Auth.js (NextAuth v5) — credentials or GitHub provider |
| Email | Provider behind an adapter (start with console/Resend) |
| Background jobs | Add only when notifications/webhooks need it (Inngest/Trigger.dev) |

### Local setup

~~~bash
npm install
docker compose up -d          # PostgreSQL on :5432
npx prisma migrate dev
npm run dev                   # http://localhost:3000
~~~

### Environment variables (`.env`)

~~~env
DATABASE_URL="postgresql://arch:arch@localhost:5432/arch"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_SECRET_WEBHOOK="separate-secret-for-webhook-signatures"
APP_URL="http://localhost:3000"
EMAIL_PROVIDER=""             # empty = console logging in dev
~~~

---

## 3. Architecture overview

~~~text
Browser ──▶ Next.js App Router
              ├── (marketing)  public landing + status pages
              ├── (auth)       login / register
              ├── dashboard    authenticated app (server components)
              └── api/         route handlers (Zod-validated)
                      │
                      ├── lib/permissions.ts   ← RBAC gate on EVERY mutation
                      ├── server/services/     ← business logic
                      ├── server/repositories/ ← Prisma queries (org-scoped)
                      └── prisma ──▶ PostgreSQL
~~~

- Route handlers never talk to Prisma directly — they call services, services call repositories.
- All list queries filter by `organizationId` at the repository layer, unconditionally.

### Folder structure

~~~text
src/
  app/
    (marketing)/page.tsx
    (auth)/{login,register}/page.tsx
    dashboard/
      incidents/  status/  settings/  audit/
    status/[slug]/page.tsx        # public, unauthenticated
    api/
      auth/[...nextauth]/route.ts
      health/route.ts
      organizations/route.ts
      incidents/route.ts
      incidents/[id]/route.ts
      incidents/[id]/events/route.ts
      webhooks/[provider]/route.ts
      status-pages/route.ts
      status-pages/[id]/publish/route.ts
      status-pages/public/[slug]/route.ts
  components/ui/  components/incidents/  components/status/
  lib/{db,auth,permissions,validation,audit}.ts
  server/
    services/{incident,organization,statusPage,webhook,notification}.service.ts
    repositories/*.repository.ts
prisma/schema.prisma
docker-compose.yml
~~~

---

## 4. Data model — `prisma/schema.prisma`

~~~prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Enums ----------

enum MembershipRole {
  OWNER
  ADMIN
  RESPONDER
  VIEWER
}

enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum IncidentStatus {
  INVESTIGATING
  IDENTIFIED
  MONITORING
  RESOLVED
}

enum ServiceStatus {
  OPERATIONAL
  DEGRADED
  OUTAGE
  MAINTENANCE
}

enum IncidentEventType {
  STATUS_CHANGED
  SEVERITY_CHANGED
  ASSIGNED
  COMMENT
  LINKED
}

enum NotificationChannel {
  EMAIL
  SLACK
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}

// ---------- Auth (Auth.js compatible) ----------

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  memberships   Membership[]
  incidentsCreated Incident[] @relation("IncidentCreator")
  incidentsAssigned Incident[] @relation("IncidentAssignee")
  incidentEvents    IncidentEvent[]
  auditLogs         AuditLog[]
  notifications     Notification[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ---------- Tenancy & RBAC ----------

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships   Membership[]
  projects      Project[]
  incidents     Incident[]
  statusPages   StatusPage[]
  webhookEndpoints WebhookEndpoint[]
  auditLogs     AuditLog[]
  notifications Notification[]

  @@map("organizations")
}

model Membership {
  id             String         @id @default(cuid())
  userId         String
  organizationId String
  role           MembershipRole @default(VIEWER)
  createdAt      DateTime       @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@map("memberships")
}

// ---------- Catalog ----------

model Project {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  slug           String
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  services     Service[]
  incidents    Incident[]

  @@unique([organizationId, slug])
  @@map("projects")
}

model Service {
  id        String        @id @default(cuid())
  projectId String
  name      String
  status    ServiceStatus @default(OPERATIONAL)
  createdAt DateTime      @default(now())

  project           Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  incidents         Incident[]
  statusPageServices StatusPageService[]

  @@index([projectId])
  @@map("services")
}

// ---------- Incidents ----------

model Incident {
  id             String           @id @default(cuid())
  organizationId String
  projectId      String
  serviceId      String?
  title          String
  description    String?
  severity       IncidentSeverity @default(MEDIUM)
  status         IncidentStatus   @default(INVESTIGATING)
  createdById    String
  assignedToId   String?
  startedAt      DateTime         @default(now())
  resolvedAt     DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  service      Service?     @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  createdBy    User         @relation("IncidentCreator", fields: [createdById], references: [id])
  assignedTo   User?        @relation("IncidentAssignee", fields: [assignedToId], references: [id])
  events       IncidentEvent[]
  notifications Notification[]

  @@index([organizationId, status])
  @@index([organizationId, createdAt])
  @@map("incidents")
}

model IncidentEvent {
  id         String             @id @default(cuid())
  incidentId String
  authorId   String
  type       IncidentEventType
  body       String?
  metadata   Json?
  createdAt  DateTime           @default(now())

  incident Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  author   User     @relation(fields: [authorId], references: [id])

  @@index([incidentId, createdAt])
  @@map("incident_events")
}

// ---------- Status pages ----------

model StatusPage {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  slug           String   @unique
  isPublished    Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  services     StatusPageService[]

  @@map("status_pages")
}

model StatusPageService {
  id           String      @id @default(cuid())
  statusPageId String
  serviceId    String
  displayName  String?

  statusPage StatusPage @relation(fields: [statusPageId], references: [id], onDelete: Cascade)
  service    Service    @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([statusPageId, serviceId])
  @@map("status_page_services")
}

// ---------- Webhooks (ingestion) ----------

model WebhookEndpoint {
  id             String   @id @default(cuid())
  organizationId String
  provider       String   // "generic" | "github" | "sentry" | "grafana" ...
  externalId     String?  // provider-side id or path token
  secretHash     String
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([provider, externalId])
  @@map("webhook_endpoints")
}

// ---------- Observability ----------

model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  actorId        String
  action         String   // "incident.create", "member.role_change", ...
  entityType     String
  entityId       String
  metadata       Json?
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  actor        User         @relation(fields: [actorId], references: [id])

  @@index([organizationId, createdAt])
  @@map("audit_logs")
}

model Notification {
  id             String             @id @default(cuid())
  organizationId String
  incidentId     String?
  recipientId    String
  channel        NotificationChannel
  status         NotificationStatus @default(PENDING)
  sentAt         DateTime?
  createdAt      DateTime           @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  incident     Incident?    @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  recipient    User         @relation(fields: [recipientId], references: [id])

  @@index([status, createdAt])
  @@map("notifications")
}
~~~

---

## 5. API routes

| Method | Route | Auth | Required role | Notes |
|---|---|---|---|---|
| GET | `/api/health` | none | — | liveness probe |
| GET | `/api/github-stars` | none | — | landing-page star badge; this repo's count from GitHub, cached 5 min; `stars` is `null` when GitHub can't be read |
| POST | `/api/auth/register` | none | — | creates User |
| GET/POST | `/api/organizations` | session | — / creator becomes OWNER | |
| GET | `/api/organizations/:id/members` | session | VIEWER+ | org-scoped |
| PATCH | `/api/organizations/:id/members/:userId` | session | ADMIN+ | role change → audit log |
| GET/POST | `/api/incidents` | session | VIEWER+ / RESPONDER+ | always filter by session org |
| GET/PATCH | `/api/incidents/:id` | session | VIEWER+ / RESPONDER+ | status transitions validated |
| POST | `/api/incidents/:id/events` | session | RESPONDER+ | timeline entry |
| GET/POST | `/api/status-pages` | session | VIEWER+ / ADMIN+ | |
| POST | `/api/status-pages/:id/publish` | session | ADMIN+ | toggles isPublished |
| GET | `/api/status-pages/public/:slug` | none | — | only if isPublished=true |
| POST | `/api/webhooks/:provider` | signature | — | HMAC verify with AUTH_SECRET_WEBHOOK |
| GET | `/api/audit` | session | ADMIN+ | org-scoped, paginated |

**Rules:** every handler: parse body with Zod → `requirePermission(orgId, actor, ACTION)` → service call → audit log for writes → shape response. Return 403 on permission failure, 404 when the resource isn't in the caller's org (never leak cross-tenant existence).

---

## 6. RBAC permission matrix

| Action | OWNER | ADMIN | RESPONDER | VIEWER |
|---|---|---|---|---|
| View incidents/status/audit (own org) | ✅ | ✅ | ✅ | ✅ |
| Create/assign/resolve incidents, post events | ✅ | ✅ | ✅ | ❌ |
| Manage projects & services | ✅ | ✅ | ❌ | ❌ |
| Invite/remove members, change roles | ✅ | ✅ | ❌ | ❌ |
| Manage webhooks & integrations | ✅ | ✅ | ❌ | ❌ |
| Publish status page | ✅ | ✅ | ❌ | ❌ |
| Org settings, billing, delete org | ✅ | ❌ | ❌ | ❌ |

Implement as a single source of truth in `lib/permissions.ts`:

~~~ts
// action → minimum roles allowed
export const PERMISSIONS = {
  "incident.read":   ["OWNER", "ADMIN", "RESPONDER", "VIEWER"],
  "incident.write":  ["OWNER", "ADMIN", "RESPONDER"],
  "project.manage":  ["OWNER", "ADMIN"],
  "member.manage":   ["OWNER", "ADMIN"],
  "webhook.manage":  ["OWNER", "ADMIN"],
  "statuspage.publish": ["OWNER", "ADMIN"],
  "org.settings":    ["OWNER"],
} as const;

export async function requirePermission(
  organizationId: string, userId: string, action: keyof typeof PERMISSIONS
) { /* lookup membership → throw 403 if role not allowed */ }
~~~

---

## 7. MVP milestones & acceptance criteria

1. **Setup + DB + auth** — `docker compose up` → migrate → register/login works; `/api/health` returns 200.
2. **Orgs + membership** — create org (creator = OWNER), invite member by email, member sees only their org.
3. **RBAC enforced** — matrix above enforced in every route; cross-org ID in request → 404.
4. **Projects & services** — CRUD within org; service has live status.
5. **Incident CRUD + timeline** — create/assign/transition with valid state machine (`INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED`, reopen allowed); every transition writes an IncidentEvent + AuditLog.
6. **Public status page** — publish/unpublish; `/status/[slug]` shows service statuses; unpublished → 404.
7. **Webhook ingestion** — HMAC signature verified, invalid signature → 401, creates/updates incident from payload.
8. **Notifications** — PENDING → SENT/FAILED lifecycle via email adapter; retry once on failure.
9. **Audit logs** — every mutating action recorded; ADMIN-viewable, paginated.
10. **Hardening** — rate limiting on auth + webhooks, error boundaries, loading/empty states, permission + transition tests green, deploy docs.

---

## 8. Out of scope for v1

AI models · code generation · debugging tools · hosting user apps · CI/CD pipelines ·
Kubernetes · billing/payments · mobile apps · microservices · real-time chat ·
replacing GitHub/Slack/AWS/IDEs.

---

## 9. Coding, security & testing rules

- **TypeScript strict**; no `any` in service/repository signatures.
- Validate **all** external input with Zod (bodies, query params, webhook payloads).
- Multi-tenant safety: repositories take `organizationId` as a **required** parameter; never filter by ID alone.
- Use Prisma `$transaction` when an operation spans >1 write (incident + event + audit + notification).
- Webhooks: verify HMAC (`AUTH_SECRET_WEBHOOK`) before parsing; reject stale timestamps; store only `secretHash`, never raw secrets.
- Never log or return tokens, password hashes, or webhook secrets. Secrets live only in `.env`.
- Every UI screen ships with **loading, empty, and error** states; forms use accessible labels.
- Tests (Vitest/Playwright): (a) permission matrix — each role × each action, (b) incident state transitions incl. illegal ones, (c) cross-tenant isolation returns 404, (d) webhook signature accept/reject.
- Commit style: `feat(incidents): ...`, `fix(auth): ...`, one vertical slice per PR.
~~~

**How to use it:** put this file at your project root, then tell your agent:

> "Read AGENTS.md. Build Milestone 1: project setup, Dockerized Postgres, Prisma migration, auth, and organization creation. Follow the coding rules."

It has enough context to build every milestone without re-explaining your product.
