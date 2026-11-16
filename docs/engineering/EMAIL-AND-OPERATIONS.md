# Email delivery and production handoff

ARCH remains early access. These changes harden delivery; they do not certify production
readiness, uptime, security, or deliverability. No cloud resources are provisioned by this guide.

## What changed

- Release migration processes serialize with a PostgreSQL advisory lock, with bounded connection
  and lock waits and connection cleanup on errors. Production db:reset is refused. The guard
  depends on NODE_ENV being set correctly; it is not a substitute for restricted DB credentials.

- Configured email providers fail validation rather than silently falling back to console.
- A production notification worker refuses disabled/console delivery before touching the outbox.
  Web-only production deployments may leave email unset; pending notifications are not delivered.
  Because this is one combined worker, starting it without real email also prevents its model jobs.
- Each notification is locked with `FOR UPDATE SKIP LOCKED` during the send and acknowledgement.
  Other workers skip that row; locks are released automatically on rollback/disconnect.
- The Resend request has a stable `arch-notification/<id>` idempotency key, a 15-second deadline,
  and no provider response body in errors. This avoids storing provider-returned customer content.
- A send success followed by a DB failure rolls back rather than being recorded as a provider
  rejection. A later retry uses the same key. This is **at-least-once**, not exactly-once: provider
  idempotency retention is finite, and recipient changes during retries can cause conflicts.
- SIGTERM/SIGINT stops claiming notifications after the current delivery finishes, skips the next
  training phase when possible, wakes idle polling, and disconnects at the end. A training job
  already running still has to finish or be terminated by the host.
- Fresh embedded development clusters explicitly use UTF8 and locale C. Existing clusters are
  **not converted** and no user data is deleted. The Windows stop command uses the actual
  `@embedded-postgres/windows-x64` package and `pg_ctl.exe`.

## Free-tier Resend test, without buying a domain first

1. Create a Resend account and check its current free-plan limits and testing restrictions.
   Quotas/pricing can change; this repository does not promise a fixed allowance.
2. Create an API key authorized to send email. Store it only in your local `.env` or Render's
   environment settings. Never commit it, paste it into a PR, or share a screenshot of it.
3. For an initial restricted test, use Resend's supported testing sender, commonly
   `onboarding@resend.dev`. The testing sender can generally send only to the account owner's
   email; check your dashboard's instructions for the current restriction.
4. Set on your PC (or Render service running the test):

   ```dotenv
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=your_private_key
   EMAIL_FROM="ARCH <onboarding@resend.dev>"
   ```

5. In Windows PowerShell, use **your real local project path**, not the sandbox path:

   ```powershell
   cd "C:\Users\hp\Downloads\ARCH-main\ARCH-main"
   npm run email:check
   npm run email:check -- --to YOUR_RESEND_ACCOUNT_EMAIL
   ```

   The first command validates configuration only and sends nothing. The second sends one real
   message. "Provider accepted" is not a delivery guarantee: check your inbox/spam and the Resend
   delivery dashboard. The command does not access the database or start the worker, but ARCH's
   environment contract still requires the usual DATABASE_URL and auth-secret variables.

6. Do not enable broad incident notifications with the restricted testing sender. Messages to
   other recipients can fail permanently. Existing FAILED rows are not automatically retried by
   changing credentials; inspect them and use a deliberate, scoped operational recovery.

### Sending to real users

Add a domain you control in Resend. Publish exactly the DNS records shown there, wait for domain
verification, and use a sender such as `ARCH <notifications@yourdomain.com>`. Configure SPF/DKIM
as instructed; add and monitor a DMARC policy appropriate to your domain. Do not overwrite unrelated
DNS records. A separate sending subdomain can isolate notification mail from your primary mail.

A free sending allowance is not a free domain or free always-on hosting. You cannot verify the
DNS of Render's shared `onrender.com` domain. A paid mailbox is not necessarily needed for
outbound sending, but receiving replies requires a separate mailbox/forwarding arrangement.

## Live Render deployment

