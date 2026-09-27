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
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: 10 });
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

/**
 * Is the database answering?
 *
 * Sign-in and sign-up are the first thing anyone touches, and "wrong password" is a terrible
 * answer when the truth is "PostgreSQL is not running". These two flows ask this question first
 * so they can say what is actually wrong.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * True when an error means "the database is unreachable", as opposed to a bug or a bad input.
 * Covers Prisma's initialization errors (P1001/P1002/P1008/P1017) and raw socket failures.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P1008', 'P1017'].includes(error.code)) return true;

  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET', '57P01', '57P03'].includes(code)) {
    return true;
  }
  const message = error instanceof Error ? error.message : '';
  return /can'?t reach database|connection terminated|connection refused|server closed the connection|terminating connection/i.test(message);
}

export { Prisma };
