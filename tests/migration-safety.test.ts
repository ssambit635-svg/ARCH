import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const migrate = (args: string[] = [], extra: Record<string, string> = {}) => exec(
  process.execPath, ['scripts/db-migrate.mjs', ...args],
  { env: { ...process.env, ...extra }, timeout: 30_000 },
);

describe('release migration safety', () => {
  it('rejects production reset before attempting a database connection', async () => {
    await expect(migrate(['--reset'], {
      NODE_ENV: 'production', DATABASE_URL: 'postgresql://invalid:invalid@localhost:1/invalid',
    })).rejects.toMatchObject({ stderr: expect.stringContaining('Refusing --reset in production') });
  });
  it('supports simultaneous idempotent release checks', async () => {
    const results = await Promise.all([migrate(), migrate()]);
    for (const result of results) expect(result.stdout).toContain('up to date');
  });
});
