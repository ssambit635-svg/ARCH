#!/usr/bin/env node
/**
 * One-command developer setup:
 *   1. create the environment file if it is missing (fresh secrets, never overwriting yours)
 *   2. make sure PostgreSQL is reachable (Docker-managed or embedded fallback)
 *   3. generate the Prisma client
 *   4. apply migrations
 *   5. seed disposable demo data only when ARCH_SEED_DEMO=true and SEED_PASSWORD is set
 *
 *   npm run setup
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { connectionFromEnv, portOpen, startEmbeddedPostgres } from './lib/pg-embedded.mjs';
import { ensureEnvFile, explainEnvFile } from './lib/env-file.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Before anything reads the environment: make sure there is one to read.
const envFile = ensureEnvFile(root);
process.stdout.write(explainEnvFile(envFile));

// Loaded after the file exists, so the values above are the ones the app sees.
dotenv.config();

const url = process.env.DATABASE_URL ?? '';
if (!url) {
  console.error(`[setup] DATABASE_URL is not set — check ${envFile.path}.`);
  process.exit(1);
}

function run(command, args, label) {
  process.stdout.write(`\n[setup] ${label}\n`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if ((result.status ?? 1) !== 0) {
    console.error(`[setup] ${label} failed`);
    process.exit(result.status ?? 1);
  }
}

const conn = connectionFromEnv();
let stop = async () => {};
if (!(await portOpen(conn.host, conn.port))) {
  process.stdout.write('[setup] no database reachable\n');
  const db = await startEmbeddedPostgres();
  stop = db.stop;
}

run(process.execPath, ['scripts/prisma-cli.mjs', 'generate'], 'generating Prisma client');
run(process.execPath, ['scripts/db-migrate.mjs'], 'applying migrations');

if (process.env.ARCH_SEED_DEMO === 'true') {
  run(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/seed.ts'], 'seeding explicitly requested demo data');
} else {
  process.stdout.write('\n[setup] no demo accounts created — register your own at /register\n');
}

await stop();
process.stdout.write('\n[setup] ready — run `npm run dev:all` (starts both Postgres and Next.js)\n');
