import { db, type DbClient } from '@/lib/db';

/** Internal account-scoped queue. No organization-global or anonymous read API. */
export const welcomeEmailRepository = {
  enqueueOnce(data: { userId: string; toEmail: string; subject: string; body: string; html: string }, client: DbClient) {
    return client.welcomeEmail.createMany({ data: [data], skipDuplicates: true });
  },
  listDue(limit: number) {
    return db.welcomeEmail.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 }, nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' }, take: limit,
    });
  },
  withDueLock<T>(userId: string, deliver: (client: DbClient) => Promise<T>): Promise<T | null> {
    return db.$transaction(async (client) => {
      const rows = await client.$queryRaw<{ userId: string }[]>`
        SELECT "userId" FROM welcome_emails
        WHERE "userId" = ${userId} AND status = 'PENDING' AND attempts < 3
          AND "nextAttemptAt" <= CURRENT_TIMESTAMP
        FOR UPDATE SKIP LOCKED
      `;
      return rows.length ? deliver(client) : null;
    }, { timeout: 25_000 });
  },
  find(userId: string, client: DbClient) {
    return client.welcomeEmail.findUniqueOrThrow({ where: { userId } });
  },
  markSent(userId: string, client: DbClient) {
    return client.welcomeEmail.update({ where: { userId }, data: {
      status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null,
    } });
  },
  markFailed(userId: string, options: { retryable: boolean; attempts: number }, client: DbClient) {
    return client.welcomeEmail.update({ where: { userId }, data: {
      status: options.retryable ? 'PENDING' : 'FAILED', attempts: { increment: 1 },
      // Never persist provider/customer payloads or arbitrary exception messages.
      lastError: options.retryable ? 'Email delivery failed; scheduled for retry' : 'Email delivery failed; operator review required',
      nextAttemptAt: new Date(Date.now() + (options.attempts === 1 ? 60_000 : 300_000)),
    } });
  },
};
