import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { safeAuthCallback } from '@/lib/auth-redirect';
import { LoginForm } from '@/components/auth/forms';
import { ArrowIcon } from '@/components/auth/icons';
import { cancelPendingLinkAction, loginAction, oauthLinkAction, oauthSignInAction } from '../actions';
import { enabledOAuthProviders, readPendingOAuthLink } from '@/lib/oauth-server';
import { isOAuthProviderId, OAUTH_PROVIDERS, type OAuthProviderId } from '@/lib/oauth';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * What went wrong, in the words of someone who just wants to get in.
 *
 * The provider is named when we know it: the Auth.js callback redirects carry it, and a waiting
 * link remembers it. Nothing here says whether an account exists — that would tell a stranger
 * which email addresses are registered.
 */
function oauthErrorMessage(code: string | undefined, provider: OAuthProviderId | undefined): string | undefined {
  if (!code) return undefined;
  const name = provider ? OAUTH_PROVIDERS[provider].name : undefined;
  switch (code) {
    case 'OAuthAccountNotLinked':
      return name
        ? `An ARCH account already uses that email address. Sign in with your password and we will link ${name} in one step.`
        : 'An ARCH account already uses that email address. Sign in with your password first, then link the provider in Settings.';
    case 'AccessDenied':
      return name
        ? `${name} would not let this account in. Check that it has a verified email address, or sign in with your email and password.`
        : 'That account was not allowed to sign in. Check that it has a verified email address, or sign in with your email and password.';
    case 'OAuthProfileError':
      return name
        ? `${name} sign-in didn’t complete. Make sure the account has a verified email address, or sign in with your email and password.`
        : 'That sign-in did not complete. Make sure the account has a verified email address, or sign in with your email and password.';
    case 'account_mismatch':
      return name
        ? `That ${name} account uses a different email address than the account you signed in with, so nothing was changed. Sign in with the matching address to link them.`
        : 'That provider account uses a different email address than the account you signed in with, so nothing was changed.';
    case 'Configuration':
      return `${name ?? 'This sign-in method'} is not available on this instance. Use your email and password, or contact your administrator.`;
    case 'rate':
      return 'Too many sign-in attempts just now. Please wait a moment and try again.';
    case 'provider_unavailable':
      return name
        ? `${name} sign-in could not start — the provider could not be reached. Please try again in a moment, or sign in with your email and password.`
        : 'That sign-in could not start — the provider could not be reached. Please try again in a moment, or sign in with your email and password.';
    case 'google':
    case 'github':
      return `${name ?? 'That provider'} sign-in could not start. Try again, or sign in with your email and password.`;
    default:
      return 'Sign-in failed. Please try again, or sign in with your email and password.';
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
    registered?: string | string[];
    provider?: string | string[];
  }>;
}) {
  const { callbackUrl, error, registered, provider } = await searchParams;
  const errorCode = typeof error === 'string' && error ? error : undefined;
  const providerParam = Array.isArray(provider) ? provider[0] : provider;
  const providerCode = isOAuthProviderId(providerParam) ? providerParam : undefined;

  // A provider sign-in that was refused because an ARCH account already owns that email leaves
  // a short-lived, signed note behind: the password form can finish the link in one step.
  const pending = await readPendingOAuthLink();
  const linkProvider = pending?.reason === 'existing' ? pending.provider : undefined;

  const user = await currentUser();
  const rawCallback = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  const safeCallback = rawCallback ? safeAuthCallback(rawCallback) : (pending?.callbackUrl ?? '/dashboard');
  if (user && !errorCode) redirect(safeCallback);

  // Never advertise an OAuth provider that this self-hosted instance has not configured.
  const oauthProviders = enabledOAuthProviders();
  const oauthError = oauthErrorMessage(errorCode, providerCode ?? linkProvider);

  if (user) {
    const failedProvider = providerCode ?? linkProvider;
    return (
      <div className="auth-form-stack">
        <div className="auth-intro">
          <p className="auth-eyebrow">Account connection</p>
          <h1 className="auth-heading">
            Let’s try that again<span>.</span>
          </h1>
          <p className="auth-subheading">
            You’re signed in, but your {failedProvider ? OAUTH_PROVIDERS[failedProvider].name : 'provider'} account could not be connected.
          </p>
        </div>
        <div className="auth-alert auth-alert--error" role="alert">
          {oauthError}
        </div>
        {failedProvider ? (
          <form action={oauthLinkAction}>
            <input type="hidden" name="provider" value={failedProvider} />
            <input type="hidden" name="callbackUrl" value="/dashboard/settings" />
            <button type="submit" className="auth-submit-ink">
              Try connecting {OAUTH_PROVIDERS[failedProvider].name} again
            </button>
          </form>
        ) : null}
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
      oauthAction={oauthProviders.length > 0 ? oauthSignInAction : undefined}
      oauthProviders={oauthProviders}
      oauthError={oauthError}
      successMessage={
        registered === '1'
          ? 'Account created. Sign in with the password you just chose.'
          : undefined
      }
      linkProvider={linkProvider}
      cancelLinkAction={linkProvider ? cancelPendingLinkAction : undefined}
    />
  );
}
