import { OAUTH_PROVIDERS, oauthProviderSetupHint, type OAuthProviderId } from './oauth';

/**
 * What went wrong, in the words of someone who just wants to get in.
 *
 * The provider is named when we know it: the Auth.js callback redirects carry it, and a waiting
 * link remembers it. Nothing here says whether an account exists — that would tell a stranger
 * which email addresses are registered.
 *
 * Pure and client-safe: the sign-in and sign-up screens both render it.
 */
export function oauthErrorMessage(
  code: string | undefined,
  provider: OAuthProviderId | undefined,
): string | undefined {
  if (!code) return undefined;
  const name = provider ? OAUTH_PROVIDERS[provider].name : undefined;
  switch (code) {
    case 'provider_not_configured':
      return name
        ? `${name} sign-in is not set up on this instance. ${oauthProviderSetupHint(provider!)}`
        : 'That sign-in method is not set up on this instance.';
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
