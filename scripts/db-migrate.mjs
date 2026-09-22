#!/usr/bin/env node
/**
 * Applies `prisma/migrations/**​/migration.sql` to the database.
 *
 * Why this exists: `prisma migrate deploy` needs the Prisma *migration engine*, a native binary
 * downloaded from binaries.prisma.sh at first use. In offline sandboxes/CI that download is
 * blocked, so we apply the very same migration files ourselves and record them in Prisma's
 * `_prisma_migrations` table — including the Prisma-compatible sha256 checksum — so that a
 * machine with the real CLI sees an up-to-date database and does not re-run anything.
 *
 * Usage:
 *   node scripts/db-migrate.mjs                 # apply pending migrations
 *   node scripts/db-migrate.mjs --reset         # drop schema public, re-apply everything
 *   node scripts/db-migrate.mjs --url <url>     # target another database (tests)
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { buildUrl, connectionFromEnv } from './lib/pg-embedded.mjs';

const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const reset = process.argv.includes('--reset');
const targetUrl = arg('--url') ?? process.env.DATABASE_URL ?? '';

async function ensureDatabase(url) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '');
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${database}"`);
    console.log(`[migrate] created database ${database}`);
  }
  await admin.end();
}

async function main() {
  if (!targetUrl) throw new Error('DATABASE_URL is not set (copy .env.example to .env).');
  await ensureDatabase(targetUrl);

  const client = new pg.Client({ connectionString: targetUrl });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  if (reset) {
    console.log('[migrate] --reset: dropping schema public');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('DROP TABLE IF EXISTS "_prisma_migrations"');
    await client.query(`
      CREATE TABLE "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);
  }

  const applied = new Set(
    (await client.query('SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL')).rows.map(
      (row) => row.migration_name,
    ),
  );

  const migrations = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  let count = 0;
  for (const name of migrations) {
    if (applied.has(name)) continue;
    const file = path.join(migrationsDir, name, 'migration.sql');
    const sql = fs.readFileSync(file, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    process.stdout.write(`[migrate] applying ${name} ... `);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
           ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
         VALUES ($1, $2, now(), $3, 1)`,
        [crypto.randomUUID(), checksum, name],
      );
      await client.query('COMMIT');
      console.log('ok');
      count += 1;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.log('FAILED');
      throw error;
    }
  }

  const { rows } = await client.query('SELECT count(*)::int AS total FROM "_prisma_migrations" WHERE rolled_back_at IS NULL');
  await client.end();
  console.log(
    count === 0
      ? `[migrate] up to date (${rows[0].total} migration${rows[0].total === 1 ? '' : 's'} applied)`
      : `[migrate] applied ${count} migration${count === 1 ? '' : 's'} (${rows[0].total} total)`,
  );
}

main().catch((error) => {
  console.error(`[migrate] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
