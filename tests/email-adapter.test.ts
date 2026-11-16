import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateEmailConfig } from '@/lib/email-config';
import { getEmailAdapter, isRetryableEmailError, ResendEmailAdapter } from '@/server/adapters/email';
import { env } from '@/lib/env';

afterEach(() => vi.restoreAllMocks());

const valid = { EMAIL_PROVIDER: 'resend', EMAIL_API_KEY: 'test-key', EMAIL_FROM: 'ARCH <alerts@example.com>' };

describe('email configuration', () => {
  it('accepts disabled development email and verified-domain-shaped senders', () => {
    expect(() => validateEmailConfig({ EMAIL_FROM: 'ARCH <notifications@localhost>' })).not.toThrow();
    expect(() => validateEmailConfig(valid)).not.toThrow();
  });
  it('rejects unknown providers, missing keys, localhost senders and header injection', () => {
    expect(() => validateEmailConfig({ ...valid, EMAIL_PROVIDER: 'smtp' })).toThrow('Unsupported');
    expect(() => validateEmailConfig({ ...valid, EMAIL_API_KEY: ' ' })).toThrow('EMAIL_API_KEY');
    expect(() => validateEmailConfig({ ...valid, EMAIL_FROM: 'ARCH <alerts@localhost>' })).toThrow('EMAIL_FROM');
    expect(() => validateEmailConfig({ ...valid, EMAIL_FROM: 'ARCH\r\nBcc: x@example.com <a@example.com>' })).toThrow('EMAIL_FROM');
  });
  it('does not silently mark console delivery as production email', () => {
    const previous = { NODE_ENV: env.NODE_ENV, EMAIL_PROVIDER: env.EMAIL_PROVIDER };
    try {
      env.NODE_ENV = 'production';
      env.EMAIL_PROVIDER = '';
      expect(() => getEmailAdapter()).toThrow('Production email delivery is disabled');
    } finally { Object.assign(env, previous); }
  });
});

describe('Resend delivery', () => {
  const adapter = new ResendEmailAdapter('test-key', valid.EMAIL_FROM);
  const message = { to: 'recipient@example.com', subject: 'Test', body: 'Private content', idempotencyKey: 'arch-notification/123' };
  it('sends a stable idempotency key without leaking it into the email body', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await adapter.send(message);
    const init = fetcher.mock.calls[0]![1]!;
    expect(init.headers).toMatchObject({ 'Idempotency-Key': message.idempotencyKey });
    expect(JSON.parse(init.body as string)).not.toHaveProperty('idempotencyKey');
  });
  it.each([[429, true], [503, true], [400, false], [401, false]])('classifies HTTP %s without logging provider content', async (status, retryable) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('private-recipient@example.com secret-token', { status: status as number }));
    const error = await adapter.send(message).catch((error: unknown) => error);
    expect(isRetryableEmailError(error)).toBe(retryable);
    expect(String(error)).not.toContain('private-recipient');
    expect(String(error)).not.toContain('secret-token');
  });
  it('treats transport failure as retryable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network failed'));
    const error = await adapter.send(message).catch((error: unknown) => error);
    expect(isRetryableEmailError(error)).toBe(true);
  });
});
