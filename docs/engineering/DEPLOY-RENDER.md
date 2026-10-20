# Deploying ARCH on Render

The repository ships a blueprint (`render.yaml`) with the two commands a Node host must run. If a
deploy sits on "building" for a long time, the log almost always answers why in its first ten lines.

## The two commands

| Setting | Value |
| --- | --- |
| Build Command | `npm ci --include=dev && npm run build:deploy` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

- `npm run build:deploy` generates the Prisma client **once** and then runs `next build`, printing a
  `[deploy]` line for each stage. `next build` alone fails on a fresh clone because
  `src/generated/prisma` is git-ignored.
- `npm start` runs `next start`. It is not the dev server.

## Reading a deploy that looks stuck

`prisma generate` prints its own banner:

```
◇ injected env (0) from .env
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
✔ Generated Prisma Client (7.10.0) to ./src/generated/prisma
```

Seeing that banner repeating at roughly one second intervals is not a slow build: it is the build
being **restarted from zero**. Render restarts a build that the kernel killed (out of memory) or
that the platform timed out. Three causes, in order of frequency:

1. **The Build Command is `npm run dev`.** The dev entrypoint (`scripts/dev.mjs`) starts an embedded
   PostgreSQL cluster, applies migrations and then runs a watching dev server. It never exits, so
   the build step never completes. Use `npm run build:deploy`.
2. **The instance is too small.** Next 16 builds with Turbopack and comfortably exceeds 512 MB.
   Use a Starter (2 GB) instance or larger, and keep `NODE_OPTIONS=--max-old-space-size=1536` so the
   build fails with a clear heap error instead of being killed silently.
3. **A crash after the banner.** A missing `DATABASE_URL`, `AUTH_SECRET` or `AUTH_SECRET_WEBHOOK`
   aborts the build. `npm run build:deploy` prints `FAILED (exit …)`; the plain `next build` output
   can look identical to a restart loop.

If none of those apply, clear the build cache (Dashboard → your service → **Manual Deploy** →
**Clear build cache & deploy**) and deploy again.

## Environment

Set these in the Render dashboard (or let the blueprint prompt for them):

| Key | Notes |
| --- | --- |
| `DATABASE_URL` | Managed PostgreSQL (Render Postgres, Neon, Supabase, …). Never the embedded dev cluster. |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_SECRET_WEBHOOK` | A different `openssl rand -base64 32` |
| `APP_URL` | The public HTTPS origin, e.g. `https://arch.onrender.com` |
| `NODE_VERSION` | `22.22.3` (any 20.19+ works) |
| `NEXT_TELEMETRY_DISABLED` | `1` |

Optional integrations (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, SMTP) stay unset until they
are actually configured; see `.env.example`.

## Database

`next build` does not need a database, but `/api/health` does, and Render marks a service unhealthy
when the health check returns `503`. Apply migrations against the **same** `DATABASE_URL` before the
first request:

```bash
npm run db:migrate
```

Run it once from a Render Shell (or as a pre-deploy command) after provisioning the database and
after every release that contains a new `prisma/migrations/*` directory.

## Worker

Notification delivery and scheduled model training run in a separate process:

```bash
npm run worker
```

Deploy it as a Render **Background Worker** with the same environment variables and
`npm run worker` as its start command. The web service does not process the outbox on its own.

## Verifying a deploy

1. `GET /api/health` returns `200` with `checks.database.status: "ok"`.
2. `/register` creates a workspace (the schema is applied).
3. `/` renders the marketing page — this is the fastest check that the CSS bundle and fonts shipped.
4. `npm run smoke:api` against the deployed origin exercises the API and tenant-isolation paths.