Repository changes made in Arena do **not** modify your Windows download or your running Render
service. Review/merge a PR into the branch Render deploys (currently main), or explicitly update
your local checkout. Never copy `.env` into Git. Preserve your local secrets when updating code.

### Web service

- Build: `npm ci --include=dev && npm run build:deploy`
- Pre-deploy: `npm run db:migrate` (supported paid tier required; manually run a release migration
  against the same database if your host has no pre-deploy support).
- Start: `npm start`
- Public URL: `APP_URL=https://arch-qrh6.onrender.com`
- Auth callback base: `AUTH_URL=https://arch-qrh6.onrender.com`
- Retain the existing two distinct auth secrets. Do not regenerate AUTH_SECRET_WEBHOOK casually:
  it encrypts webhook secrets in the database.
- Keep OAuth callback URLs registered at Google/GitHub; never use 0.0.0.0 in browser URLs.

### Background worker

`render-worker.yaml` is an **optional separate blueprint**, not automatically applied by
`render.yaml`. Applying it creates a **paid** worker. Review costs before enabling it.
For an existing worker, edit its settings instead of creating a duplicate.

- Build: `npm ci --include=dev && npm run db:generate`
- Start: `npm run worker`
- Same DATABASE_URL, APP_URL, AUTH_SECRET and AUTH_SECRET_WEBHOOK as the web service.
- Same verified EMAIL_PROVIDER, EMAIL_API_KEY and EMAIL_FROM on the worker. OAuth client secrets
  are unnecessary for the worker's email/model tasks.
- Keep dev dependencies installed: the worker uses `tsx`.
- Apply database migrations once as the web release step before starting the matching worker.
- The worker may run elsewhere on infrastructure you already own. A local worker works only
  while your PC/process/network is running. Do not expose PostgreSQL publicly just to make this
  convenient; use your provider's secure connection and access controls.

`npm run worker -- --once` is a manual one-pass alternative, **not** a free always-on service.
Do not add a public unauthenticated HTTP endpoint to run the worker.

## Release checks (operator actions)

1. Back up managed PostgreSQL before migrations. Restore a backup to a separate database and
   verify it, rather than assuming the backup schedule works. Record recovery steps and timings.
2. Test in staging with separate credentials/data. Serialize releases; migration scripts also take a database lock to protect their history checks.
3. Merge reviewed changes, deploy, and verify `/api/health` returns 200. Use an independent
   uptime monitor. Health currently covers web/database, not worker heartbeat or inbox delivery.
4. Run the explicit email test. Then start the worker and create a test incident with a different
   responder to confirm end-to-end notification enqueue + delivery. Check logs and inbox.
5. Watch pending/failed notifications and Resend bounces/delivery errors. `SENT` means the provider
   accepted a message, not that it reached the inbox. Bounce webhooks and alert automation are
   not implemented by this change.
6. Verify tenant isolation, role checks, OAuth callbacks and status pages on the deployed build.
7. Roll back application code only if compatible with the migrated schema. Do not run db:reset
   in production and do not assume reversing a deploy reverses database migrations.

## Remaining engineering work / limits

- Worker heartbeat and authenticated queue-age/failed-job alerting; no new public diagnostics that
  expose customer or operational data.
- Durable retry scheduling/backoff and an audited tenant-scoped failed-message replay workflow.
  Current policy remains three attempts at worker polling cadence; no automatic replay.
- Signed provider delivery/bounce events and suppression handling before sending at scale.
- New-user invitations currently return a shareable link but only queue an email for a recipient
  who already has an ARCH account. This change does not add arbitrary-recipient notification rows,
  password reset, or email verification flows.
- Independent security review, realistic load tests, restore drills, data retention/deletion rules,
  privacy/support documentation and monitoring configured by the owner.
- Windows fixes need a native Windows verification run. Do not delete a live PostgreSQL data
  directory. For an existing non-UTF8 local cluster, back up/export first; deliberately provision
  a new UTF8 cluster and restore compatible data. Merely restarting does not change encoding.
