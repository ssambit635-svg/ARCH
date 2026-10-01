# Developing ARCH

Practical setup, verification, and troubleshooting for authorized contributors. For a product overview, start with the [repository README](../README.md).

## Requirements

- Node.js **20.19 or newer** and npm; CI uses Node.js 22.
- PostgreSQL, either reachable through `DATABASE_URL`, started by Docker, or provisioned by the embedded development helper.
- Python only when using the CLI or Python-based reproduction tools.

Fonts are self-hosted under `src/app/fonts`; builds do not need Google Fonts.

## Standard local setup

```bash
npm ci
cp .env.example .env
chmod 600 .env
```

Generate two different values with `openssl rand -base64 32`. Put them in `.env` as `AUTH_SECRET` and `AUTH_SECRET_WEBHOOK`. Keep OAuth credentials blank when GitHub sign-in is not needed. All settings are documented in [`.env.example`](../.env.example).

```bash
npm run dev
```

This generates the Prisma client, ensures the configured local database is available, applies SQL migrations, and starts Next.js at `http://localhost:3000`. Register your own account at `/register`. `npm run dev:all` is an alias for the same command.

In a second terminal, while the database is running:

```bash
npm run worker
```

The worker handles notification delivery and scheduled native-model training. For a single pass, use `npm run worker -- --once`.

## Database options

### Docker PostgreSQL

The compose file supplies a local PostgreSQL 16 service:

```bash
docker compose up -d
npm run dev
```

The development command uses an already reachable database instead of starting a replacement.

### Embedded fallback

When the default local database is not reachable, `npm run dev` starts a real embedded PostgreSQL instance. This is a development/test convenience, not a production deployment.

- Its default data directory is under `/tmp`; choose `ARCH_DEV_DB_DIR` if you need a stable local directory.
- The dev command owns the database process and stops it when the command ends.
- `/tmp` may disappear when a sandbox or machine resets.
- A remote database failure never silently switches to a new local database.
- `npm run setup` prepares the database and stops any embedded instance it started; it is not a persistent database server.

For manual lifecycle management:

```bash
npm run db:up
npm run db:status
npm run db:down
```

### Existing or managed PostgreSQL

Set `DATABASE_URL`, then generate the client and apply migrations:

```bash
npm run db:generate
npm run db:migrate
npm run dev:next
```

Hosted databases should use a certificate-matching hostname and verified TLS, such as `?sslmode=verify-full`. Provide `sslrootcert` when your provider needs a custom CA. ARCH normalizes legacy `prefer`, `require`, and `verify-ca` URL modes to verified TLS; it does not disable hostname or certificate checks.

`npm run db:reset` drops and recreates database contents. Use it only with a disposable local database.

## Private demo data

Seeding is **off by default**. In an isolated, disposable environment, set `ARCH_SEED_DEMO="true"` and a unique, private, 12+ character `SEED_PASSWORD` in the ignored `.env`, then run `npm run dev`.

With a database already running, you can instead run:

```bash
npm run db:seed
```

The seed script also requires `SEED_PASSWORD`. Never seed a public or production database, publish the password, or treat these accounts as customer accounts.

## Browser previews and OAuth

The development server binds to `0.0.0.0`, so it can be reached through a browser preview or tunnel. Browser code should use same-origin relative API URLs, not the sandbox’s `localhost`.

Set `APP_URL` to the preview’s actual public HTTPS origin when using callback links, invitations, or GitHub sign-in. Configure the GitHub OAuth app’s callback as:

```text
https://your-public-host/api/auth/callback/github
```

A changing tunnel hostname requires matching OAuth configuration. Follow the [GitHub OAuth guide](GITHUB-OAUTH-SETUP.md). OAuth sign-in and repository write access are separate configurations.

## Verification

```bash
npm run db:generate
npm run typecheck
npm test
npm run build
```

