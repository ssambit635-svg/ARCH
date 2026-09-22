/**
 * Embedded PostgreSQL helper.
 *
 * ARCH's documented local path is Docker (`docker compose up -d`, PostgreSQL 16). Some
 * environments — sandboxes, CI runners, locked-down laptops — cannot run Docker. For those we
 * fall back to a real PostgreSQL server whose binaries ship as an npm dependency
 * (`embedded-postgres`, PostgreSQL 18) with a data directory outside the repository.
 *
 * This is a *development and test* convenience only. Production uses a managed Postgres.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export const DEFAULT_DATABASE_URL = 'postgresql://arch:arch@localhost:5432/arch';

/** Parse DATABASE_URL (falling back to the documented local default). */
export function connectionFromEnv(env = process.env) {
  const url = env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const parsed = new URL(url);
  return {
    url,
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username || 'arch'),
    password: decodeURIComponent(parsed.password || 'arch'),
    database: parsed.pathname.replace(/^\//, '') || 'arch',
  };
}

export function buildUrl({ user, password, host, port, database }) {
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function dataDirFor(port) {
  return process.env.ARCH_DEV_DB_DIR || path.join(os.tmpdir(), `arch-dev-pg-${port}`);
}

/** Directory holding the embedded `initdb` / `postgres` / `pg_ctl` binaries, if installed. */
export function pgBinDir() {
  const platform = process.platform === 'darwin' ? 'darwin' : process.platform;
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? 'ia32' : 'x64';
  const dir = path.join(
    process.cwd(),
    'node_modules',
    `@embedded-postgres/${platform}-${arch}`,
    'native',
    'bin',
  );
  return fs.existsSync(dir) ? dir : null;
}

/** True when something is accepting TCP connections on host:port. */
export function portOpen(host, port, timeout = 500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: host === 'localhost' ? '127.0.0.1' : host, port, ...(timeout ? {} : {}) });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** True when the data directory already contains a cluster. */
export function isInitialised(dataDir) {
  return fs.existsSync(path.join(dataDir, 'PG_VERSION'));
}

/**
 * Ensure a PostgreSQL cluster is initialised and running on the DATABASE_URL port.
 * Returns connection details plus a `stop()` that shuts the server down.
 */
export async function startEmbeddedPostgres({ quiet = false, port, database } = {}) {
  const conn = connectionFromEnv();
  const resolvedPort = port ?? conn.port;
  const resolvedDatabase = database ?? conn.database;
  const dataDir = dataDirFor(resolvedPort);
  const log = (message) => {
    if (!quiet) process.stdout.write(`[db] ${message}`);
  };
  const url = buildUrl({ ...conn, port: resolvedPort, database: resolvedDatabase });

  if (await portOpen(conn.host, resolvedPort)) {
    log(`already running on ${conn.host}:${resolvedPort}\n`);
    return { ...conn, port: resolvedPort, database: resolvedDatabase, url, external: true, stop: async () => {} };
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: conn.user,
    password: conn.password,
    port: resolvedPort,
    persistent: true,
    onLog: (message) => {
      if (!quiet && /\b(ready to accept connections|shut down|FATAL)\b/.test(message)) {
        log(message.trim() + '\n');
      }
    },
  });

  if (!isInitialised(dataDir)) {
    log(`initialising cluster in ${dataDir}\n`);
    await pg.initialise();
  }
  log(`starting PostgreSQL on ${conn.host}:${resolvedPort}\n`);
  await pg.start();
  try {
    await pg.createDatabase(resolvedDatabase);
  } catch {
    // Already exists — fine.
  }
  log(`ready — ${resolvedDatabase}@${conn.host}:${resolvedPort}\n`);

  return {
    ...conn,
    port: resolvedPort,
    database: resolvedDatabase,
    url,
    external: false,
    stop: async () => {
      await pg.stop().catch(() => undefined);
    },
  };
}

/** Stop a running embedded cluster with pg_ctl (works from any process). */
export function stopEmbeddedPostgres({ port } = {}) {
  const conn = connectionFromEnv();
  const dataDir = dataDirFor(port ?? conn.port);
  const bin = pgBinDir();
  if (!bin) throw new Error('embedded-postgres binaries not found — run `npm install` first.');
  const result = spawnSync(path.join(bin, 'pg_ctl'), ['-D', dataDir, 'stop', '-m', 'fast'], {
    stdio: 'inherit',
  });
  return result.status === 0;
}
