import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Registration through the real Server Action (`registerAction`), not just the service.
 *
 * Only the request-scoped Next.js/Auth.js pieces are stubbed: `headers()` (needs a live request),
 * `signIn` (sets cookies, then throws Next's redirect) and next-auth's `AuthError` class (its ESM
 * build imports `next/server`, which only resolves inside Next). Everything else — validation, rate
 * limits, the DB reachability probe, `registerUser`, Prisma and PostgreSQL — is real, so the
 * failures below are the exact errors a user's form submit produces.
 */

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
const signInMock = vi.hoisted(() =>
  vi.fn(async (_provider: string, options: { redirectTo: string }) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${options.redirectTo};303;` });
  }),
);

vi.mock('next/headers', () => ({ headers: async () => requestHeaders.current }));
vi.mock('@/lib/auth', () => ({ signIn: signInMock, signOut: vi.fn() }));
vi.mock('next-auth', () => ({ AuthError: class AuthError extends Error {} }));

const { registerAction } = await import('@/app/(auth)/actions');
const { userRepository } = await import('@/server/repositories/user.repository');
const { organizationRepository } = await import('@/server/repositories/organization.repository');
const { db, resetDatabase } = await import('./helpers/db');

const PASSWORD = 'correct-horse-battery-staple';
let ipCounter = 0;

function registrationForm(fields: { email: string; organizationName?: string; name?: string }) {
  // Exactly what the <RegisterForm> posts: empty strings for untouched optional inputs.
  const form = new FormData();
  form.set('callbackUrl', '/dashboard');
  form.set('email', fields.email);
  form.set('name', fields.name ?? '');
  form.set('organizationName', fields.organizationName ?? '');
  form.set('password', PASSWORD);
  return form;
}

async function submit(fields: { email: string; organizationName?: string; name?: string }) {
  // A fresh client IP per submit keeps the in-memory rate limiter out of the way.
  requestHeaders.current = new Headers({ 'x-forwarded-for': `203.0.113.${(ipCounter += 1)}` });
  try {
    return { state: await registerAction(undefined, registrationForm(fields)), redirect: null as string | null };
  } catch (error) {
    const digest = (error as { digest?: string }).digest;
    if (digest?.startsWith('NEXT_REDIRECT')) return { state: undefined, redirect: digest.split(';')[2] ?? null };
    throw error;
  }
}

function loggedLines(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((call: unknown[]) => call.map(String).join(' ')).join('\n');
}

describe('registerAction (the /register Server Action)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await resetDatabase();
    signInMock.mockClear();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.doUnmock('next/headers');
    vi.doUnmock('@/lib/auth');
    vi.doUnmock('next-auth');
  });

  it('creates the account and signs in when the organization field is left blank', async () => {
    const result = await submit({ email: ' New.Person@Example.com ' });

    expect(result).toEqual({ state: undefined, redirect: '/dashboard' });
    expect(signInMock).toHaveBeenCalledWith('credentials', expect.objectContaining({ email: 'new.person@example.com' }));
    const user = await db.user.findUniqueOrThrow({ where: { email: 'new.person@example.com' }, include: { memberships: true } });
    expect(user.memberships).toHaveLength(0);
  });

  it('creates the account plus an owned organization when the organization field is filled', async () => {
    const result = await submit({ email: 'owner@example.com', organizationName: 'Acme Inc', name: 'Owner' });

    expect(result.redirect).toBe('/dashboard');
    const membership = await db.membership.findFirstOrThrow({ where: { user: { email: 'owner@example.com' } }, include: { organization: true } });
    expect(membership).toMatchObject({ role: 'OWNER', organization: { name: 'Acme Inc', slug: 'acme-inc' } });
    expect(await db.auditLog.count({ where: { action: 'organization.create' } })).toBe(1);
  });

  describe('database schema not migrated (the "Could not create your account" report)', () => {
    // The DB answers `SELECT 1`, so the old code skipped the "database down" message and hid a
    // Prisma P2021/P2022 behind the generic fallback. Reproduce with the real tables.
    async function withUsersTableMissing(run: () => Promise<void>) {
      await db.$executeRawUnsafe('ALTER TABLE "users" RENAME TO "users_hidden_by_test"');
      try {
        await run();
      } finally {
        await db.$executeRawUnsafe('ALTER TABLE "users_hidden_by_test" RENAME TO "users"');
      }
    }

    it.each([
      ['blank', undefined],
      ['filled', 'Acme Inc'],
    ])('explains that migrations are missing (organization %s) and logs a safe diagnostic', async (_label, organizationName) => {
      await withUsersTableMissing(async () => {
        const { state } = await submit({ email: 'first@example.com', organizationName });

        expect(state?.error).toMatch(/tables are missing or out of date/);
        expect(state?.error).toMatch(/npm run db:migrate/);
        expect(state?.error).not.toMatch(/Could not create your account/);
      });

      const logs = loggedLines(consoleError);
      expect(logs).toContain('[register] failed');
      expect(logs).toContain('"prismaCode":"P2021"');
      expect(logs).toContain('"sqlState":"42P01"');
      expect(logs).toContain('"kind":"schema_out_of_date"');
      expect(logs).not.toContain(PASSWORD);
      expect(logs).not.toContain('first@example.com');
      expect(logs).not.toMatch(/postgres(ql)?:\/\//);
    });

    it('explains an out-of-date schema (a column the code needs is missing)', async () => {
      await db.$executeRawUnsafe('ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "passwordHash_hidden_by_test"');
      try {
        const { state } = await submit({ email: 'second@example.com' });
        expect(state?.error).toMatch(/tables are missing or out of date/);
      } finally {
        await db.$executeRawUnsafe('ALTER TABLE "users" RENAME COLUMN "passwordHash_hidden_by_test" TO "passwordHash"');
      }
      expect(loggedLines(consoleError)).toContain('"prismaCode":"P2022"');
    });
  });

  it('turns a simultaneous duplicate signup (unique index race) into the duplicate-account message', async () => {
    await submit({ email: 'race@example.com' });
    // Second request passed the "does this email exist?" preflight before the first one committed.
    vi.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);

    const { state } = await submit({ email: 'race@example.com' });

    expect(state).toEqual({ error: 'An account with that email already exists. Sign in instead.' });
    expect(await db.user.count({ where: { email: 'race@example.com' } })).toBe(1);
  });

  it('retries when another signup takes the same organization slug mid-registration', async () => {
    const original = organizationRepository.createWithOwner.bind(organizationRepository);
    const racingCreate = async (data: Parameters<typeof original>[0], client?: Parameters<typeof original>[1]) => {
      // A competing signup commits "acme-inc" between our slug lookup and our insert.
      await db.organization.create({ data: { name: 'Acme Inc', slug: data.slug } });
      return original(data, client);
    };
    vi.spyOn(organizationRepository, 'createWithOwner').mockImplementationOnce(racingCreate as never);

    const result = await submit({ email: 'second-acme@example.com', organizationName: 'Acme Inc' });

    expect(result.redirect).toBe('/dashboard');
    const membership = await db.membership.findFirstOrThrow({ where: { user: { email: 'second-acme@example.com' } }, include: { organization: true } });
    expect(membership.organization.slug).toBe('acme-inc-2');
  });

  it('shows an error ID for unknown failures and never logs secrets from the error text', async () => {
    vi.spyOn(userRepository, 'findByEmail').mockRejectedValueOnce(
      new Error('boom: postgresql://arch:s3cret@db.internal:5432/arch password=hunter22 for someone@example.com'),
    );

    const { state } = await submit({ email: 'unknown@example.com' });

    const errorId = state?.error?.match(/Error ID ([0-9a-f]{10})/)?.[1];
    expect(state?.error).toMatch(/^Could not create your account\. Please try again\./);
    expect(errorId).toBeTruthy();
    const logs = loggedLines(consoleError);
    expect(logs).toContain(`"errorId":"${errorId}"`);
    expect(logs).toContain('[redacted-url]');
    for (const secret of ['s3cret', 'hunter22', 'someone@example.com', 'unknown@example.com', PASSWORD]) {
      expect(logs).not.toContain(secret);
    }
  });
});
