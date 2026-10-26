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
