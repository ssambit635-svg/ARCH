import { createSign, generateKeyPairSync, randomUUID } from 'node:crypto';
import { Auth, type AuthConfig } from '@auth/core';
import { encode } from '@auth/core/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authAdapter } from '@/lib/auth-adapter';
import { googleProvider } from '@/lib/google-oauth';
import { isVerifiedOAuthIdentity } from '@/lib/oauth-server';
import { db, resetDatabase } from './helpers/db';

/**
 * Google's OpenID Connect flow, end to end.
 *
 * Google's endpoints are simulated — including a genuinely signed ID token and its JWKS — but
 * Auth.js' OIDC handling, state/PKCE checks, the Prisma adapter, the JWT session and the
 * database are all real. Nothing here reaches the network.
 */
const ISSUER = 'https://accounts.google.com';
const CLIENT_ID = 'fake-google-client-id';
const CLIENT_SECRET = 'fake-google-client-secret';
const origin = 'http://localhost:3000';
const secret = 'integration-test-secret-at-least-32-characters';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const keyId = 'arch-google-test-key';
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: keyId, alg: 'RS256', use: 'sig' };

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

/** A real RS256 signature: the ID token has to survive Auth.js' issuer/audience/JWKS checks. */
function signIdToken(claims: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT', kid: keyId };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

function idTokenClaims(params: { email: string; emailVerified: boolean; subject: string }) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: ISSUER,
    aud: CLIENT_ID,
    sub: params.subject,
    email: params.email,
    email_verified: params.emailVerified,
    name: 'Google User',
    picture: 'https://example.com/avatar.png',
    iat: now,
    exp: now + 3600,
  };
}

