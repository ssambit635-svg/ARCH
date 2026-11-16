# Welcome email: code, domain verification, and activation

## What is implemented

ARCH can queue a one-time welcome when a **new account** is created with email/password,
Google, or GitHub. Regular sign-in, provider linking, and existing accounts do not enqueue it.

- HTML email with the existing ARCH dragon mark converted to PNG, a workspace button, and
  useful first steps. Plain-text fallback is included; clients may block images, so the message
  remains readable without them. The image is served from `/email/arch-mark.png` on APP_URL.
- The account and welcome outbox row commit in the same database transaction. There is no
  provider request, credential, verification token, or password in the signup response/email.
- An internal, account-scoped `welcome_emails` table supports users without any organization.
  It is not exposed through tenant notification APIs. Account deletion cascades to its row.
- A primary key on userId prevents duplicate enqueue. The worker locks individual rows and
  sends `arch-welcome/<userId>` as the Resend idempotency key. Delivery is at-least-once, not
  guaranteed exactly once, because provider idempotency retention is finite.
- Retryable failures wait at least 1 minute, then 5 minutes, with 3 total attempts. Permanent
  rejection goes to FAILED immediately. Provider response bodies/customer content are not
  stored in failure messages. There is no automatic failed-message replay endpoint.
- `FEATURE_WELCOME_EMAIL` defaults to false. It gates enqueue **and** dispatch, so disabling it
  pauses existing pending welcome mail. Enabling it does not backfill existing users.
- This is a transactional welcome, **not email ownership verification, login OTP, or password
  reset**. Password signup addresses are not verified by this feature; keep existing signup
  rate limits and monitor abuse/complaints before allowing large volumes.

No real email was sent by the automated tests. Domain/DNS configuration, provider limits,
inbox placement, and live worker operation are operator checks, not code-only guarantees.

## Costs: what is and is not free

The HTML/PNG template adds no paid image-generation, mailbox, or email-template dependency.
Resend offers a free sending allowance; check the current limits on your account. An owned
sending domain normally has a registration/renewal cost. There is no way for this code to
verify Render's shared `onrender.com` DNS. An always-on Render background worker is a separate
paid product; this change does not create one or require you to upgrade automatically.

If you have no domain yet, you can still send the welcome template **to your own Resend account
email** using the restricted testing sender. Do not enable public welcome delivery with it.

## 1. Test the welcome design without a domain purchase

Update your local checkout to include this change, run `npm ci` and `npm run db:generate`, and
keep `.env` private. With your existing local DATABASE_URL and two auth secrets, set:

```dotenv
APP_URL="https://arch-qrh6.onrender.com"
EMAIL_PROVIDER="resend"
EMAIL_API_KEY="your-private-resend-key"
EMAIL_FROM="ARCH <onboarding@resend.dev>"
FEATURE_WELCOME_EMAIL="false"
```

The flag may stay off for an explicit template test. After this code is deployed, the PNG will
be available at the public APP_URL. Testing before deployment may show the image alt text.

Windows PowerShell (use your own actual project path):

```powershell
cd "C:\Users\hp\Downloads\ARCH-main\ARCH-main"
npm run email:check -- --to ssambit635@gmail.com --welcome
```

Use that address only if it is your Resend account email. The command sends one real test
message, does not create an account/outbox row, and does not start the worker. Without `--to`,
`npm run email:check -- --welcome` validates configuration only and sends nothing. Provider
acceptance is not inbox delivery; check Gmail inbox/spam and Resend's delivery log.

## 2. Verify a domain in Resend

You must own/control a domain's DNS. If you already own one, you do not need to buy another.
A separate paid inbox is not required just for sending; receiving replies needs separate setup.

1. Resend dashboard → **Domains** → **Add Domain**.
2. Use a dedicated subdomain, for example **notify.yourdomain.com**, replacing the example with
   your actual owned domain. Select the sending region appropriate to your deployment/account.
3. Keep Resend's DNS-record table open. In the DNS provider for your domain (registrar,
   Cloudflare, etc.), add **the exact record types, names, values, and priorities Resend shows**.
   Records commonly include DKIM TXT and sending/return-path SPF/MX records. Do not guess values
   or copy another project's records.
4. Some DNS providers append the base domain automatically: entering a full hostname in a
   relative-name field can accidentally produce `...yourdomain.com.yourdomain.com`. Follow your
   DNS provider's input convention and compare the resulting hostname to Resend's instructions.
