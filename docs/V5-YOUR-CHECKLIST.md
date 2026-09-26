# V5 — aapke steps (deployment **abhi nahi**)

Yeh checklist **aapke external accounts, real infrastructure aur real users** ke liye hai.
Is PR ko merge karna deployment ya production readiness ka proof nahi hai. Secrets kabhi
GitHub issue, chat, screenshot, ya repository mein paste mat karna.

## 1. PR ke baad: local/staging check

- [ ] `npm ci && npm run db:generate && npm run typecheck && npm test` chalayein.
- [ ] PostgreSQL ke **backup ke baad** `npm run db:migrate` staging par chalayein.
- [ ] OWNER/ADMIN dashboard Settings mein READ aur READ_WRITE tokens create/revoke karein;
      token ko ek hi baar copy karein. `curl -H "Authorization: Bearer ..." .../api/v1/incidents`
      se read/write, revoked token (401), VIEWER token write (403), aur dusri org ID (404) check karein.
- [ ] CLI ka fresh virtualenv test: `pip install ./clients/python`, `arch login`,
      `arch org use <slug>`, `arch incidents list/create/show/follow/update/triage`,
      `arch status show`, `arch --json incidents list`. CLI login **manual API token** leta hai;
      browser/device OAuth flow is release mein nahi hai.

## 2. Jab deploy karne ka faisla karein (abhi pending)

- [ ] Hosting + managed PostgreSQL ka staging aur production environment alag banayein.
      Dono ke database, secrets, domains, aur deploy credentials alag hon.
- [ ] `.env.example` se required environment variables secret manager mein bharein:
      `DATABASE_URL`, `AUTH_SECRET`, `AUTH_SECRET_WEBHOOK`, `APP_URL`, email/AI/GitHub
      settings jo use karte hain. `.env` commit na karein. Connection pool sizing DB
      capacity ke mutabiq validate karein (app ka per-process max 10 hai).
- [ ] CI required status check + branch protection `main` par enable karein (admin bypass
      bhi disable); CI green hone ke baad hi deploy. **Repo mein abhi deploy job nahi hai**;
      hosting provider ke credentials/target milne par deploy job jodna baaki hai.
- [ ] Hosted proxy mein trusted client-IP headers/CORS/origin policy set karein. Is code ka
      current rate limiter in-memory **per process** hai; multi-instance public rollout se
      pehle shared limiter (Redis/provider edge) lagayein. Proxy par untrusted
      `X-Forwarded-For` strip karein. Session auth ke liye allowed origins verify karein.
- [ ] Error tracking adapter/provider integrate aur alert destination configure karein;
      structured redacted server logs aur Authorization header redaction end-to-end verify
      karein. Abhi error tracking integration aur full structured logging pending hain.
- [ ] `/api/health` par external uptime monitor set karein. ARCH ki apni public status
      page existing status-page feature se banayein, publish karein aur public URL check karein.

## 3. Backups aur restore (abhi run nahi kiya)

- [ ] Managed DB provider mein automatic daily encrypted backups, retention aur off-site
      storage set karein; ownership/access limited rakhein.
- [ ] `DATABASE_URL=... BACKUP_DIR=... scripts/backup-db.sh` ko scheduler par configure
      karein. Dump ko off-host encrypted store mein copy karein; script khud upload nahi karta.
- [ ] Ek **naya disposable database** banayein. `RESTORE_DATABASE_URL=... \
      CONFIRM_DISPOSABLE_RESTORE=YES scripts/restore-drill.sh /path/to/backup.dump`
      chalayein. Source `DATABASE_URL` same nahi hona chahiye. Row counts aur application
      login verify karein, date/time + result likhein; phir disposable DB hata dein.
- [ ] RPO/RTO aur monthly restore rehearsal ka owner/rotation decide karein.

## 4. Package release (abhi publish nahi kiya)

- [ ] PyPI par `arch` already occupied hai; distribution `arch-cli` hai, command `arch`.
      PyPI/TestPyPI project access aur GitHub `testpypi` / `pypi` environments setup karein;
      `TEST_PYPI_TOKEN`, `PYPI_TOKEN` environment secrets set karein, pypi environment
      par reviewer approval lagayein.
- [ ] `clients/python/pyproject.toml` version bump karke `cli-v<version>` tag push karein.
      Workflow TestPyPI ko pehle publish karega, phir PyPI. TestPyPI se **fresh machine**
      install + staging full flow verify karein. Zarurat ho to PyPI job ko approval tak
      hold karein. Package ka naam `arch-cli` hi install karein (`pip install arch-cli`).

## 5. Private beta / product decisions

- [ ] 5–10 real users ko invite karein; CLI incident flow, errors, docs aur onboarding
      par feedback log karein. Tenant isolation + token revocation feedback bhi lein.
- [ ] Device/browser login ka protocol/product design decide karein; manual token prompt
      iska replacement nahi hai. `docs/api.md` abhi handwritten hai, schema-generated
      API reference pipeline pending hai. Public launch se pehle generate/validate karein.
- [ ] P1 billing/webhooks/SSO ko beta feedback ke baad hi prioritise karein.
