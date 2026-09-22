import { afterAll } from 'vitest';
import { db } from '@/lib/db';

/**
 * Close the connection pool when a test file finishes, otherwise Vitest reports that something
 * is hanging and the run takes an extra 10 seconds to tear down.
 */
afterAll(async () => {
  await db.$disconnect().catch(() => undefined);
});
