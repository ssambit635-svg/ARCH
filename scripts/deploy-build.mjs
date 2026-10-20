#!/usr/bin/env node
/**
 * Production build for Render (and any other Node host).
 *
 * Why this exists instead of `next build` directly:
 *   - The Prisma client is generated into `src/generated/` (git-ignored), so a fresh clone has
 *     none. Generating it is a build step, not an install step.
 *   - `prisma generate` prints its own banner ("injected env (0) from .env") and then exits. When
 *     a host restarts a crashed build, that banner is all you see, repeated — which reads like a
 *     stuck build when it is actually a build being restarted from zero. This wrapper prints one
 *     `[deploy]` line per stage and the exit code, so the log says exactly where it died.
 *   - The host must never run `npm run dev` as its build or start command: the dev entrypoint
 *     starts an embedded PostgreSQL cluster and a watching dev server, neither of which ever
 *     exits. See docs/engineering/DEPLOY-RENDER.md.
 */
import { spawnSync } from 'node:child_process';

const started = Date.now();
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

const steps = [
  { label: 'prisma generate', command: process.execPath, args: ['scripts/prisma-cli.mjs', 'generate'] },
  { label: 'next build', command: process.execPath, args: ['node_modules/next/dist/bin/next', 'build'] },
];

if (!process.env.DATABASE_URL) {
  console.warn(
    '[deploy] DATABASE_URL is not set at build time. `next build` does not need a database,\n' +
      '         but the running app does — set it on the host before the first request.',
  );
}

for (const step of steps) {
  console.log(`\n[deploy] ${step.label} — start (${elapsed()})`);
  const result = spawnSync(step.command, step.args, { stdio: 'inherit', env: process.env });
  if ((result.status ?? 1) !== 0) {
    console.error(`\n[deploy] ${step.label} — FAILED (exit ${result.status ?? 'signal'}) after ${elapsed()}`);
    process.exit(result.status ?? 1);
  }
  console.log(`[deploy] ${step.label} — done (${elapsed()})`);
}

console.log(`\n[deploy] build complete in ${elapsed()} — start the server with \`npm start\``);
