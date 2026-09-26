#!/usr/bin/env node
/**
 * Vitest 5.0.1 in this project prints red failures yet sometimes exits with status 0. CI cannot
 * trust the exit status alone. Require a complete JSON report with no failed tests or suites.
 * The report is temporary, git-ignored and deleted after checking (it may contain test data).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const dir = path.join(process.cwd(), '.tmp');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const report = path.join(dir, `vitest-${randomUUID()}.json`);

try {
  const run = spawnSync(process.execPath, [
    'node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2),
    '--reporter=default', '--reporter=json', `--outputFile.json=${report}`,
  ], { stdio: 'inherit', env: process.env });

  if (run.error || run.signal || run.status !== 0) {
    console.error('[test] Vitest did not complete successfully.');
    process.exitCode = 1;
  }

  try {
    const result = JSON.parse(fs.readFileSync(report, 'utf8'));
    if (result.success !== true || result.numTotalTests < 1 || result.numFailedTests !== 0 || result.numFailedTestSuites !== 0) {
      console.error('[test] Vitest JSON report contains failures (or no tests).');
      process.exitCode = 1;
    }
  } catch {
    console.error('[test] Vitest JSON report is missing or invalid — refusing a false-green run.');
    process.exitCode = 1;
  }
} finally {
  fs.rmSync(report, { force: true });
}
