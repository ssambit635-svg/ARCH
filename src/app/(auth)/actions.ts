'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '@/lib/auth';
import { db, isDatabaseReachable } from '@/lib/db';
import { describeDatabaseError, safeErrorLog } from '@/lib/db-errors';
import { loginSchema, registerSchema } from '@/lib/validation';
import { registerUser } from '@/server/services/auth.service';
import { zodIssues } from '@/lib/api';
import { isAppError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';
import { safeAuthCallback } from '@/lib/auth-redirect';
import { requestIp } from '@/lib/auth-request';
import { isOAuthProviderId, type OAuthProviderId } from '@/lib/oauth';
import {
  clearPendingOAuthLink,
  isOAuthProviderEnabled,
  readPendingOAuthLink,
  writeAutoLink,
  writePendingOAuthLink,
} from '@/lib/oauth-server';

/**
 * Auth server actions.
 *
 * Login and registration both end by calling Auth.js `signIn`, which throws a redirect on
 * success — so the catch block has to let NEXT_REDIRECT through untouched.
 */

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

/**
 * Sign-in and sign-up are the first two screens anyone sees, so they must not answer "wrong
 * password" (or "please try again") when the real problem is that PostgreSQL is not running.
 * Checked once per submit — a single `SELECT 1`.
 */
const DATABASE_DOWN_MESSAGE =
  "ARCH can't reach its database, so sign-in and sign-up are unavailable. If you run ARCH yourself, start PostgreSQL (npm run db:up, or npm run dev) and try again.";

/**
 * The database answers but ARCH's tables are missing or older than the code: migrations were not
 * applied. Typical after `npm run dev:next` / `npm start` / a fresh hosted Postgres, all of which
 * skip the migration step that `npm run dev` performs. `SELECT 1` passes in this state, so it has
 * to be recognised from the failing query instead.
 */
const DATABASE_SCHEMA_MESSAGE =
  "ARCH's database is reachable but its tables are missing or out of date (migrations have not been applied), so accounts can't be created or used yet. If you run ARCH yourself, run npm run db:migrate (npm run dev does this automatically) and try again.";

const DATABASE_PERMISSION_MESSAGE =
  "ARCH's database user is not allowed to read or write ARCH's tables. If you run ARCH yourself, check that DATABASE_URL uses the role that owns the ARCH schema, then try again.";

const DATABASE_BUSY_MESSAGE = 'The database is busy right now. Please wait a moment and try again.';

/** An actionable message for database failures a person (or their operator) can fix, else null. */
function databaseFailureMessage(error: unknown): string | null {
  switch (describeDatabaseError(error).kind) {
    case 'unavailable':
      return DATABASE_DOWN_MESSAGE;
    case 'schema_out_of_date':
      return DATABASE_SCHEMA_MESSAGE;
    case 'permission_denied':
      return DATABASE_PERMISSION_MESSAGE;
    case 'pool_timeout':
      return DATABASE_BUSY_MESSAGE;
    default:
      return null;
  }
}

/**
 * Logs an unexpected auth failure without secrets: error class, Prisma/PostgreSQL codes and the
 * table/column/constraint involved — never the password, the form body or a connection string.
 * The returned id is shown to the user so a report can be matched to this log line.
 */
function logAuthFailure(flow: 'register' | 'login', error: unknown): string {
  const record = safeErrorLog(error);
  console.error(`[${flow}] failed`, JSON.stringify(record));
  return record.errorId;
}

async function databaseIsDown(): Promise<boolean> {
  return !(await isDatabaseReachable());
}

function isRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: string } | null)?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

function rethrowRedirect(error: unknown): void {
  if (isRedirectError(error)) throw error;
}

function fieldErrorsFrom(issues: { path: readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map((segment) => String(segment)).join('.') || 'form';
    result[key] ??= issue.message;
  }
  return result;
}

async function enforceFormRateLimit(key: string, limit: number, windowMs: number): Promise<string | null> {
  const result = rateLimit(key, { limit, windowMs });
  return result.ok ? null : `Too many attempts. Please wait ${result.retryAfterSeconds} seconds, then try again.`;
}

/** Only a known provider id is accepted; anything else is treated as "not offered". */
function parseProvider(value: FormDataEntryValue | null): OAuthProviderId | null {
  return isOAuthProviderId(value) ? value : null;
}

/**
 * Starting a provider sign-in is cheap for us and expensive for the provider, and it is the one
 * auth endpoint that can be triggered without knowing an email address. Twenty starts a minute
 * per IP is far above a real person's clicking speed and far below a script's.
 */
