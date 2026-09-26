import { randomUUID } from 'node:crypto';
import { Auth, type AuthConfig } from '@auth/core';
import { encode } from '@auth/core/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authAdapter } from '@/lib/auth-adapter';
import { githubProvider } from '@/lib/github-oauth';
import { db, resetDatabase } from './helpers/db';

/** GitHub calls are fake, but Auth.js OAuth state/PKCE, adapter, JWT and DB are all real. */
const origin = 'http://localhost:3000';
const secret = 'integration-test-secret-at-least-32-characters';
const config: AuthConfig = {
  basePath: '/api/auth',
  trustHost: true,
  secret,
  adapter: authAdapter,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [githubProvider('fake-client-id', 'fake-client-secret')],
  events: {
    async createUser({ user }) {
      await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    },
  },
  callbacks: {
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

async function oauthRoundTrip(params: { email: string; githubId: number; verified?: boolean; signedInAs?: string }) {
  const jar = new Map<string, string>();
  if (params.signedInAs) {
    const sessionToken = await encode({
      token: { sub: params.signedInAs }, secret, salt: 'authjs.session-token',
    });
    jar.set('authjs.session-token', sessionToken);
  }

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/login/oauth/access_token')) {
      return new Response(JSON.stringify({ access_token: 'mocked-access-token', token_type: 'bearer', scope: 'read:user user:email' }), {
        status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
    if (url.endsWith('/user/emails')) {
      return Response.json([{ email: params.email, primary: true, verified: params.verified ?? true }]);
    }
    if (url.endsWith('/user')) {
      return Response.json({ id: params.githubId, login: 'fake-user', email: null, name: 'Fake User', avatar_url: null });
    }
    throw new Error('Unexpected OAuth network request');
  });
  vi.stubGlobal('fetch', fetchMock);

  const csrfResponse = await Auth(new Request(`${origin}/api/auth/csrf`, { headers: { cookie: cookieHeader(jar) } }), config);
  collectCookies(csrfResponse, jar);
  const { csrfToken } = await csrfResponse.json();
  const authorize = await Auth(new Request(`${origin}/api/auth/signin/github`, {
    method: 'POST',
    headers: { cookie: cookieHeader(jar), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, callbackUrl: '/dashboard' }),
  }), config);
  collectCookies(authorize, jar);
  expect(authorize.status).toBe(302);
  const url = new URL(authorize.headers.get('location')!);
  expect(url.origin).toBe('https://github.com');
  const state = url.searchParams.get('state')!;

  const callback = await Auth(new Request(`${origin}/api/auth/callback/github?${new URLSearchParams({ code: 'fake-code', state })}`, {
    headers: { cookie: cookieHeader(jar) },
  }), config);
  collectCookies(callback, jar);
  const sessionResponse = await Auth(new Request(`${origin}/api/auth/session`, { headers: { cookie: cookieHeader(jar) } }), config);
  return { location: callback.headers.get('location'), session: await sessionResponse.json(), fetchMock };
}

describe('GitHub OAuth end-to-end (simulated GitHub, real DB and Auth.js)', () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it('creates a verified new user, stores only the provider id, and issues a local-user JWT', async () => {
    const email = `oauth-new-${randomUUID()}@example.com`;
    const githubId = 800001;
    const { location, session, fetchMock } = await oauthRoundTrip({ email, githubId });
    expect(location).toBe(`${origin}/dashboard`);
    const user = await db.user.findUniqueOrThrow({ where: { email }, include: { accounts: true } });
    expect(user.emailVerified).not.toBeNull();
    expect(session.user.id).toBe(user.id);
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0]?.providerAccountId).toBe(String(githubId));
    expect(user.accounts[0]?.access_token).toBeNull();
    expect(user.accounts[0]?.refresh_token).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/user/emails', expect.anything());
  });

  it('refuses a matching password email unless the owner explicitly links while signed in', async () => {
    const email = `oauth-existing-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email, passwordHash: 'password-account' } });
    const githubId = 800002;
    const refused = await oauthRoundTrip({ email, githubId });
    expect(refused.location).toContain('error=OAuthAccountNotLinked');
    expect(await db.account.count({ where: { provider: 'github', providerAccountId: String(githubId) } })).toBe(0);

    const linked = await oauthRoundTrip({ email, githubId, signedInAs: user.id });
    expect(linked.location).toBe(`${origin}/dashboard`);
    expect(linked.session.user.id).toBe(user.id);
    expect(await db.account.count({ where: { provider: 'github', providerAccountId: String(githubId), userId: user.id } })).toBe(1);

    const subsequent = await oauthRoundTrip({ email, githubId });
    expect(subsequent.session.user.id).toBe(user.id);
  });

  it('rejects an unverified GitHub email even if it is public on the profile', async () => {
    const email = `oauth-unverified-${randomUUID()}@example.com`;
    const result = await oauthRoundTrip({ email, githubId: 800003, verified: false });
    expect(result.location).not.toBe(`${origin}/dashboard`);
    expect(await db.user.findUnique({ where: { email } })).toBeNull();
  });
});
