import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { env, isProduction } from './env';

/**
 * Prisma 7 client.
 *
 * Prisma 7 has no Rust query engine: queries are compiled by a WASM module inside
 * `@prisma/client` and executed through a driver adapter. That is why the connection URL is
 * passed here (and to `prisma.config.ts` for migrations) rather than living in schema.prisma.
 */

const globalForPrisma = globalThis as unknown as { __archPrisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.LOG_LEVEL === 'debug' && !isProduction ? ['warn', 'error'] : ['error'],
  });
}

export const db = globalForPrisma.__archPrisma ?? createPrismaClient();

// In dev, Next.js hot-reloads modules; keep a single client (and pool) per process.
if (!isProduction) globalForPrisma.__archPrisma = db;

/** Either the root client or a `$transaction` client — services accept both. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export { Prisma };
