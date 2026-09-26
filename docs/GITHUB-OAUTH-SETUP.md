# GitHub OAuth: ab kya karna hai (bina local machine clone kiye)

**Current state (2026-09-26):** GitHub repo private hai. `main` ke ek commit mein root
`.env` track ho gaya tha; usmein `AUTH_SECRET` aur `AUTH_SECRET_WEBHOOK` the, OAuth **Client ID**
tha lekin OAuth **Client Secret blank** tha. Is branch ne `.env` ko tracking se hataya, local
secrets rotate kiye, aur tests/CI ko false-green hone se roka. Git history mein purana commit
abhi bhi hai. Yahan ki DB embedded/local hai, `/tmp` mein rehti hai aur sandbox reset par ja
sakti hai; GitHub repo mein na app deployment hai, na managed DB. **OAuth ka real GitHub
round-trip Client Secret aur accessible public callback URL ke bina verify nahin ho sakta.**

## One by one

1. **Security first:** Agar committed `AUTH_SECRET` / `AUTH_SECRET_WEBHOOK` kabhi hosting, CI,
   staging ya production mein bhi use hue hon, *wahan* unhe nayi alag random values se rotate
   karo. **Order important hai agar live webhook endpoints hain:** DB backup lo; naya
   `AUTH_SECRET_WEBHOOK` set karo, purana `AUTH_SECRET` abhi mat hatao. `npm run webhooks:rekey`
   (dry run), phir `npm run webhooks:rekey -- --apply` se legacy v1 endpoints ko naye webhook
   key se encrypt karo (production mein `CONFIRM_WEBHOOK_REKEY=YES` bhi chahiye). Signed webhook
   test karo, **phir** `AUTH_SECRET` rotate karo: sab sessions logout honge. Agar old key pehle hi
   lost/rotated hai to decrypt nahi hoga — endpoint secret reissue karo aur senders update karo.
   Senders per-endpoint `whsec_...` se HMAC sign karte hain, env encryption key se nahi.
   Committed `DATABASE_URL` localhost ke liye tha; agar password kahin aur reuse hua ho to DB
   password bhi rotate karo. Koi secret mujhe/chat/issue/commit/screenshot mein mat bhejna.
   `.gitignore` aur PR merge history se old values nahin mitaate; history purge karna ho to
   separately coordinate karo (force-push se collaborators aur open PRs affect hote hain).

2. **Code review / CI:** Is fix branch ka PR review karke CI checks green hone par merge karo.
   `.env` Git se removed hai lekin workspace mein ignored private file rehti hai. Verify:
   `git ls-files .env` **empty** hona chahiye; `git check-ignore -v .env` rule dikhayega.
   Repo ki `main` branch par required CI check + branch protection enable karna recommended hai.

3. **Preview, local machine ki zaroorat nahi:** Arena live preview par `/api/health` mein
   `database.status=ok` dekho. `/register` par apna test account aur org banao. Seeded default
   passwords **off** hain. Sandbox DB/testing disposable hai, real customer data mat daalna;
   durable data ke liye alag managed PostgreSQL chahiye. `npm run dev:all` DB aur web process
   dono chalata hai; `npm run dev` **akele** stopped DB ko start nahi karta.

4. **OAuth App banao (GitHub website par):** GitHub **Settings → Developer settings → OAuth Apps
   → New OAuth App**. Homepage URL = app ka **exact public HTTPS URL** (Arena preview ka actual
   host, ya stable staging URL). Authorization callback URL = wahi URL +
   `/api/auth/callback/github`. `localhost` callback preview browser par kaam nahi karega.
   Preview host badle to OAuth App mein callback update karna hoga; stable staging domain better
   hai. GitHub user ke account par **verified email** hona zaroori hai. Agar organization OAuth
   app approval mangti hai, org admin se authorize karwao.

5. **Secret server par rakho:** OAuth App ka Client ID → `AUTH_GITHUB_ID`, Client secret →
   `AUTH_GITHUB_SECRET`. Current ignored `.env` mein ID ho sakta hai, **secret blank hai**; use
   sirf Arena workspace ke private env file mein bharo (ya deploy par host ke secret manager mein).
   `APP_URL` ko usi public HTTPS URL par set karo. `AUTH_SECRET` aur `AUTH_SECRET_WEBHOOK`
   unique random values hone chahiye. Server restart karo, `/login` par **Continue with GitHub**
   button aayega. Do not put these values in `.env.example`, GitHub Actions YAML or chat.

6. **End-to-end test:** Naye verified GitHub email se sign in → `/onboarding` par org create karo
   → `/dashboard` kholo. Agar us email ka ARCH password account pehle se hai, **pehle password
   se sign in** karo → Dashboard **Settings → Link GitHub account** → GitHub consent do → log
   out karke GitHub se sign in karo; existing org same rehna chahiye. Matching email ko auto-link
   karna blocked hai. Auth.js sirf GitHub provider ID store karta hai, OAuth access/refresh token
   database mein nahi rakhta. Callback error ho to GitHub App ka callback URL, verified email,
   server env aur public Host check karo (secret log/issue mein paste mat karo).

7. **Agar ARCH ko GitHub par PR bhi banana hai (optional, OAuth se alag):** `GITHUB_TOKEN` is
   feature ke liye alag fine-grained PAT hai: selected repos par Contents (read/write) aur Pull
   requests (read/write). `GITHUB_MODE=auto` ya `real` set karke `npm run github:check -- --repo
   owner/name` se permission check karo. OAuth Client secret, `gh` CLI session token aur ye PAT
   interchangeable **nahi** hain. Sirf login chahiye to `GITHUB_MODE=mock`, `GITHUB_TOKEN` empty.

8. **Production baad mein:** Stable HTTPS host, managed Postgres + backups, env/secrets manager,
   migration, CI branch protection aur release/deploy workflow choose karna pending hai. Repo mein
   abhi automatic deployment nahi hai. `docs/V5-YOUR-CHECKLIST.md` ka staging/production checklist
   follow karo; is preview ko production samajh kar public invite/data mat bhejna.
