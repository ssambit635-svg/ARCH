import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { safeAuthCallback } from './auth-redirect';
import { env, isProduction } from './env';
import { githubProvider } from './github-oauth';
import { googleProvider, isVerifiedGoogleProfile } from './google-oauth';
import { isOAuthProviderId, OAUTH_PROVIDER_IDS, type OAuthProviderAvailability, type OAuthProviderId } from './oauth';

/**
 * Server-side half of the OAuth engine.
 *
 * Two jobs:
 *   1. Decide which providers this instance actually has credentials for, and build the
 *      Auth.js provider objects for them. A provider without credentials is never registered,
 *      so its button never appears and its callback cannot be reached.
 *   2. Remember a *pending account link* — "the person tried Google, an ARCH account already
 *      owns that email, so they must sign in with their password first and then link Google".
 *      The reminder is a signed, short-lived, httpOnly cookie, never a URL parameter, because
 *      the destination it carries can be a private invitation link.
 */

export const PENDING_LINK_COOKIE = 'arch.oauth.link';
/** Ten minutes: long enough to type a password, short enough not to follow someone later. */
export const PENDING_LINK_MAX_AGE_SECONDS = 600;

export type OAuthProviderCredentials = { clientId: string; clientSecret: string };

/**
 * The credentials of a provider, or null when this instance has not configured it.
 * Both halves must be present: a client id without a secret (or the other way round) is a
 * misconfiguration, not a half-enabled provider.
 */
export function oauthProviderCredentials(id: OAuthProviderId): OAuthProviderCredentials | null {
  if (id === 'google') {
    return env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? { clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }
      : null;
  }
  return env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET
    ? { clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET }
    : null;
}

export function isOAuthProviderEnabled(id: OAuthProviderId): boolean {
  return oauthProviderCredentials(id) !== null;
}

/** The providers this instance may offer, in the order they are shown on the sign-in screen. */
export function enabledOAuthProviders(): OAuthProviderId[] {
  return OAUTH_PROVIDER_IDS.filter(isOAuthProviderEnabled);
}

/** A provider and whether this instance can actually use it. */
export type { OAuthProviderAvailability } from './oauth';

/**
 * Every provider ARCH knows, and whether this instance has credentials for it.
 *
 * The sign-in screen offers all of them either way: a person who sees no "Continue with Google"
 * cannot tell a broken feature from a missing environment file, so the button is always there
 * and the click explains what an unconfigured instance would need.
 */
export function oauthProviderAvailability(): OAuthProviderAvailability[] {
  return OAUTH_PROVIDER_IDS.map((id) => ({ id, configured: isOAuthProviderEnabled(id) }));
}

/**
 * The Auth.js provider objects for every configured provider.
 *
 * Neither provider opts into `allowDangerousEmailAccountLinking`: a Google/GitHub account is
 * only ever attached to an ARCH account that the person proved they own by signing in with
 * their password first.
 */
export function createOAuthProviders() {
  return enabledOAuthProviders().map((id) => {
    const credentials = oauthProviderCredentials(id)!;
    return id === 'google'
      ? googleProvider(credentials.clientId, credentials.clientSecret)
      : githubProvider(credentials.clientId, credentials.clientSecret);
  });
}

/**
 * Why a link is pending.
 *
 * `attempt`  the person asked to sign in with a provider; we do not yet know how it ended.
 * `existing` the provider refused because an ARCH account already owns that email address —
 *            the person now has to sign in with their password before the provider can be
 *            linked. Only this state may continue automatically after a password sign-in.
 */
export type PendingLinkReason = 'attempt' | 'existing';

export type PendingOAuthLink = {
  provider: OAuthProviderId;
  callbackUrl: string;
  reason: PendingLinkReason;
};

/**
 * A provider link that is on its way.
 *
 * It carries the account the link is allowed to attach to, so the provider identity can be
 * checked against it before the two are joined. Without that check, a provider identity could
 * be attached to whichever account happened to sign in on a shared browser.
 */
export type AutoLink = {
  provider: OAuthProviderId;
  /** The ARCH account the provider identity may be attached to. */
  userId: string;
  /** The address that account uses. */
  email: string;
  /**
   * True for the link that continues automatically after a password sign-in: the provider's own
   * address has to be the same one, because nobody chose that pairing — the browser was simply
   * already signed in at the provider.
   *
   * False when the person asked for the link themselves. They proved who they are and may
   * link a provider account that uses a different address on purpose.
   */
  strict: boolean;
};

/** HMAC over the payload so a hand-edited cookie cannot point the link flow elsewhere. */
function sign(value: string): string {
  return createHmac('sha256', env.AUTH_SECRET).update(value).digest('base64url');
}

