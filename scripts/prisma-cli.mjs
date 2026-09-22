#!/usr/bin/env node
/**
 * Prisma CLI wrapper that survives environments without access to binaries.prisma.sh.
 *
 * Every Prisma 7 CLI command starts by making sure the native `schema-engine` binary exists and
 * downloads it when it does not. When that host is unreachable (`prisma generate` included),
 * the command dies before doing anything at all.
 *
 * Workaround: drop a small executable at the path the CLI probes. The CLI only asks it for
 * `--version`, and once that answers with the expected engines hash it stops trying to download.
 * The real work of `generate` / `validate` / `format` is done by the bundled WASM schema parser;
 * the shim is never asked to talk the schema-engine protocol, so commands that genuinely need
 * the native engine (migrate/db push/studio) are routed to `npm run db:migrate` instead.
 *
 * On a machine with full network access the wrapper just runs the CLI normally.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const enginesDir = path.join(repoRoot, 'node_modules', '@prisma', 'engines');
const markerFile = path.join(enginesDir, '.arch-offline-engine');
const offlineOnly = process.argv.includes('--offline');
const args = process.argv.slice(2).filter((arg) => arg !== '--offline');
const command = args[0] ?? '';

const NATIVE_ONLY = new Set(['migrate', 'db', 'studio', 'dev']);

function enginesVersion() {
  try {
    return require('@prisma/engines-version').enginesVersion;
  } catch {
    return null;
  }
}

function binaryName() {
  // Debian/glibc on x64 is what CI and sandboxes run; other platforms just download normally.
  const suffix = process.env.PRISMA_CLI_BINARY_TARGETS;
  if (suffix) return `schema-engine-${suffix}`;
  if (process.platform === 'linux') return 'schema-engine-debian-openssl-3.0.x';
  if (process.platform === 'darwin') return 'schema-engine-darwin';
  return 'schema-engine-windows.exe';
}

function shimPath() {
  return path.join(enginesDir, binaryName());
}

function shimIsPresent() {
  const file = shimPath();
  return fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('.arch-offline-engine');
}

function installShim() {
  const version = enginesVersion();
  if (!version) throw new Error('cannot determine engines version');
  fs.mkdirSync(enginesDir, { recursive: true });
  fs.writeFileSync(
    shimPath(),
    `#!/bin/sh
# .arch-offline-engine — placeholder schema engine for offline environments.
# See scripts/prisma-cli.mjs. prisma migrate does not work through this; use npm run db:migrate.
if [ "$1" = "--version" ]; then
  echo "schema-engine-cli ${version}"
  exit 0
fi
echo '{"jsonrpc":"2.0","error":{"code":-32601,"message":"schema engine unavailable in offline mode; use npm run db:migrate"}}' >&2
exit 1
`,
  );
  fs.chmodSync(shimPath(), 0o755);
  fs.writeFileSync(markerFile, 'offline schema-engine shim\n');
}

function run() {
  return spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    encoding: 'utf8',
  });
}

function report(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status ?? 1;
}

if (NATIVE_ONLY.has(command)) {
  console.error(
    `\n[prisma] \`prisma ${command}\` needs the native migration engine.\n` +
      '          Use `npm run db:migrate` (applies prisma/migrations/*/migration.sql) instead.\n' +
      '          With network access to binaries.prisma.sh the plain CLI works as usual.\n',
  );
  process.exit(2);
}

const offline = offlineOnly || fs.existsSync(markerFile);
let status;

if (offline || shimIsPresent()) {
  if (!shimIsPresent()) installShim();
  status = report(run());
} else {
  const first = run();
  const output = `${first.stdout ?? ''}${first.stderr ?? ''}`;
  const blockedByNetwork = /binaries\.prisma\.sh|schema-engine\.gz|socket disconnected|ENOTFOUND|ECONNREFUSED/.test(output);
  if (first.status === 0 || !blockedByNetwork) {
    status = report(first);
  } else {
    console.warn('[prisma] binaries.prisma.sh unreachable — retrying with the offline schema-engine shim');
    installShim();
    status = report(run());
  }
}

process.exit(status);
