import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { verifiedPgUrl } from './src/lib/pg-connection.mjs';

/**
 * ARCH — Prisma configuration (Prisma 7).
 *
 * Prisma 7 moved the datasource URL out of `schema.prisma` and onto the client's driver
 * adapter. This file is what the CLI (`prisma migrate`, `prisma validate`, ...) reads.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: verifiedPgUrl(process.env.DATABASE_URL ?? ''),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL ? verifiedPgUrl(process.env.SHADOW_DATABASE_URL) : undefined,
  },
});
