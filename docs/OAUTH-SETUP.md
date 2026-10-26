# OAuth sign-in (Google and GitHub)

ARCH can sign a person in with a verified **Google** or **GitHub** account instead of a
password. The provider buttons are always on the sign-in and sign-up screens — a missing button
cannot be told apart from a missing environment file — and each one says whether this instance
is set up to use it. Nothing here is required to run ARCH: email and password always work.

- **Code:** `src/lib/oauth.ts` (registry), `src/lib/oauth-server.ts` (wiring + pending link),
  `src/lib/google-oauth.ts`, `src/lib/github-oauth.ts`, `src/lib/auth.ts` (Auth.js config)
- **Reviewed:** 2026-10-26

---

## 1. Turn a provider on

### Google

1. [Google Cloud console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
   → **Create credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URI**: `<your public URL>/api/auth/callback/google`
   (locally: `http://localhost:3000/api/auth/callback/google`).
4. Create a **client secret** for that client.
5. Put both values in the server environment:

   ```
   AUTH_GOOGLE_ID="…apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="…"
   ```

   Locally that is the git-ignored `.env` file. `npm run dev` and `npm run setup` create it when
   it is missing and print the exact line numbers to fill in, for example
   `56: AUTH_GOOGLE_ID=""` — so the credentials land in the right place on the first try.

### GitHub

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. **Homepage URL**: your public URL (`APP_URL`).
3. **Authorization callback URL**: `<your public URL>/api/auth/callback/github`.
4. Generate a client secret and put both values in the server environment:

   ```
   AUTH_GITHUB_ID="…"
   AUTH_GITHUB_SECRET="…"
   ```

Restart the server. "Continue with Google" / "Continue with GitHub" appear on `/login` as soon as
**both** halves of a provider's credentials are present. A half-configured provider is treated as
"not configured" rather than failing at the callback.

> A `localhost` callback does not work in a browser preview. Use the preview's real public HTTPS
> host for the redirect URI and reconfigure the provider when that host changes. A stable staging
> domain is better than a rotating preview host.

### The consent screen (this is the step people miss)

Google calls the first screen "the OAuth consent screen". Until it is filled in, the sign-in
either refuses everybody ("Access blocked — this app is still in testing") or asks for scopes the
app never uses.

1. **Google Auth Platform → Audience** (older console: *APIs & Services → OAuth consent screen*).
2. **User type: External.** App name, support email and developer contact email.
3. **Test users → Add users → your own Google account.** In *Testing* mode only these accounts
   may sign in. Without this, the sign-in fails before it starts.
4. **Data Access:** keep the default scopes (`email`, `profile`, `openid`) — those are exactly the
   ones ARCH asks for, and nothing more.
5. For a public deployment, switch the audience to **Production** and complete Google's
   verification. A personal/dev client is fine for a private instance.

ARCH only ever asks Google for `openid profile email`, never for Drive, Calendar or Gmail.

### Production

| What | Value |
|---|---|
| `APP_URL` | `https://arch.example.com` — links in emails and invitations |
| `AUTH_URL` | `https://arch.example.com` — the origin the OAuth callback is built from |
| Redirect URI at the provider | `https://arch.example.com/api/auth/callback/google` |

`AUTH_URL` is what makes the callback URL predictable behind a proxy. Without it Auth.js uses
whatever host the browser sent, which is right on localhost but can be rewritten in production —
and a callback URL that does not match the registered one is refused by the provider.

The server must be able to reach the provider itself:

| Provider | Hosts the server calls |
|---|---|
| Google | `accounts.google.com` (discovery), `oauth2.googleapis.com` (token), `www.googleapis.com` (signing keys) |
| GitHub | `github.com` (token + profile) |

If it cannot, ARCH says "that provider could not be reached" and changes nothing — it never
falls back to a weaker sign-in.

## 2. How the flow behaves

| Situation | What happens |
|---|---|
| The email has no ARCH account | The account is created, the email is marked verified, the person is signed in. |
| The email already has an ARCH account | ARCH refuses to link it silently. It asks for the password, and links the provider as soon as the password is accepted — one extra step, no detour through Settings. |
| The provider has no **verified** email | The sign-in is refused with a message that says what to fix. No account is created. |
| The provider is not configured on this instance | The button is not rendered and the callback cannot be reached. |

The "link it after the password" reminder lives in a signed, `httpOnly`, `SameSite=Lax` cookie
(`arch.oauth.link`, 10 minutes). It never carries a token and never leaves the site: the
destination it remembers is passed through the same same-site guard as every other auth redirect.

## 3. What the security model actually is

**Verified email only.** Google's ID token carries `email_verified`; ARCH refuses any identity
whose address Google has not verified. GitHub's address is taken from `/user/emails` and must be
`verified: true` — the public profile email is never trusted.

**No automatic account linking.** Neither provider sets Auth.js'
`allowDangerousEmailAccountLinking`. A provider account is only ever attached to an ARCH account
whose owner proved who they are by signing in with their password first. Without this, anybody
could take over an account by registering the same email address at a provider.

**A continuing link only joins the same address.** When the password sign-in finishes a link
automatically, ARCH remembers which address was signed in with and checks the provider's address
against it. A provider identity is never attached to a different account — not even on a shared
browser where somebody else signs in a moment later.

**PKCE *and* `state`.** Auth.js enables PKCE by default; ARCH additionally asks for the `state`
parameter (RFC 6749 §10.12). PKCE stops an intercepted authorization code from being replayed;
`state` ties the callback to the exact request this browser started. Both are enabled through
`checks: ['pkce', 'state']` on both providers.

**No OAuth tokens are stored.** The Prisma adapter override drops the access, refresh and ID
tokens before the account row is written. ARCH only needs to know *which* provider account is
linked, not what it can do with it.

**Nothing is disclosed.** A refused sign-in never says whether an email address is registered.
The message is the same for "no such account" and "wrong password", and the same for an
unverified provider address.

**Rate limits.** Credentials sign-in is limited per email (10/min) and per IP (30/min). Starting
a provider sign-in is limited per IP (20/min) — it is the one auth endpoint that can be triggered
without knowing an email address.

**Every provider sign-in is recorded.** `auth_events` keeps the provider, the event
(`oauth_sign_in` / `oauth_link` / `oauth_denied`), the IP address and the user agent. No token,
secret or password is ever written there. The last five events are visible under
**Dashboard → Settings → Recent sign-ins**.

## 4. Troubleshooting

| Symptom | Cause |
|---|---|
| The button says "Not set up on this instance" | One half of the credentials is missing, the value is a placeholder, or the server was not restarted. Pressing it names the two variables to set. |
| The button disappeared after a fresh clone, a wiped machine or a new sandbox | It does not: the buttons are always rendered. `.env` is git-ignored, so it is simply not there any more — `npm run dev` and `npm run setup` recreate it from `.env.example` with fresh secrets and print the line numbers to paste the credentials into. |
| "Access blocked — this app is still in testing" (Google) | The Google console is in *Testing* mode and your account is not listed under **Audience → Test users**. |
| "Google hasn't verified this app" | Expected for a personal/dev client. It still works for accounts listed as test users. |
| `redirect_uri_mismatch` | The redirect URI in the provider console does not match the URL the browser actually used. Check `AUTH_URL` and the host in the address bar. |
| "could not be reached" | The server cannot reach the provider. Check the outbound firewall for `accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com`. |
| `invalid_client` | The client secret is wrong or was rotated without updating the server environment. |
| "would not let this account in" | The provider account has no verified email address. |
| "An ARCH account already uses that email address" | Expected. Sign in with the password; ARCH links the provider right after. |
| The person lands on `/api/auth/signin` | A provider handed back an identity ARCH could not verify. The route handler rewrites this to `/login` with a readable message; if you still see it, the Auth.js callback route was replaced. |
| `Configuration` error | The provider is registered but its credentials are wrong. Check the server environment and restart. |

## 5. Rotating a provider secret

1. Create a new secret at the provider.
2. Put it in the server environment and restart.
3. Revoke the old secret at the provider.

Existing sessions survive: ARCH's own `AUTH_SECRET` signs them, not the provider secret.