Vitest provisions a separate PostgreSQL database on port `55433`; it does not use the development database for its fixtures. Test files share that test database and are deliberately run serially.

Against an already running app:

```bash
npm run smoke:api
```

The smoke script creates disposable `smoke-*` rows and checks authenticated requests, tenant isolation, permissions, incident workflows, Copilot, public pages, signed webhooks, and the bearer-token API. `SMOKE_BASE_URL` overrides `http://localhost:3000`; `SMOKE_VERBOSE=1` prints individual checks.

Python CLI tests:

```bash
pip install -e clients/python pytest
pytest clients/python/tests
```

Useful native-model tools:

```bash
npm run model:eval       # offline evaluation
npm run model:train      # train models with the configured database running
```

Public corpus fetchers are optional. Keep downloaded corpora and exports out of Git and review the [training-data licenses](legal/TRAINING-DATA-LICENSES.md) before use.

## Production is a separate setup

Do not deploy the embedded database or the default local database credentials.

1. Provision durable PostgreSQL and configure backups.
2. Set distinct, non-placeholder secrets and your public HTTPS `APP_URL` through the deployment’s secret manager. Clear optional credential placeholders (including `GITHUB_TOKEN`) unless the integration is configured; production refuses placeholder credentials.
3. Generate the client and apply migrations against the intended database.
4. Build and start the web app.
5. Run the worker under a separate supervisor.
6. Verify `/api/health`, sign-in, incident writes, and any configured notification or webhook paths.

```bash
npm run db:generate
npm run db:migrate
npm run build
npm start
```

Neither `npm run build` nor `npm start` applies migrations. Coordinate migrations with the release process rather than assuming a running HTTP server implies a complete schema. See the [operations runbook](engineering/OPERATIONS-RUNBOOK.md) for recovery and deployment checks.

## Troubleshooting

### Registration or sign-in reports missing tables

A fresh database can accept connections while still lacking ARCH’s schema. Run `npm run db:migrate` against the same `DATABASE_URL` used by the app, or use `npm run dev` to migrate automatically.

Unexpected authentication failures display an **Error ID**. The matching server log includes error codes and the table involved, without passwords or connection strings.

### The development server runs out of memory

Development source maps are disabled by default to reduce route compilation memory. Set `ARCH_DEV_SOURCE_MAPS="true"` only when you have enough headroom and need detailed stack traces.

### Copilot refuses to start after an older configuration is copied

`AI_PROVIDER` accepts only `arch` and `mock`. ARCH does not ship an OpenAI, Anthropic, Ollama, or hybrid adapter. Remove obsolete external-provider settings and use `AI_PROVIDER="arch"` for native inference.

### GitHub actions return mocked results

`GITHUB_MODE="auto"` uses mocked operations when usable repository access is not configured. Use `mock` for explicitly offline tests. Use `real` only with valid access; this mode fails at boot when configuration is missing or a placeholder. Do not mistake a mocked result for a real pull request.

## Secret rotation and legacy webhook credentials

A previously tracked `.env` remains in repository history. Treat any values copied from it as exposed and rotate them. `.gitignore` does not erase old commits.

New webhook endpoint envelopes use `AUTH_SECRET_WEBHOOK`; legacy v1 envelopes used `AUTH_SECRET`. Before rotating an old session secret on a database that still has legacy endpoints:

1. Back up the database.
2. Configure a new, distinct `AUTH_SECRET_WEBHOOK` while the old `AUTH_SECRET` remains available.
3. Run a dry-run rekey, inspect the result, then apply it:

   ```bash
   npm run webhooks:rekey
   npm run webhooks:rekey -- --apply
   ```

4. Verify a signed webhook.
5. Rotate `AUTH_SECRET`; existing users will be signed out.

If the old key is already lost, rotate and reissue the affected endpoint credentials instead. Never print, commit, or attach either secret to an issue.

---

Owner: Engineering · Last reviewed: 2026-10-01