function mockGoogleEndpoints(params: { email: string; emailVerified: boolean; subject: string }) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/.well-known/openid-configuration')) {
      return Response.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/o/oauth2/v2/auth`,
        token_endpoint: `${ISSUER}/token`,
        userinfo_endpoint: `${ISSUER}/v1/userinfo`,
        jwks_uri: `${ISSUER}/jwks`,
        id_token_signing_alg_values_supported: ['RS256'],
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
      });
    }
    if (url.endsWith('/jwks')) {
      return Response.json({ keys: [jwk] });
    }
    if (url.endsWith('/token')) {
      return Response.json({
        access_token: 'mocked-google-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: signIdToken(idTokenClaims(params)),
      });
    }
    throw new Error(`Unexpected OAuth network request: ${url}`);
  });
}

const config: AuthConfig = {
  basePath: '/api/auth',
  trustHost: true,
  secret,
  adapter: authAdapter,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [googleProvider(CLIENT_ID, CLIENT_SECRET)],
  events: {
    async createUser({ user }) {
      await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || account.provider !== 'google') return true;
      return isVerifiedOAuthIdentity('google', profile);
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
};

function collectCookies(response: Response, jar: Map<string, string>) {
  for (const raw of response.headers.getSetCookie()) {
    const pair = raw.split(';')[0] ?? '';
    const [name, ...value] = pair.split('=');
    jar.set(name!, value.join('='));
  }
}
function cookieHeader(jar: Map<string, string>) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function oauthRoundTrip(params: {
  email: string;
  emailVerified?: boolean;
  subject?: string;
  signedInAs?: string;
}) {
  const jar = new Map<string, string>();
  if (params.signedInAs) {
    const sessionToken = await encode({
      token: { sub: params.signedInAs },
      secret,
      salt: 'authjs.session-token',
    });
    jar.set('authjs.session-token', sessionToken);
  }

  const fetchMock = mockGoogleEndpoints({
    email: params.email,
    emailVerified: params.emailVerified ?? true,
    subject: params.subject ?? 'google-subject-1',
  });
  vi.stubGlobal('fetch', fetchMock);

  const csrfResponse = await Auth(new Request(`${origin}/api/auth/csrf`, { headers: { cookie: cookieHeader(jar) } }), config);
  collectCookies(csrfResponse, jar);
  const { csrfToken } = await csrfResponse.json();
  const authorize = await Auth(new Request(`${origin}/api/auth/signin/google`, {
    method: 'POST',
    headers: { cookie: cookieHeader(jar), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, callbackUrl: '/dashboard' }),
  }), config);
  collectCookies(authorize, jar);
  expect(authorize.status).toBe(302);
  const url = new URL(authorize.headers.get('location')!);
  const state = url.searchParams.get('state')!;

  const callback = await Auth(new Request(`${origin}/api/auth/callback/google?${new URLSearchParams({ code: 'fake-code', state })}`, {
    headers: { cookie: cookieHeader(jar) },
  }), config);
  collectCookies(callback, jar);
  const sessionResponse = await Auth(new Request(`${origin}/api/auth/session`, { headers: { cookie: cookieHeader(jar) } }), config);
  return { location: callback.headers.get('location'), session: await sessionResponse.json(), fetchMock, authorizeUrl: url };
}

describe('Google OAuth end-to-end (simulated Google, real DB and Auth.js)', () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it('creates a verified new user, stores only the provider id, and issues a local-user JWT', async () => {
    const email = `google-new-${randomUUID()}@example.com`;
    const { location, session } = await oauthRoundTrip({ email, subject: 'google-1001' });
    expect(location).toBe(`${origin}/dashboard`);
    const user = await db.user.findUniqueOrThrow({ where: { email }, include: { accounts: true } });
    expect(user.emailVerified).not.toBeNull();
    expect(session.user.id).toBe(user.id);
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0]?.provider).toBe('google');
    expect(user.accounts[0]?.providerAccountId).toBe('google-1001');
    // The OAuth tokens are never written down.
    expect(user.accounts[0]?.access_token).toBeNull();
    expect(user.accounts[0]?.refresh_token).toBeNull();
    expect(user.accounts[0]?.id_token).toBeNull();
  });

  it('uses PKCE and a state parameter, and never asks Google for more than sign-in', async () => {
    const { authorizeUrl } = await oauthRoundTrip({ email: `google-pkce-${randomUUID()}@example.com` });
    expect(authorizeUrl.origin).toBe('https://accounts.google.com');
    expect(authorizeUrl.searchParams.get('code_challenge')).toBeTruthy();
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizeUrl.searchParams.get('state')).toBeTruthy();
    expect(authorizeUrl.searchParams.get('scope')).toBe('openid profile email');
    expect(authorizeUrl.searchParams.get('access_type')).toBeNull();
  });

  it('refuses an unverified Google address instead of creating an account', async () => {
    const email = `google-unverified-${randomUUID()}@example.com`;
    const result = await oauthRoundTrip({ email, emailVerified: false });
    expect(result.location).not.toBe(`${origin}/dashboard`);
    expect(result.location).toContain('error=AccessDenied');
    expect(await db.user.findUnique({ where: { email } })).toBeNull();
    expect(await db.account.count({ where: { provider: 'google' } })).toBe(0);
  });

  it('refuses a matching password email unless the owner explicitly links while signed in', async () => {
    const email = `google-existing-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email, passwordHash: 'password-account' } });

    const refused = await oauthRoundTrip({ email, subject: 'google-2002' });
    expect(refused.location).toContain('error=OAuthAccountNotLinked');
    expect(await db.account.count({ where: { provider: 'google', providerAccountId: 'google-2002' } })).toBe(0);

    const linked = await oauthRoundTrip({ email, subject: 'google-2002', signedInAs: user.id });
    expect(linked.location).toBe(`${origin}/dashboard`);
    expect(linked.session.user.id).toBe(user.id);
    expect(await db.account.count({ where: { provider: 'google', providerAccountId: 'google-2002', userId: user.id } })).toBe(1);

    const subsequent = await oauthRoundTrip({ email, subject: 'google-2002' });
    expect(subsequent.session.user.id).toBe(user.id);
  });
});
