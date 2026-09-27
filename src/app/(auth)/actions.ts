'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/lib/auth';
import { isDatabaseReachable, isDatabaseUnavailableError } from '@/lib/db';
import { env } from '@/lib/env';
import { registerSchema } from '@/lib/validation';
import { registerUser } from '@/server/services/auth.service';
import { zodIssues } from '@/lib/api';
import { isAppError } from '@/lib/errors';

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

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const callbackUrl = safeCallbackUrl(formData.get('callbackUrl'));
  if (await databaseIsDown()) return { error: DATABASE_DOWN_MESSAGE };
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: callbackUrl,
    });
    return undefined;
  } catch (error) {
    rethrowRedirect(error);
    if (error instanceof AuthError) {
      return { error: error.type === 'CredentialsSignin' ? 'Invalid email or password.' : 'Sign-in failed. Please try again.' };
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
    // The database can drop between the check above and the insert (container restart, failover).
    if (isDatabaseUnavailableError(error)) return { error: DATABASE_DOWN_MESSAGE };
    // Database/driver errors sometimes contain connection strings; never send one to a form.
    console.error('[register] unexpected error', error instanceof Error ? error.name : 'unknown');
    return { error: 'Could not create your account. Please try again.' };
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