function encodeSigned(value: unknown): string {
  const payload = Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Verify and decode a signed cookie value. The signature is compared in constant time. */
function decodeSigned<T>(raw: string): T | null {
  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null;
  const payload = raw.slice(0, separator);
  const provided = Buffer.from(raw.slice(separator + 1));
  const expected = Buffer.from(sign(payload));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

/**
 * Decode and verify a pending-link cookie value.
 *
 * The destination is passed through the same same-site guard as every other auth redirect, so a
 * hand-edited cookie cannot send anyone off-site.
 */
export function decodePendingOAuthLink(raw: string): PendingOAuthLink | null {
  const parsed = decodeSigned<Partial<PendingOAuthLink>>(raw);
  if (!parsed || !isOAuthProviderId(parsed.provider)) return null;
  return {
    provider: parsed.provider,
    callbackUrl: typeof parsed.callbackUrl === 'string' ? safeAuthCallback(parsed.callbackUrl) : '/dashboard',
    reason: parsed.reason === 'existing' ? 'existing' : 'attempt',
  };
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  path: '/',
};

/** The provider link that is waiting to be finished, if any. */
export async function readPendingOAuthLink(): Promise<PendingOAuthLink | null> {
  const raw = (await cookies()).get(PENDING_LINK_COOKIE)?.value;
  return raw ? decodePendingOAuthLink(raw) : null;
}

/** Remember that a provider sign-in is being attempted (server action / route handler). */
export async function writePendingOAuthLink(link: PendingOAuthLink): Promise<void> {
  (await cookies()).set(PENDING_LINK_COOKIE, encodeSigned(link), {
    ...COOKIE_OPTIONS,
    maxAge: PENDING_LINK_MAX_AGE_SECONDS,
  });
}

/** Forget a waiting provider link. */
export async function clearPendingOAuthLink(): Promise<void> {
  (await cookies()).set(PENDING_LINK_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

export const AUTO_LINK_COOKIE = 'arch.oauth.autolink';
/** Five minutes: only the round trip to the provider and back. */
export const AUTO_LINK_MAX_AGE_SECONDS = 300;

/** Remember which account a provider link is allowed to attach to. */
export async function writeAutoLink(link: AutoLink): Promise<void> {
  (await cookies()).set(AUTO_LINK_COOKIE, encodeSigned(link), {
    ...COOKIE_OPTIONS,
    maxAge: AUTO_LINK_MAX_AGE_SECONDS,
  });
}

/** The account a provider link is allowed to attach to, if one is on its way. */
export async function readAutoLink(): Promise<AutoLink | null> {
  try {
    const raw = (await cookies()).get(AUTO_LINK_COOKIE)?.value;
    if (!raw) return null;
    const parsed = decodeSigned<Partial<AutoLink>>(raw);
    if (!parsed || !isOAuthProviderId(parsed.provider)) return null;
    if (typeof parsed.email !== 'string' || typeof parsed.userId !== 'string') return null;
    return {
      provider: parsed.provider,
      email: parsed.email.trim().toLowerCase(),
      userId: parsed.userId,
      strict: parsed.strict === true,
    };
  } catch {
    // No request scope, no marker: the link is simply not checked against one.
    return null;
  }
}

/** Forget the continuing link. Best effort: never worth failing a sign-in over. */
export async function clearAutoLink(): Promise<void> {
  try {
    (await cookies()).set(AUTO_LINK_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  } catch {
    // ignore — the marker expires on its own
  }
}

/**
 * Whether a provider identity may be attached to the account that just signed in.
 *
 * The provider has to be the one that was asked for, and its verified address has to be the
 * address that was signed in with. A provider identity is never attached to a different
 * account, so a link that continues automatically cannot end up on somebody else's account.
 */
export function autoLinkMatches(autoLink: AutoLink, provider: OAuthProviderId, profile: unknown): boolean {
  if (autoLink.provider !== provider) return false;
  const email = (profile as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' && email.trim().toLowerCase() === autoLink.email.toLowerCase();
}

/** A `Set-Cookie` header value that removes the pending link. */
export function autoLinkClearCookie(): string {
  return serializeCookie(AUTO_LINK_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

/**
 * A `Set-Cookie` header value for the pending link.
 *
 * The route handler that wraps the Auth.js callback needs to set this on a response it did not
 * build itself, so the value is produced here instead of through `next/headers`.
 */
export function pendingLinkSetCookie(link: PendingOAuthLink): string {
  return serializeCookie(PENDING_LINK_COOKIE, encodeSigned(link), {
    ...COOKIE_OPTIONS,
    maxAge: PENDING_LINK_MAX_AGE_SECONDS,
  });
}

/** A `Set-Cookie` header value that removes the pending link. */
export function pendingLinkClearCookie(): string {
  return serializeCookie(PENDING_LINK_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

function serializeCookie(
  name: string,
  value: string,
  options: { maxAge: number; path: string; httpOnly: boolean; sameSite: 'lax'; secure: boolean },
): string {
  const parts = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite.charAt(0).toUpperCase()}${options.sameSite.slice(1)}`,
  ];
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * The provider an Auth.js callback URL belongs to, or null when the request is not a provider
 * callback. Only `/api/auth/callback/<provider>` qualifies.
 */
export function oauthProviderFromCallbackPath(url: string): OAuthProviderId | null {
  let pathname: string;
  try {
    pathname = new URL(url, 'http://localhost').pathname;
  } catch {
    return null;
  }
  const match = /^\/api\/auth\/callback\/([^/]+)\/?$/.exec(pathname);
  return match && isOAuthProviderId(match[1]) ? match[1] : null;
}

/**
 * The single gate every OAuth identity passes before ARCH accepts it.
 *
 * Google reports whether it verified the address (`email_verified` in the ID token). GitHub's
 * address was already taken from a verified `/user/emails` entry, so an empty email there means
 * the identity could not be verified. An unverifiable identity never becomes an ARCH account.
 */
export function isVerifiedOAuthIdentity(provider: OAuthProviderId, profile: unknown): boolean {
  if (provider === 'google') return isVerifiedGoogleProfile(profile);
  const email = (profile as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' && email.trim().length > 0;
}