5. Preserve existing website A/CNAME records and existing mailbox MX records. Do not add a second
   SPF policy at the same hostname; reconcile existing records with your mail/DNS administrator.
   If a required record supports proxying, use DNS-only unless Resend explicitly instructs otherwise.
6. Click **Verify / I've added the records** in Resend. Wait until it reports verified. DNS
   changes may take time; failed verification is not fixed by changing application code.
7. Add/monitor DMARC according to your domain's mail policy. Start carefully if this domain also
   sends other mail; do not invent a restrictive policy that breaks existing senders.
8. Use a sender belonging to the **verified domain/subdomain**, e.g.:

   ```dotenv
   EMAIL_FROM="ARCH <welcome@notify.yourdomain.com>"
   ```

   Verifying `notify.yourdomain.com` does not mean you should send from an unrelated domain or
   assume every other subdomain is verified. A sender such as `welcome@gmail.com` will not work.
9. Prefer a sending-only API key restricted to the verified domain. Update your secret manager
   if you replace the key. Never paste the key into a PR or screenshot.

Your **website can stay at https://arch-qrh6.onrender.com**. A sending domain does not force a
website/domain migration or OAuth callback change. APP_URL remains your real public website URL.

## 3. Deploy the schema and code before enabling welcome emails

Review/merge this PR into Render's deployed branch. Arena edits do not change your Windows ZIP
or live service automatically. Back up the managed database before schema changes.

This release adds `prisma/migrations/20261115000000_welcome_email/migration.sql`. Run the normal
migration runner against the same managed DATABASE_URL as the web service **before** enabling
welcome emails. No historical migration is changed; there is no backfill.

**Existing Render Free service with no Shell/pre-deploy support:** use the service's Settings →
Start Command:

```bash
npm run db:migrate && npm start
```

Keep Build Command `npm ci --include=dev && npm run build:deploy`. This runs pending migrations
on startup and refuses to start the web server if they fail. Check deployment logs for the new
migration and a healthy startup; health checks do not replace reading migration failures. If you
later have a supported pre-deploy step, prefer running migrations there and `npm start` for web.
A rollback of application code does not undo schema changes. Never run db:reset in production.

## 4. Configure web AND the worker

First prove a test email can be delivered from the verified sender. Then put these values in
Render's web Environment and in the environment of whatever worker you operate:

```dotenv
EMAIL_PROVIDER=resend
EMAIL_API_KEY=your-private-resend-key
EMAIL_FROM="ARCH <welcome@notify.yourdomain.com>"
FEATURE_WELCOME_EMAIL=true
APP_URL=https://arch-qrh6.onrender.com
```

The quotes shown are for dotenv files. In Render's value field, paste the value without surrounding
quotes. Keep the worker's DATABASE_URL and two auth secrets consistent with the web deployment.
Redeploy/restart both processes after updating settings.

**Important:** the web service queues mail, it does not process the outbox. An email arriving from
`email:check` proves credentials/template delivery, not that your worker is running.

For a no-extra-hosting-payment test, you can run `npm run worker` locally against the live managed
database, with the matching configuration, while your PC is on. This requires a secure network
connection and the live database's credentials; never post that URL, disable TLS verification, or
open a public database port for convenience. Use a separate local checkout/configuration for
live-worker operation, not your development database by accident. This is **not** a free 24/7
availability promise. The optional `render-worker.yaml` remains paid and opt-in.

## 5. End-to-end acceptance test

1. Use staging first where available. Confirm migrations completed, the worker is running, the
   sender is verified, and the flag is true on both processes.
2. Create a genuinely new account with an inbox you control. A returning user's sign-in will
   not enqueue a welcome, and enabling the feature does not mail old accounts.
3. Verify a single welcome arrives with a working workspace link and optional logo. Clients
   may suppress remote images. APP_URL must not be localhost or 0.0.0.0 for real recipients.
4. Sign out/in again: no additional welcome should arrive. Test a new OAuth account and a new
   password account separately; linking providers to an old account should not create one.
5. Watch worker aggregate logs and Resend delivery logs. Three retryable failures or a permanent
   rejection leaves a FAILED row needing deliberate operator review. Do not blindly reset rows
   or assume accepted means delivered. Fix the sender/credentials before trying another test.
6. If something is wrong, set FEATURE_WELCOME_EMAIL=false on both web and worker. Existing
   pending rows are retained. Disabling welcome does not disable incident notifications.

Domain verification and ongoing quotas/deliverability must be handled in Resend/DNS. Bounce
suppression, account email verification/OTP, and an audited failed-message replay UI remain
separate work; this release does not pretend to implement them.
