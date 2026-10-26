import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDatabase } from './helpers/db';
import { decideOAuthSignIn, guardProviderLink } from '@/lib/auth-callbacks';
import type { AutoLink } from '@/lib/oauth-server';

/**
 * The gate every OAuth identity passes, and the backstop that undoes a link that was made to
 * the wrong account. Both are the answer to "somebody signed in with a password on a shared
 * browser — whose provider identity ends up on the account?".
 */

const verifiedGoogle = { email: 'person@example.com', email_verified: true };

function marker(overrides: Partial<AutoLink> = {}): AutoLink {
  return {
    provider: 'google',
    userId: 'user_1',
    email: 'person@example.com',
    strict: true,
    ...overrides,
  };
}

describe('the OAuth sign-in gate', () => {
  it('lets a verified identity in when no link is waiting', () => {
    expect(decideOAuthSignIn({ provider: 'google' }, verifiedGoogle, null)).toBe(true);
  });

  it('lets a verified identity in when the waiting link is the same address', () => {
    expect(decideOAuthSignIn({ provider: 'google' }, verifiedGoogle, marker())).toBe(true);
  });

  it('refuses a link that belongs to a different address, and says where to go', () => {
    const decision = decideOAuthSignIn(
      { provider: 'google' },
      { email: 'somebody-else@example.com', email_verified: true },
      marker(),
    );
    expect(decision).toBe('/login?error=account_mismatch&provider=google');
  });

  it('compares addresses without caring about their case', () => {
    const decision = decideOAuthSignIn(
      { provider: 'google' },
      { email: 'PERSON@example.com', email_verified: true },
      marker(),
    );
    expect(decision).toBe(true);
  });

  it('does not let a link for one provider block a sign-in with another', () => {
    const decision = decideOAuthSignIn(
      { provider: 'github' },
      { email: 'somebody-else@example.com' },
      marker(),
    );
    expect(decision).toBe(true);
  });

  it('allows a link the person asked for themselves, even with another address', () => {
    const decision = decideOAuthSignIn(
      { provider: 'google' },
      { email: 'work@example.com', email_verified: true },
      marker({ strict: false, email: 'person@example.com' }),
    );
    expect(decision).toBe(true);
  });

  it('never lets an unverified identity in', () => {
    expect(decideOAuthSignIn({ provider: 'google' }, { email: 'person@example.com' }, null)).toBe(false);
    expect(decideOAuthSignIn({ provider: 'github' }, { email: '' }, null)).toBe(false);
  });

  it('ignores anything that is not a provider sign-in', () => {
    expect(decideOAuthSignIn({ provider: 'credentials' }, { email: 'person@example.com' }, null)).toBe(true);
    expect(decideOAuthSignIn(null, undefined, marker())).toBe(true);
  });
});

describe('the provider link backstop', () => {
  beforeEach(resetDatabase);

  it('keeps a link that was made to the account that asked for it', async () => {
    const email = `link-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email } });
    await db.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'google-1',
      },
    });

    const kept = await guardProviderLink(
      user,
      { provider: 'google', providerAccountId: 'google-1' },
      marker({ userId: user.id }),
    );

    expect(kept).toBe(true);
    expect(await db.account.count({ where: { userId: user.id } })).toBe(1);
  });

  it('keeps a link when nothing was waiting', async () => {
    const email = `link-free-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email } });
    await db.account.create({
      data: { userId: user.id, type: 'oauth', provider: 'google', providerAccountId: 'google-2' },
    });

    expect(
      await guardProviderLink(user, { provider: 'google', providerAccountId: 'google-2' }, null),
    ).toBe(true);
    expect(await db.account.count({ where: { userId: user.id } })).toBe(1);
  });

  it('undoes a link that was made to another account', async () => {
    const email = `link-swap-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email } });
    const account = await db.account.create({
      data: { userId: user.id, type: 'oauth', provider: 'google', providerAccountId: 'google-3' },
    });

    const kept = await guardProviderLink(
      user,
      { provider: 'google', providerAccountId: 'google-3' },
      marker({ userId: 'someone_else' }),
    );

    expect(kept).toBe(false);
    expect(await db.account.count({ where: { id: account.id } })).toBe(0);
    expect(await db.account.count({ where: { providerAccountId: 'google-3' } })).toBe(0);
  });
});
