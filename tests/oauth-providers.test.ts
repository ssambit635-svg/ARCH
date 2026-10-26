import { describe, expect, it, vi } from 'vitest';
import { isOAuthProviderId, OAUTH_PROVIDER_IDS, OAUTH_PROVIDERS } from '@/lib/oauth';
import { githubProvider } from '@/lib/github-oauth';
import { googleProvider, isVerifiedGoogleProfile, verifiedGoogleEmail } from '@/lib/google-oauth';
import {
  autoLinkMatches,
  decodePendingOAuthLink,
  isVerifiedOAuthIdentity,
  oauthProviderFromCallbackPath,
  pendingLinkSetCookie,
} from '@/lib/oauth-server';

describe('OAuth provider registry', () => {
  it('knows exactly two providers and refuses anything else', () => {
    expect(OAUTH_PROVIDER_IDS).toEqual(['google', 'github']);
    expect(OAUTH_PROVIDERS.google.buttonLabel).toBe('Continue with Google');
    expect(OAUTH_PROVIDERS.github.buttonLabel).toBe('Continue with GitHub');
    for (const value of ['google', 'github']) expect(isOAuthProviderId(value)).toBe(true);
    for (const value of ['toString', 'constructor', 'GOOGLE', '', null, undefined, 42, {}]) {
      expect(isOAuthProviderId(value)).toBe(false);
    }
  });

  it('enables a provider only when both halves of its credentials are present', async () => {
    vi.stubEnv('AUTH_GOOGLE_ID', 'client-id');
    vi.stubEnv('AUTH_GOOGLE_SECRET', '');
    vi.resetModules();
    const half = await import('@/lib/oauth-server');
    expect(half.oauthProviderCredentials('google')).toBeNull();
    expect(half.enabledOAuthProviders()).not.toContain('google');

    vi.stubEnv('AUTH_GOOGLE_SECRET', 'client-secret');
    vi.resetModules();
    const whole = await import('@/lib/oauth-server');
    expect(whole.oauthProviderCredentials('google')).toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret',
    });
    expect(whole.enabledOAuthProviders()).toContain('google');
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe('Google identity rules', () => {
  it('accepts only an address Google itself verified', () => {
    expect(isVerifiedGoogleProfile({ email: 'person@example.com', email_verified: true })).toBe(true);
    expect(isVerifiedGoogleProfile({ email: 'person@example.com', email_verified: 'true' })).toBe(true);
    expect(isVerifiedGoogleProfile({ email: 'person@example.com', email_verified: false })).toBe(false);
    expect(isVerifiedGoogleProfile({ email: 'person@example.com' })).toBe(false);
    expect(isVerifiedGoogleProfile({ email_verified: true })).toBe(false);
    expect(isVerifiedGoogleProfile({ email: 'not-an-email', email_verified: true })).toBe(false);
    expect(isVerifiedGoogleProfile(null)).toBe(false);
    expect(verifiedGoogleEmail({ email: 'Person@Example.com', email_verified: true })).toBe('person@example.com');
    expect(verifiedGoogleEmail({ email: 'person@example.com', email_verified: false })).toBeNull();
  });

  it('never links an account just because the email matches', () => {
    expect(googleProvider('client-id', 'client-secret').options?.allowDangerousEmailAccountLinking).toBeUndefined();
    expect(githubProvider('client-id', 'client-secret').options?.allowDangerousEmailAccountLinking).toBeUndefined();
  });

  it('uses PKCE and the state parameter for both providers', () => {
    for (const provider of [googleProvider('id', 'secret'), githubProvider('id', 'secret')]) {
      expect(provider.options?.checks).toEqual(['pkce', 'state']);
    }
  });

  it('asks Google for the sign-in scope only, and lets people pick an account', () => {
    const provider = googleProvider('client-id', 'client-secret');
    expect(provider.options?.authorization?.params?.prompt).toBe('select_account');
    expect(provider.options?.authorization?.params?.access_type).toBeUndefined();
    expect(provider.options?.authorization?.params?.scope).toBe('openid profile email');
  });

  it('names Google’s authorization endpoint, so starting a sign-in needs no lookup', () => {
    const provider = googleProvider('client-id', 'client-secret');
    // Without an explicit endpoint, Auth.js fetches Google's discovery document on every
    // sign-in — one more request that can be slow or unavailable, and the sign-in dies before
    // it has even started.
    expect(provider.options?.authorization?.url).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(provider.issuer).toBe('https://accounts.google.com');
  });
});

describe('the single identity gate', () => {
  it('refuses an unverified Google address and an unverifiable GitHub identity', () => {
    expect(isVerifiedOAuthIdentity('google', { email: 'a@example.com', email_verified: true })).toBe(true);
    expect(isVerifiedOAuthIdentity('google', { email: 'a@example.com', email_verified: false })).toBe(false);
    expect(isVerifiedOAuthIdentity('github', { email: 'a@example.com' })).toBe(true);
    expect(isVerifiedOAuthIdentity('github', { email: '' })).toBe(false);
    expect(isVerifiedOAuthIdentity('github', undefined)).toBe(false);
  });
});

describe('the pending account link', () => {
  it('is signed, so a hand-edited cookie is refused', () => {
    const cookie = pendingLinkSetCookie({ provider: 'google', callbackUrl: '/dashboard', reason: 'existing' });
    const value = cookie.split(';')[0]!.split('=')[1]!;
    expect(decodePendingOAuthLink(value)).toEqual({
      provider: 'google',
      callbackUrl: '/dashboard',
      reason: 'existing',
    });
    expect(decodePendingOAuthLink(`${value.slice(0, -1)}x`)).toBeNull();
    expect(decodePendingOAuthLink('google./dashboard')).toBeNull();
    expect(decodePendingOAuthLink('')).toBeNull();
  });

  it('keeps the destination on this site', () => {
    const cookie = pendingLinkSetCookie({
      provider: 'github',
      callbackUrl: 'https://evil.example.com/steal',
      reason: 'attempt',
    });
    const value = cookie.split(';')[0]!.split('=')[1]!;
    expect(decodePendingOAuthLink(value)?.callbackUrl).toBe('/dashboard');
  });

  it('is httpOnly and short-lived', () => {
    const cookie = pendingLinkSetCookie({ provider: 'google', callbackUrl: '/dashboard', reason: 'attempt' });
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toMatch(/Max-Age=600/);
  });
});

describe('the provider callback path', () => {
  it('only recognises a real provider callback', () => {
    expect(oauthProviderFromCallbackPath('http://localhost:3000/api/auth/callback/google')).toBe('google');
    expect(oauthProviderFromCallbackPath('http://localhost:3000/api/auth/callback/github')).toBe('github');
    expect(oauthProviderFromCallbackPath('http://localhost:3000/api/auth/callback/unknown')).toBeNull();
    expect(oauthProviderFromCallbackPath('http://localhost:3000/api/auth/signin/github')).toBeNull();
    expect(oauthProviderFromCallbackPath('http://localhost:3000/api/auth/callback/github/extra')).toBeNull();
    expect(oauthProviderFromCallbackPath('not a url at all')).toBeNull();
  });
});

describe('a link that continues after a password sign-in', () => {
  const autoLink = {
    provider: 'google' as const,
    userId: 'user_1',
    email: 'person@example.com',
    strict: true,
  };

  it('only attaches the provider to the very address that was signed in with', () => {
    expect(autoLinkMatches(autoLink, 'google', { email: 'person@example.com' })).toBe(true);
    expect(autoLinkMatches(autoLink, 'google', { email: 'Person@Example.com' })).toBe(true);
    // A different provider, a different address, or no address at all: never attached.
    expect(autoLinkMatches(autoLink, 'github', { email: 'person@example.com' })).toBe(false);
    expect(autoLinkMatches(autoLink, 'google', { email: 'someone-else@example.com' })).toBe(false);
    expect(autoLinkMatches(autoLink, 'google', {})).toBe(false);
    expect(autoLinkMatches(autoLink, 'google', undefined)).toBe(false);
  });
});
