import { describe, expect, it } from 'vitest';
import { Prisma } from '@/lib/db';
import { describeDatabaseError, isUniqueViolationOn, redactErrorText, safeErrorLog, uniqueConstraintOf } from '@/lib/db-errors';

function known(code: string, meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test', meta });
}

describe('database error classification', () => {
  it('reads unique constraints from both the classic and the Prisma 7 driver-adapter shapes', () => {
    const adapter = known('P2002', {
      modelName: 'User',
      driverAdapterError: { name: 'DriverAdapterError', cause: { originalCode: '23505', kind: 'UniqueConstraintViolation', constraint: { index: 'users_email_key' } } },
    });
    const classic = known('P2002', { target: ['email'] });

    expect(uniqueConstraintOf(adapter)).toBe('users_email_key');
    expect(isUniqueViolationOn(adapter, 'users_email_key', 'email')).toBe(true);
    expect(isUniqueViolationOn(classic, 'users_email_key', 'email')).toBe(true);
    expect(isUniqueViolationOn(adapter, 'organizations_slug_key', 'slug')).toBe(false);
    expect(uniqueConstraintOf(new Error('P2002'))).toBeNull();
  });

  it('classifies missing schema, missing privileges and pool timeouts', () => {
    const table = known('P2021', { modelName: 'User', driverAdapterError: { cause: { originalCode: '42P01', table: 'public.users' } } });
    expect(describeDatabaseError(table)).toMatchObject({ kind: 'schema_out_of_date', prismaCode: 'P2021', sqlState: '42P01', table: 'public.users' });
    expect(describeDatabaseError(known('P2022', {})).kind).toBe('schema_out_of_date');
    expect(describeDatabaseError(known('P2039', { driverAdapterError: { cause: { originalCode: '42501' } } })).kind).toBe('permission_denied');
    expect(describeDatabaseError(known('P2024', {})).kind).toBe('pool_timeout');
    expect(describeDatabaseError(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })).kind).toBe('unavailable');
    expect(describeDatabaseError(new Error('something else')).kind).toBeNull();
  });

  it('redacts connection strings, credentials and emails from logged text', () => {
    const text = redactErrorText('connect postgresql://arch:pw@host/db password=hunter2 token: abc Bearer xyz.123 for a.b@example.org');
    expect(text).not.toMatch(/pw@|hunter2|abc|xyz\.123|a\.b@example\.org/);
    expect(safeErrorLog(new Error('first line\nsecond line')).message).toBe('first line');
  });
});
