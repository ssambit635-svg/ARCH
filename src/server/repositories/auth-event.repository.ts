import { db, type DbClient } from '@/lib/db';

export type AuthEventRecord = {
  userId?: string | null;
  provider: string;
  event: string;
  ip?: string | null;
  userAgent?: string | null;
};

export const authEventRepository = {
  create(data: AuthEventRecord, client: DbClient = db) {
    return client.authEvent.create({
      data: {
        userId: data.userId ?? null,
        provider: data.provider,
        event: data.event,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  },

  /** The most recent events for one person — shown on their own Settings page. */
  listForUser(userId: string, limit = 10, client: DbClient = db) {
    return client.authEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
