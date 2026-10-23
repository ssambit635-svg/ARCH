import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { env } from '@/lib/env';
import { safeAuthCallback } from '@/lib/auth-redirect';
import { LoginForm } from '@/components/auth/forms';
import { ArrowIcon } from '@/components/auth/icons';
import { githubLoginAction, loginAction } from '../actions';

export const metadata: Metadata = { title: 'Sign in' };

/** A Map also treats ?error=toString (and other inherited object keys) as an unknown error. */
const OAUTH_ERROR_MESSAGES = new Map([
  ['github', "GitHub sign-in didn't complete. Try again, or sign in with your email and password."],
  [
    'AccessDenied',
    'That GitHub account was not allowed to sign in. Check that it has a verified email.',
  ],
  [
    'OAuthAccountNotLinked',
    'An ARCH account already uses that email. Sign in with your password first, then link GitHub in Settings.',
  ],
  [
    'Configuration',
    'GitHub sign-in is unavailable on this instance. Contact your administrator, or use your email and password.',
  ],
]);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
    registered?: string | string[];
  }>;
}) {
  const { callbackUrl, error, registered } = await searchParams;
  const safeCallback = safeAuthCallback(callbackUrl);
  const errorCode = typeof error === 'string' && error ? error : undefined;
  const user = await currentUser();
  if (user && !errorCode) redirect(safeCallback);

  // Never advertise an OAuth provider that this self-hosted instance has not configured.
  const githubEnabled = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
  const oauthError = errorCode
    ? (OAUTH_ERROR_MESSAGES.get(errorCode) ??
      'Sign-in failed. Please try again or use your email and password.')
    : undefined;

  if (user) {
    return (
      <div className="auth-form-stack">
        <div className="auth-intro">
          <p className="auth-eyebrow">Account connection</p>
          <h1 className="auth-heading">
            Let’s try that again<span>.</span>
          </h1>
          <p className="auth-subheading">
            You’re signed in, but your GitHub account could not be connected.
          </p>
        </div>
        <div className="auth-alert auth-alert--error" role="alert">
          {oauthError}
        </div>
        <Link href="/dashboard/settings" className="auth-switch-link">
          Return to Settings <ArrowIcon />
        </Link>
      </div>
    );
  }

  return (
    <LoginForm
      callbackUrl={safeCallback}
      loginAction={loginAction}
      githubAction={githubEnabled ? githubLoginAction : undefined}
      oauthError={oauthError}
      successMessage={
        registered === '1'
          ? 'Account created. Sign in with the password you just chose.'
          : undefined
      }
    />
  );
}
