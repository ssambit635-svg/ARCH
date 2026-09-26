#!/usr/bin/env node
/**
 * Development entrypoint used by sandboxes/preview environments: brings up the database,
 * generates the Prisma client, applies migrations, optionally seeds demo data, then runs Next.js.
 *
 *   npm run dev:all
 *
 * On a normal machine `docker compose up -d && npm run setup && npm run dev` is equivalent.
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { spawn, spawnSync } from 'node:child_process';
import { startEmbeddedPostgres } from './lib/pg-embedded.mjs';

const port = process.env.PORT ?? '3000';
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('[dev] DATABASE_URL is not set — copy .env.example to .env first.');
  process.exit(1);
}

function run(command, args, label) {
  process.stdout.write(`\n[dev] ${label}\n`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if ((result.status ?? 1) !== 0) {
    console.error(`[dev] ${label} failed`);
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, ['scripts/prisma-cli.mjs', 'generate'], 'generating Prisma client');

const db = await startEmbeddedPostgres();
run(process.execPath, ['scripts/db-migrate.mjs'], 'applying migrations');

if (process.env.ARCH_SEED_DEMO === 'true') {
  run(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/seed.ts'], 'seeding explicitly requested demo data');
} else {
  process.stdout.write('[dev] no public demo account — register at /register\n');
}

const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', port],
  { stdio: 'inherit', env: { ...process.env, PORT: port } },
);

const shutdown = async (signal) => {
  child.kill(signal);
  await db.stop();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
child.on('exit', async (code) => {
  await db.stop();
  process.exit(code ?? 0);
});
