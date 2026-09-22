'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { registerUser } from '@/server/services/auth.service';
import { zodIssues } from '@/lib/api';

/**
 * Auth server actions.
 *
 * Login and registration both end by calling Auth.js `signIn`, which throws a redirect on
 * success — so the catch block has to let NEXT_REDIRECT through untouched.
 */

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

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

export async function registerAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name') || undefined,
    password: formData.get('password'),
    organizationName: formData.get('organizationName') || undefined,
  });

  if (!parsed.success) {
    return { error: 'Please check the form.', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await registerUser({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name ?? null,
      organizationName: parsed.data.organizationName ?? null,
    });
  } catch (error) {
    const appError = error as { code?: string; message?: string; issues?: { path: string; message: string }[] };
    if (appError.issues) return { error: appError.message, fieldErrors: fieldErrorsFrom(appError.issues.map((issue) => ({ path: [issue.path], message: issue.message }))) };
    return { error: appError.message ?? 'Could not create your account.' };
  }

  try {
    await signIn('credentials', { email: parsed.data.email, password: parsed.data.password, redirectTo: '/dashboard' });
    return undefined;
  } catch (error) {
    rethrowRedirect(error);
    return { error: 'Account created — please sign in.' };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}

export async function goToDashboardAction(): Promise<void> {
  redirect('/dashboard');
}

export { zodIssues };
