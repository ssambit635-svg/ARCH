import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/lib/env';
import { authAdapter } from '@/lib/auth-adapter';
import { registerUser } from '@/server/services/auth.service';
import { enqueueWelcomeEmail, dispatchWelcomeEmails } from '@/server/services/welcome-email.service';
import type { EmailAdapter, EmailMessage } from '@/server/adapters/email';
import { renderWelcomeEmail } from '@/server/email/welcome';
import { userRepository } from '@/server/repositories/user.repository';
import { db, resetDatabase } from './helpers/db';

const oldFlag = env.FEATURE_WELCOME_EMAIL;
beforeEach(async () => { await resetDatabase(); env.FEATURE_WELCOME_EMAIL = true; });
afterEach(() => { env.FEATURE_WELCOME_EMAIL = oldFlag; });
const signup = () => registerUser({ email: 'welcome@example.com', name: 'Sam', password: 'long-enough-password' });

function recorder(): EmailAdapter & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return { name: 'fake', sent, async send(message) { sent.push(message); } };
}

describe('welcome email account outbox', () => {
  it('queues on password signup without an organization and sends HTML plus text once', async () => {
    const { user, organization } = await signup();
    expect(organization).toBeNull();
    const queued = await db.welcomeEmail.findUniqueOrThrow({ where: { userId: user.id } });
    expect(queued.status).toBe('PENDING');
    expect(queued.toEmail).toBe(user.email);
    expect(await db.notification.count()).toBe(0);
    const adapter = recorder();
    expect((await dispatchWelcomeEmails({ adapter })).sent).toBe(1);
    expect(adapter.sent[0]?.html).toContain('ARCH dragon logo');
    expect(adapter.sent[0]?.body).toContain('Welcome to ARCH');
    expect(adapter.sent[0]?.idempotencyKey).toBe(`arch-welcome/${user.id}`);
    expect((await dispatchWelcomeEmails({ adapter })).processed).toBe(0);
    expect(adapter.sent).toHaveLength(1);
  });
  it('queues atomically with workspace registration too', async () => {
    const result = await registerUser({ email: 'owner@example.com', password: 'long-enough-password', organizationName: 'Welcome org' });
    expect(result.organization).not.toBeNull();
    expect(await db.welcomeEmail.count({ where: { userId: result.user.id } })).toBe(1);
  });
  it('queues through the real OAuth adapter without resending on lookup/link', async () => {
    const user = await authAdapter.createUser!({ id: 'not-trusted', email: 'oauth@example.com', emailVerified: new Date(), name: 'OAuth user' });
    expect(user.id).not.toBe('not-trusted');
    await authAdapter.linkAccount!({ userId: user.id, provider: 'google', providerAccountId: 'test-identity', type: 'oidc' });
    expect((await authAdapter.getUserByEmail!('oauth@example.com'))?.id).toBe(user.id);
    expect(await db.welcomeEmail.count()).toBe(1);
  });
  it('deduplicates even repeated enqueue attempts after sending', async () => {
    const { user } = await signup();
    const adapter = recorder();
    await dispatchWelcomeEmails({ adapter });
    await db.$transaction(async (tx) => { await enqueueWelcomeEmail(user, tx); });
    expect(await db.welcomeEmail.count()).toBe(1);
    expect((await dispatchWelcomeEmails({ adapter })).processed).toBe(0);
  });
  it('rolls back the welcome together with account creation', async () => {
    await expect(db.$transaction(async (tx) => {
      const user = await userRepository.create({ email: 'rollback@example.com' }, tx);
      await enqueueWelcomeEmail(user, tx);
      throw new Error('rollback');
    })).rejects.toThrow('rollback');
    expect(await db.user.count()).toBe(0);
    expect(await db.welcomeEmail.count()).toBe(0);
  });
  it('is opt-in, and disabling it pauses rather than discards pending mail', async () => {
    env.FEATURE_WELCOME_EMAIL = false;
    const { user } = await signup();
    expect(await db.welcomeEmail.count()).toBe(0);
    env.FEATURE_WELCOME_EMAIL = true;
    await db.$transaction(async (tx) => { await enqueueWelcomeEmail(user, tx); });
    env.FEATURE_WELCOME_EMAIL = false;
    const adapter = recorder();
    expect((await dispatchWelcomeEmails({ adapter })).processed).toBe(0);
    expect(adapter.sent).toHaveLength(0);
    expect((await db.welcomeEmail.findFirstOrThrow()).status).toBe('PENDING');
  });
  it('delays retries, uses the same key and gives up after three attempts', async () => {
    await signup();
    const keys: (string | undefined)[] = [];
    const adapter: EmailAdapter = { name: 'failing', async send(message) {
      keys.push(message.idempotencyKey);
      throw new Error('provider error with sensitive content');
    } };
    expect((await dispatchWelcomeEmails({ adapter })).retried).toBe(1);
    expect((await dispatchWelcomeEmails({ adapter })).processed).toBe(0);
    for (let attempt = 2; attempt <= 3; attempt++) {
      await db.welcomeEmail.updateMany({ data: { nextAttemptAt: new Date(0) } });
      const result = await dispatchWelcomeEmails({ adapter });
      expect(attempt === 3 ? result.failed : result.retried).toBe(1);
    }
    const row = await db.welcomeEmail.findFirstOrThrow();
    expect(row.status).toBe('FAILED');
    expect(row.attempts).toBe(3);
    expect(row.lastError).not.toContain('sensitive content');
    expect(new Set(keys).size).toBe(1);
  });
  it('does not retry permanent provider errors', async () => {
    await signup();
    const adapter: EmailAdapter = { name: 'permanent', async send() { throw Object.assign(new Error('rejected'), { retryable: false }); } };
    expect((await dispatchWelcomeEmails({ adapter })).failed).toBe(1);
    expect((await db.welcomeEmail.findFirstOrThrow()).attempts).toBe(1);
  });
  it('skips locked rows when two workers overlap', async () => {
    await signup();
    let entered!: () => void;
    let release!: () => void;
    const inside = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let sends = 0;
    const adapter: EmailAdapter = { name: 'gated', async send() { sends++; entered(); await gate; } };
    const first = dispatchWelcomeEmails({ adapter });
    await inside;
    try { expect((await dispatchWelcomeEmails({ adapter })).processed).toBe(0); }
    finally { release(); await first; }
    expect(sends).toBe(1);
  });
  it('does not claim on shutdown and cascades deletion with the account', async () => {
    const { user } = await signup();
    expect((await dispatchWelcomeEmails({ adapter: recorder(), shouldStop: () => true })).processed).toBe(0);
    await db.user.delete({ where: { id: user.id } });
    expect(await db.welcomeEmail.count()).toBe(0);
  });
});

describe('welcome email template safety', () => {
  it('escapes user-provided markup and retains a usable plain-text alternative', () => {
    const message = renderWelcomeEmail({ name: '<script>alert("hi")</script>', appUrl: 'https://arch.example.com' });
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('https://arch.example.com/email/arch-mark.png');
    expect(message.body).toContain('https://arch.example.com/dashboard');
    expect(message.html).not.toContain('password=');
    expect(message.subject).toBe('Welcome to ARCH — less noise, more clarity');
  });
  it('handles absent names and rejects unsafe configured URLs', () => {
    expect(renderWelcomeEmail({ appUrl: 'https://arch.example.com' }).body).toContain('Hi there,');
    expect(() => renderWelcomeEmail({ appUrl: 'javascript:alert(1)' })).toThrow('HTTP(S)');
    expect(() => renderWelcomeEmail({ appUrl: 'https://user:secret@example.com' })).toThrow('credentials');
  });
});