async function oauthStartAllowed(): Promise<boolean> {
  const ip = await requestIp();
  if (!ip) return true;
  return rateLimit(`auth:oauth:ip:${ip}`, { limit: 20, windowMs: 60_000 }).ok;
}

/**
 * Hand the browser over to the provider.
 *
 * Auth.js answers a failed start with its own error page — a raw "Server error" screen that
 * says nothing about what to do. The URL it produced is inspected here so the person is sent
 * back to ARCH's own sign-in screen with a message they can act on instead.
 */
async function startOAuthFlow(
  provider: OAuthProviderId,
  callbackUrl: string,
  returnTo: '/login' | '/register' = '/login',
): Promise<void> {
  let target: string;
  try {
    // `redirect: false` returns the destination instead of throwing it, so it can be inspected.
    target = await signIn(provider, { redirectTo: callbackUrl, redirect: false });
  } catch (error) {
    rethrowRedirect(error);
    // Auth.js already routes provider-side failures to /login?error=…; this catches the
    // failures that happen before the redirect leaves our server (misconfiguration, etc.).
    if (error instanceof AuthError) redirect(`${returnTo}?error=${provider}&provider=${provider}`);
    throw error;
  }
  if (isAuthJsInternalUrl(target)) {
    // The provider could not be reached, or its credentials are wrong.
    await clearPendingOAuthLink();
    redirect(`${returnTo}?error=provider_unavailable&provider=${provider}`);
  }
  redirect(target);
}

/** True for Auth.js' own pages (`/api/auth/…`), which are not part of ARCH's design. */
function isAuthJsInternalUrl(target: string): boolean {
  try {
    return new URL(target, 'http://localhost').pathname.startsWith('/api/auth/');
  } catch {
    return false;
  }
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const callbackUrl = safeAuthCallback(formData.get('callbackUrl'));
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) {
    return { error: 'Please check your email and password.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const email = parsed.data.email;
  const emailLimit = await enforceFormRateLimit(`auth:form:email:${email}`, 10, 60_000);
  if (emailLimit) return { error: emailLimit };
  const ip = await requestIp();
  if (ip) {
    const ipLimit = await enforceFormRateLimit(`auth:form:ip:${ip}`, 30, 60_000);
    if (ipLimit) return { error: ipLimit };
  }
  if (await databaseIsDown()) return { error: DATABASE_DOWN_MESSAGE };
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
    return undefined;
  } catch (error) {
    if (isRedirectError(error)) {
      // The password was accepted. If a provider link was waiting for exactly this moment,
      // finish it now instead of leaving the person with a half-linked account.
      await continuePendingOAuthLink(parsed.data.email);
      throw error;
    }
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') return { error: 'Invalid email or password.' };
      // Auth.js wraps whatever `authorize` threw (e.g. a missing users table) in `cause.err`.
      const cause = (error.cause as { err?: unknown } | undefined)?.err ?? error;
      const databaseMessage = databaseFailureMessage(cause);
      if (databaseMessage) {
        logAuthFailure('login', cause);
        return { error: databaseMessage };
      }
      const errorId = logAuthFailure('login', cause);
      return { error: `Sign-in failed. Please try again. (Error ID: ${errorId})` };
    }
    throw error;
  }
}

/**
 * Finish a provider link that was waiting for a password sign-in.
 *
 * The person tried "Continue with Google", an ARCH account already owned that email address, so
 * Auth.js refused to link them automatically. They have now proved who they are with their
 * password, so the provider can be attached to *this* session — one more click at the provider
 * and they are in, with their account intact.
 *
 * The account that was signed in with is remembered alongside the link, and the provider
 * identity has to match it before the two are joined. Without that check, a provider identity
 * could be attached to whichever account happened to sign in on a shared browser.
 */
async function continuePendingOAuthLink(signedInEmail: string): Promise<void> {
  const pending = await readPendingOAuthLink();
  if (!pending || pending.reason !== 'existing') return;
  if (!isOAuthProviderEnabled(pending.provider)) return;
  const email = signedInEmail.trim().toLowerCase();
  const account = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!account) return;
  await clearPendingOAuthLink();
  await writeAutoLink({ provider: pending.provider, userId: account.id, email, strict: true });
  await startOAuthFlow(pending.provider, pending.callbackUrl);
}

