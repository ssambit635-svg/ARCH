import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { portOpen } from '../scripts/lib/pg-embedded.mjs';

/**
 * Brings up the test database once per `npm test` run.
 *
 * A separate port and database keep test data away from the development database. The cluster is
 * run by a detached supervisor (scripts/dev-db.mjs), not by Vitest itself — otherwise the
 * postgres child process would keep the test runner alive after the last assertion.
 */
const PORT = 55433;
const DATABASE = 'arch_test';
const USER = 'arch';
const PASSWORD = 'arch';
const DATA_DIR = process.env.ARCH_TEST_DB_DIR ?? '/tmp/arch-test-pg';
const URL = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}`;

export default async function setup() {
  if (!(await portOpen('localhost', PORT))) {
    const out = fs.openSync(`${DATA_DIR}.log`, 'a');
    const child = spawn(process.execPath, ['scripts/dev-db.mjs', 'supervise'], {
      detached: true,
      stdio: ['ignore', out, out],
      env: { ...process.env, DATABASE_URL: URL, ARCH_DEV_DB_DIR: DATA_DIR },
    });
    child.unref();

    const deadline = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (await portOpen('localhost', PORT)) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    if (!ready) throw new Error(`test database did not start — see ${DATA_DIR}.log`);
  }

  const migrate = spawnSync(process.execPath, ['scripts/db-migrate.mjs', '--url', URL], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: URL },
  });
  if ((migrate.status ?? 1) !== 0) throw new Error('test database migration failed');
}
