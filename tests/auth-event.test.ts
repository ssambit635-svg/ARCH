import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDatabase } from './helpers/db';
import { listAuthEvents, recordAuthEvent } from '@/server/services/auth-event.service';

describe('the authentication trail', () => {
  beforeEach(resetDatabase);

  it('records an OAuth sign-in with the provider, the address and the agent', async () => {
    const email = `trail-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email } });
    await recordAuthEvent({
      userId: user.id,
      provider: 'google',
      event: 'oauth_sign_in',
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (test)',
    });
    const events = await listAuthEvents(user.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userId: user.id,
      provider: 'google',
      event: 'oauth_sign_in',
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (test)',
    });
  });

  it('records a provider link separately from a sign-in', async () => {
    const email = `trail-link-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email } });
    await recordAuthEvent({ userId: user.id, provider: 'github', event: 'oauth_sign_in', ip: '203.0.113.8' });
    await recordAuthEvent({ userId: user.id, provider: 'github', event: 'oauth_link', ip: '203.0.113.8' });
    const events = await listAuthEvents(user.id);
    expect(events.map((event) => event.event).sort()).toEqual(['oauth_link', 'oauth_sign_in']);
  });

  it('stores no token, secret or password — only the fact that it happened', async () => {
    const email = `trail-clean-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email } });
    await recordAuthEvent({
      userId: user.id,
      provider: 'github',
      event: 'oauth_sign_in',
      ip: '203.0.113.9',
      userAgent: 'agent',
    });
    const row = await db.authEvent.findFirstOrThrow({ where: { userId: user.id } });
    const serialised = JSON.stringify(row).toLowerCase();
    for (const forbidden of ['token', 'secret', 'password', 'bearer', 'code_verifier']) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it('never breaks a sign-in when the trail cannot be written', async () => {
    // The foreign key cannot be satisfied, so the write fails. The person is already signed in
    // at that point: refusing them would be worse than a missing row.
    await expect(
      recordAuthEvent({ userId: 'does-not-exist', provider: 'google', event: 'oauth_sign_in' }),
    ).resolves.toBeUndefined();
  });
});
