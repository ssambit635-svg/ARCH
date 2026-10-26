/**
 * OAuth provider registry.
 *
 * Pure data and pure helpers only. This module is imported by the server *and* by the client
 * sign-in form, so it must never touch `next/headers`, the database or the environment. The
 * server-side wiring (credentials, providers, pending-link cookie) lives in
 * `src/lib/oauth-server.ts`.
 */

export const OAUTH_PROVIDER_IDS = ['google', 'github'] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export type OAuthProviderDescriptor = {
  id: OAuthProviderId;
  /** The name people know the provider by. */
  name: string;
  /** The label on the sign-in button. */
  buttonLabel: string;
  /** One line explaining what the provider is used for on the sign-in screen. */
  purpose: string;
};

/**
 * A provider and whether this instance can actually use it.
 *
 * Lives here, not in the server module, because the sign-in form is a client component.
 */
export type OAuthProviderAvailability = { id: OAuthProviderId; configured: boolean };

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProviderDescriptor> = {
  google: {
    id: 'google',
    name: 'Google',
    buttonLabel: 'Continue with Google',
    purpose: 'Sign in with a verified Google account.',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    buttonLabel: 'Continue with GitHub',
    purpose: 'Sign in with a verified GitHub account.',
  },
};

/**
 * Narrows an untrusted value (form field, URL segment, cookie) to a known provider.
 * Anything else — including inherited object keys such as "toString" — is rejected.
 */
export function isOAuthProviderId(value: unknown): value is OAuthProviderId {
  return typeof value === 'string' && (OAUTH_PROVIDER_IDS as readonly string[]).includes(value);
}

export function oauthProviderName(id: OAuthProviderId): string {
  return OAUTH_PROVIDERS[id].name;
}

/**
 * The environment variables a provider needs before this instance can use it.
 *
 * GitHub needs both halves. Google needs a client id; the secret belongs to a client created
 * as a *Web application* — a *Single page application* client has none and is protected by
 * PKCE instead.
 */
export const OAUTH_PROVIDER_ENV: Record<OAuthProviderId, readonly [string, string]> = {
  google: ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'],
  github: ['AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET'],
};

/** The one line that tells an operator what to set for a provider this instance does not have. */
export function oauthProviderSetupHint(id: OAuthProviderId): string {
  const [idVariable, secretVariable] = OAUTH_PROVIDER_ENV[id];
  if (id === 'google') {
    return `Add ${idVariable} to the environment (and ${secretVariable} for a Web application client), then restart.`;
  }
  return `Add ${idVariable} and ${secretVariable} to the environment and restart.`;
}