/**
 * "Continue with Google" / "Continue with GitHub" on the sign-in screen.
 *
 * The attempt is remembered in a signed, short-lived cookie so that a refusal — "an ARCH account
 * already uses that email" — can be finished with a single password sign-in instead of a detour
 * through Settings.
 */
export async function oauthSignInAction(formData: FormData): Promise<void> {
  const provider = parseProvider(formData.get('provider'));
  if (!provider) redirect('/login');
  const callbackUrl = safeAuthCallback(formData.get('callbackUrl'));
  // The screen the person came from, so the answer lands where they asked the question.
  const returnTo = formData.get('mode') === 'register' ? '/register' : '/login';
  if (!isOAuthProviderEnabled(provider)) {
    // The button is always offered; an instance without credentials says exactly what to set.
    redirect(`${returnTo}?error=provider_not_configured&provider=${provider}`);
  }
  if (!(await oauthStartAllowed())) {
    redirect(`${returnTo}?error=rate&provider=${provider}`);
  }
  await writePendingOAuthLink({ provider, callbackUrl, reason: 'attempt' });
  await startOAuthFlow(provider, callbackUrl, returnTo);
}

/**
 * Attach a provider to the account that is already signed in (Settings → Sign-in methods).
 *
 * The person asked for this link themselves, so the provider's address does not have to match
 * theirs — but the link may only ever attach to the account they are signed in as.
 */
export async function oauthLinkAction(formData: FormData): Promise<void> {
  const provider = parseProvider(formData.get('provider'));
  if (!provider) redirect('/dashboard/settings');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!isOAuthProviderEnabled(provider)) redirect('/dashboard/settings');
  const callbackUrl = safeAuthCallback(formData.get('callbackUrl') ?? '/dashboard/settings');
  if (!(await oauthStartAllowed())) {
    redirect(`/login?error=rate&provider=${provider}`);
  }
  await writePendingOAuthLink({ provider, callbackUrl, reason: 'attempt' });
  await writeAutoLink({
    provider,
    userId: session.user.id,
    email: (session.user.email ?? '').trim().toLowerCase(),
    strict: false,
  });
  await startOAuthFlow(provider, callbackUrl);
}

/**
 * "Not now" — drop a waiting provider link and carry on to the dashboard.
 */
export async function cancelPendingLinkAction(formData: FormData): Promise<void> {
  await clearPendingOAuthLink();
  const callbackUrl = safeAuthCallback(formData.get('callbackUrl'));
  redirect(callbackUrl);
}

export async function registerAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const callbackUrl = safeAuthCallback(formData.get('callbackUrl'));
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name') || undefined,
    password: formData.get('password'),
    organizationName: formData.get('organizationName') || undefined,
  });

  if (!parsed.success) {
    return { error: 'Please check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const emailLimit = await enforceFormRateLimit(`auth:register:email:${parsed.data.email.toLowerCase()}`, 5, 10 * 60_000);
  if (emailLimit) return { error: emailLimit };
  const ip = await requestIp();
  if (ip) {
    const ipLimit = await enforceFormRateLimit(`auth:register:ip:${ip}`, 20, 10 * 60_000);
    if (ipLimit) return { error: ipLimit };
  }

  if (await databaseIsDown()) return { error: DATABASE_DOWN_MESSAGE };

  try {
    await registerUser({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name ?? null,
      organizationName: parsed.data.organizationName ?? null,
    });
  } catch (error) {
    if (isAppError(error)) {
      if (error.issues) return { error: error.message, fieldErrors: fieldErrorsFrom(error.issues.map((issue) => ({ path: [issue.path], message: issue.message }))) };
      return { error: error.message };
    }
    // Always leave a diagnosable trail on the server. Driver errors can contain connection
    // strings, so the form only ever gets one of the fixed messages below.
    const errorId = logAuthFailure('register', error);
    // Unreachable (dropped since the check above), unmigrated schema, missing privileges, busy pool.
    const databaseMessage = databaseFailureMessage(error);
    if (databaseMessage) return { error: databaseMessage };
    return { error: `Could not create your account. Please try again. If it keeps happening, report Error ID ${errorId}.` };
  }

  // The account exists from here on. If the automatic sign-in fails, send the person to the login
  // page with a success note instead of leaving them on a form that looks like it did nothing.
  try {
    await signIn('credentials', { email: parsed.data.email, password: parsed.data.password, redirectTo: callbackUrl });
    return undefined;
  } catch (error) {
    rethrowRedirect(error);
    redirect(`/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}

export async function goToDashboardAction(): Promise<void> {
  redirect('/dashboard');
}

export { zodIssues };
