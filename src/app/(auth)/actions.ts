'use server';

import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/lib/auth';
import { isDatabaseReachable } from '@/lib/db';
import { describeDatabaseError, safeErrorLog } from '@/lib/db-errors';
import { env } from '@/lib/env';
import { loginSchema, registerSchema } from '@/lib/validation';
import { registerUser } from '@/server/services/auth.service';
import { zodIssues } from '@/lib/api';
import { isAppError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';

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

function rethrowRedirect(error: unknown): void {
  const digest = (error as { digest?: string } | null)?.digest;
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw error;
}

function safeCallbackUrl(value: FormDataEntryValue | null): string {
  const raw = typeof value === 'string' ? value : '';
  // Only allow same-site paths — never an absolute URL from a query parameter.
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
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

async function requestIp(): Promise<string | null> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || requestHeaders.get('x-real-ip')?.trim();
  return ip || null;
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const callbackUrl = safeCallbackUrl(formData.get('callbackUrl'));
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
    rethrowRedirect(error);
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
 * "Continue with GitHub" — starts the OAuth flow. Same redirect discipline as `loginAction`:
 * Auth.js throws a redirect on success, and NEXT_REDIRECT must pass through untouched.
 * Guarded so a provider that is not configured (blank AUTH_GITHUB_ID/SECRET) fails as a clean
 * no-op instead of an AuthError deep inside the callback.
 */
export async function githubLoginAction(formData: FormData): Promise<void> {
  const callbackUrl = safeCallbackUrl(formData.get('callbackUrl'));
  if (!(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET)) redirect('/login');
  try {
    await signIn('github', { redirectTo: callbackUrl });
  } catch (error) {
    rethrowRedirect(error);
    // Auth.js already routes provider-side failures to /login?error=…; this catches the
    // failures that happen before the redirect leaves our server (misconfiguration, etc.).
    if (error instanceof AuthError) redirect('/login?error=github');
    throw error;
  }
}

export async function registerAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const callbackUrl = safeCallbackUrl(formData.get('callbackUrl'));
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
