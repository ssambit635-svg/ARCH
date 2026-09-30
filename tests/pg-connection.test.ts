import { describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { verifiedPgUrl } from '../src/lib/pg-connection.mjs';

describe('PostgreSQL TLS URL normalization', () => {
  const original = 'postgresql://u:p%40ss@db.example:5432/arch?application_name=ARCH&sslmode=require&schema=public';

  it.each(['prefer', 'require', 'verify-ca'])(
    'uses the existing verified pg behavior explicitly for sslmode=%s (no security warning)', (mode) => {
      const warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
      try {
        const url = verifiedPgUrl(original.replace('sslmode=require', `sslmode=${mode}`));
        expect(new URL(url).searchParams.get('sslmode')).toBe('verify-full');
        expect(new URL(url).searchParams.get('application_name')).toBe('ARCH');
        expect(new URL(url).searchParams.get('schema')).toBe('public');
        expect(new URL(url).password).toBe('p%40ss');
        const client = new pg.Client({ connectionString: url });
        expect((client as unknown as { connectionParameters: { ssl: unknown } }).connectionParameters.ssl)
          .toEqual({}); // TLS on, verified by Node
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    },
  );

  it('does not weaken or override explicitly configured TLS modes', () => {
    for (const mode of ['verify-full', 'disable']) {
      const url = original.replace('sslmode=require', `sslmode=${mode}`);
      expect(verifiedPgUrl(url)).toBe(url);
    }
    expect(verifiedPgUrl('postgresql://localhost:5432/arch')).toBe('postgresql://localhost:5432/arch');
  });

  it('handles repeated parameters the same way the pg URL parser does', () => {
    const url = verifiedPgUrl(`${original}&sslmode=prefer`);
    expect(new URL(url).searchParams.getAll('sslmode')).toEqual(['verify-full']);
    expect((new pg.Client({ connectionString: url }) as unknown as { connectionParameters: { ssl: unknown } }).connectionParameters.ssl).toEqual({});
  });

  it('strengthens even libpq-compat aliases rather than disabling certificate verification', () => {
    const url = verifiedPgUrl(`${original}&uselibpqcompat=true`);
    expect(new URL(url).searchParams.get('sslmode')).toBe('verify-full');
    const client = new pg.Client({ connectionString: url });
    expect((client as unknown as { connectionParameters: { ssl: unknown } }).connectionParameters.ssl).toEqual({});
  });
});
