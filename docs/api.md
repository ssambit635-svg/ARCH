# ARCH public API v1 (beta)

Base path: `/api/v1`. HTTPS required outside local development. Existing `/api/*`
routes remain available, but are not all part of this versioned contract. The routes below share
the Zod request schemas and service functions used by the dashboard. All responses are `{ "data": ... }` on success
or `{ "error": { "code": "...", "message": "...", "issues": [...] } }` on failure.
Codes: `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_FAILED` (422),
`RATE_LIMITED` (429, Retry-After), `INTERNAL` (500).

Authenticate with `Authorization: Bearer arch_...` or a dashboard session.
Bearer credentials are bound to the issuing organization and creator's **current**
role. `organizationId` in the query string must match the token's organization.
READ allows read endpoints; READ_WRITE additionally allows writes, subject to
`permissions.ts`. Token creation/revocation requires OWNER/ADMIN. The token
secret is returned once, on creation; only a SHA-256 hash is stored.

| Method | Path | Permission | Request |
|---|---|---|---|
| GET | `/organizations` | org.read | returns the token’s organization (slug and ID) |
| GET | `/incidents` | incident.read | `page`, `pageSize`, `status`, `severity`, `projectId`, `serviceId`, `q`, `open` |
| POST | `/incidents` | incident.write | `title`, `projectId`, `severity` (optional), `serviceId` (optional) |
| GET | `/incidents/:id` | incident.read | — |
| PATCH | `/incidents/:id` | incident.write | `status`, `severity`, `title`, etc. |
| GET | `/incidents/:id/timeline` | incident.read | `page`, `pageSize` |
| POST | `/incidents/:id/copilot/triage` | copilot.generate | returns pending draft, does not apply it |
| GET | `/status-summary` | statuspage.read | published pages for the org |
| GET | `/tokens` | webhook.manage | up to 100 active tokens, no secrets |
| POST | `/tokens` | webhook.manage | `name`, `scopes: ["READ"]` or `["READ_WRITE"]` |
| DELETE | `/tokens/:id` | webhook.manage | revokes token |

Incident and timeline lists return `{items, page, pageSize, total, totalPages}`.
Limits: 120 requests/minute per IP and 60/minute per token **per web process**.
For multi-instance deployments, replace the in-memory limiter with shared storage
before promising global rate limits. Behind a reverse proxy, ensure forwarded IP
headers cannot be forged by clients.

## Legacy invitation endpoints

These session-authenticated routes remain outside the versioned `/api/v1` contract:

- `GET /api/organizations/:id/invitations` returns invitation metadata, never the token or its stored hash.
- `POST /api/organizations/:id/invitations` accepts `email` and `role`. The response contains sanitized invitation metadata and `emailQueued`. `emailQueued: true` means an email was placed in the outbox, not that delivery has completed; in that case `inviteUrl` is omitted. If the invitee has no account, `emailQueued` is false and an absolute, one-time `inviteUrl` is returned for manual sharing.

The early-access response renamed `emailSent` to `emailQueued` to describe the actual outbox lifecycle. Clients using this legacy endpoint should migrate to the new field. Raw token hashes are never part of either response.
