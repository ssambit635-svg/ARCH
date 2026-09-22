#!/usr/bin/env node
/**
 * Dev database manager.
 *
 *   npm run db:up      start PostgreSQL (embedded) and keep it running
 *   npm run db:down    stop it
 *   npm run db:status  is it reachable?
 *
 * Requires `embedded-postgres` (installed with devDependencies). If you have Docker, prefer
 * `docker compose up -d` — the same DATABASE_URL works for both.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectionFromEnv, dataDirFor, portOpen, startEmbeddedPostgres, stopEmbeddedPostgres } from './lib/pg-embedded.mjs';

// Log lives next to the data directory, never inside it: initdb refuses to initialise a
// directory that is not empty.
const logFile = () => `${dataDirFor(connectionFromEnv().port)}.log`;

async function supervise() {
  const db = await startEmbeddedPostgres();
  const shutdown = async () => {
    process.stdout.write('\n[db] stopping\n');
    await db.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  // Keep the process (and therefore the server) alive.
  await new Promise(() => {});
}

async function startDaemon() {
  const conn = connectionFromEnv();
  if (await portOpen(conn.host, conn.port)) {
    console.log(`[db] already running on ${conn.host}:${conn.port}`);
    return;
  }
  fs.mkdirSync(path.dirname(logFile()), { recursive: true });
  const out = fs.openSync(logFile(), 'a');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'supervise'], {
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await portOpen(conn.host, conn.port)) {
      console.log(`[db] started (pid ${child.pid}) on ${conn.host}:${conn.port}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`database did not become ready — see ${logFile()}`);
}

const command = process.argv[2] ?? 'start';
const daemon = process.argv.includes('--daemon');

try {
  if (command === 'start') {
    if (daemon) await startDaemon();
    else await supervise();
  } else if (command === 'supervise') {
    await supervise();
  } else if (command === 'stop') {
    const stopped = stopEmbeddedPostgres();
    console.log(stopped ? '[db] stopped' : '[db] not running (or managed elsewhere)');
  } else if (command === 'status') {
    const conn = connectionFromEnv();
    const up = await portOpen(conn.host, conn.port);
    console.log(`[db] ${conn.host}:${conn.port} — ${up ? 'reachable' : 'not reachable'}`);
    process.exitCode = up ? 0 : 1;
  } else {
    console.error(`unknown command: ${command}\nusage: node scripts/dev-db.mjs [start|stop|status] [--daemon]`);
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : String(error)}`);
  console.error('[db] hint: with Docker available, run `docker compose up -d` instead.');
  process.exitCode = 1;
}
