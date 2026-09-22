import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Tests run against a real PostgreSQL database (no mocks): the suite exercises the service layer,
 * the state machine, tenant isolation and the webhook pipeline exactly as production would.
 *
 * `tests/global-setup.ts` brings up an embedded PostgreSQL on TEST_DB_PORT and applies
 * prisma/migrations to it before any test runs.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // One database is shared by every file, so files must not run in parallel.
    fileParallelism: false,
    maxWorkers: 1,
    isolate: false,
    pool: 'forks',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://arch:arch@localhost:55433/arch_test',
      AUTH_SECRET: 'test-secret-value-that-is-long-enough',
      AUTH_SECRET_WEBHOOK: 'test-webhook-secret-value-long-enough',
      APP_URL: 'http://localhost:3000',
      LOG_LEVEL: 'error',
      EMAIL_PROVIDER: '',
    },
  },
});
