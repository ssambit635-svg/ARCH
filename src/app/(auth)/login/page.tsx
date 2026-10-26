import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { safeAuthCallback } from '@/lib/auth-redirect';
import { LoginForm } from '@/components/auth/forms';
import { ArrowIcon } from '@/components/auth/icons';
import { cancelPendingLinkAction, loginAction, oauthLinkAction, oauthSignInAction } from '../actions';
import { oauthProviderAvailability, readPendingOAuthLink } from '@/lib/oauth-server';
import { oauthErrorMessage } from '@/lib/oauth-messages';
import { isOAuthProviderId, OAUTH_PROVIDERS, type OAuthProviderId } from '@/lib/oauth';

export const metadata: Metadata = { title: 'Sign in' };

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

  // Every provider ARCH knows is offered, configured or not: a missing "Continue with Google"
  // is impossible to tell apart from a broken feature, so the button is always there and an
  // unconfigured instance explains itself when the button is pressed.
  const oauthProviders = oauthProviderAvailability();
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
      oauthAction={oauthSignInAction}
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
