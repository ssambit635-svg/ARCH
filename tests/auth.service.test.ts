import { compare } from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { loginSchema, registerSchema } from '@/lib/validation';
import { registerUser } from '@/server/services/auth.service';
import { db, resetDatabase } from './helpers/db';

describe('email/password account flow', () => {
  beforeEach(resetDatabase);

  it('normalizes email consistently for registration and sign-in', () => {
    expect(registerSchema.parse({ email: '  Person@Example.COM ', password: 'long-enough-password' }).email)
      .toBe('person@example.com');
    expect(loginSchema.parse({ email: '  Person@Example.COM ', password: 'secret' }).email)
      .toBe('person@example.com');
  });

  it('creates a password account and rejects a real duplicate with a useful sign-in message', async () => {
    const created = await registerUser({
      email: '  Person@Example.COM ',
      password: 'long-enough-password',
    });

    expect(created.user.email).toBe('person@example.com');
    expect(await compare('long-enough-password', created.user.passwordHash!)).toBe(true);
    await expect(registerUser({ email: 'person@example.com', password: 'another-long-password' }))
      .rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'An account with that email already exists. Sign in instead.',
      } satisfies Partial<AppError>);
    expect(await db.user.count()).toBe(1);
  });
});
