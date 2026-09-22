#!/usr/bin/env node
/**
 * One-command developer setup:
 *   1. make sure PostgreSQL is reachable (Docker-managed or embedded fallback)
 *   2. generate the Prisma client
 *   3. apply migrations
 *   4. seed demo data when the database is empty
 *
 *   npm run setup
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { connectionFromEnv, portOpen, startEmbeddedPostgres } from './lib/pg-embedded.mjs';

const url = process.env.DATABASE_URL ?? '';
if (!url) {
  console.error('[setup] DATABASE_URL is not set — copy .env.example to .env first.');
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

let userCount = 0;
try {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  userCount = (await client.query('SELECT count(*)::int AS total FROM users')).rows[0].total;
  await client.end();
} catch {
  userCount = 0;
}

if (userCount === 0) {
  run(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/seed.ts'], 'seeding demo data');
} else {
  process.stdout.write(`\n[setup] database already has ${userCount} user(s) — skipping seed\n`);
}

await stop();
process.stdout.write('\n[setup] ready — run `npm run dev`\n');
