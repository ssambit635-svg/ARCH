import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { authAdapter } from '@/lib/auth-adapter';
import { fetchVerifiedGithubProfile, githubProvider, verifiedGithubEmail } from '@/lib/github-oauth';

describe('GitHub OAuth identity', () => {
  it('only accepts verified email addresses (primary preferred), never a public or unverified email alone', () => {
    expect(verifiedGithubEmail([
      { email: 'unverified@example.com', primary: true, verified: false },
      { email: 'Secondary@Example.com', primary: false, verified: true },
    ])).toBe('secondary@example.com');
    expect(verifiedGithubEmail([{ email: 'primary@example.com', primary: true, verified: true }])).toBe('primary@example.com');
    expect(verifiedGithubEmail([{ email: 'unverified@example.com', primary: true, verified: false }])).toBeNull();
    expect(verifiedGithubEmail({ email: 'attacker@example.com', verified: true })).toBeNull();
  });

  it('checks /user/emails even when /user reports a public email; does not use a token to link by email', async () => {
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(
      url.endsWith('/user/emails')
        ? [{ email: 'Real@Example.com', primary: true, verified: true }]
        : { id: 123, login: 'real-user', email: 'unverified@example.com' },
    ), { status: 200 })) as unknown as typeof fetch;
    const profile = await fetchVerifiedGithubProfile('temporary-access-token', fetcher);
    expect(profile.email).toBe('real@example.com');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith('https://api.github.com/user/emails', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer temporary-access-token' }),
    }));
    expect(githubProvider('client-id', 'client-secret').options?.allowDangerousEmailAccountLinking).toBeUndefined();
  });

  it('rejects unverified identity and failed email API without echoing the token', async () => {
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(
      url.endsWith('/user/emails') ? [{ email: 'unverified@example.com', primary: true, verified: false }]
        : { id: 123, login: 'real-user', email: 'unverified@example.com' },
    ), { status: 200 })) as unknown as typeof fetch;
    await expect(fetchVerifiedGithubProfile('sensitive-test-token', fetcher)).rejects.toThrow(/verified GitHub email/);
    const failure = vi.fn(async () => new Response('do not echo this API error', { status: 401 })) as unknown as typeof fetch;
    await expect(fetchVerifiedGithubProfile('sensitive-test-token', failure)).rejects.toThrow('GitHub identity verification failed.');
  });

  it('links by GitHub provider id, never persists OAuth bearer/refresh/id tokens', async () => {
    const email = `github-oauth-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email, name: 'Auth test' } });
    try {
      const providerAccountId = randomUUID();
      await authAdapter.linkAccount!({
        userId: user.id, type: 'oauth', provider: 'github', providerAccountId,
        access_token: 'test-access-token', refresh_token: 'test-refresh-token', id_token: 'test-id-token',
      });
      const account = await db.account.findUniqueOrThrow({
        where: { provider_providerAccountId: { provider: 'github', providerAccountId } },
      });
      expect(account.userId).toBe(user.id);
      expect(account.access_token).toBeNull();
      expect(account.refresh_token).toBeNull();
      expect(account.id_token).toBeNull();
      expect((await authAdapter.getUserByAccount!({ provider: 'github', providerAccountId }))?.id).toBe(user.id);

      await db.user.update({ where: { id: user.id }, data: { email: `changed-${email}` } });
      expect((await authAdapter.getUserByAccount!({ provider: 'github', providerAccountId }))?.id).toBe(user.id);
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });
});
