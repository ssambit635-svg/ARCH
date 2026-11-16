import { db, type DbClient } from '@/lib/db';
import type { NotificationChannel, NotificationReason } from '@/generated/prisma/client';

export type NewNotification = {
  organizationId: string;
  incidentId?: string | null;
  recipientId: string;
  channel?: NotificationChannel;
  reason: NotificationReason;
  subject: string;
  body: string;
};

export const notificationRepository = {
  async enqueueMany(rows: NewNotification[], client: DbClient = db) {
    if (rows.length === 0) return { count: 0 };
    return client.notification.createMany({ data: rows });
  },

  /** Candidates only; withPendingLock must claim each row before sending. */
  listPending(limit: number, client: DbClient = db) {
    return client.notification.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      include: { recipient: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },

  /**
   * Hold one row lock through delivery + acknowledgement. Other workers skip it.
   * A crash rolls back the claim. Provider idempotency handles the send/commit gap.
   * Keep the provider deadline below this transaction's 25-second deadline.
   */
  withPendingLock<T>(id: string, deliver: (client: DbClient, attempts: number) => Promise<T>): Promise<T | null> {
    return db.$transaction(async (client) => {
      const rows = await client.$queryRaw<{ id: string; attempts: number }[]>`
        SELECT id, attempts FROM notifications
        WHERE id = ${id} AND status = 'PENDING' AND attempts < 3
        FOR UPDATE SKIP LOCKED
      `;
      if (!rows.length) return null;
      return deliver(client, rows[0]!.attempts);
    }, { timeout: 25_000 });
  },

  markSent(id: string, client: DbClient = db) {
    return client.notification.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
  },

  markFailed(id: string, error: string, options: { retryable: boolean }, client: DbClient = db) {
    return client.notification.update({
      where: { id },
      data: {
        status: options.retryable ? 'PENDING' : 'FAILED',
        attempts: { increment: 1 },
        lastError: error.slice(0, 500),
      },
    });
  },

  listByOrganization(organizationId: string, pagination: { skip: number; take: number }, client: DbClient = db) {
    return client.notification.findMany({
      where: { organizationId },
      include: {
        recipient: { select: { id: true, email: true } },
        incident: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    });
  },

  countByStatus(organizationId: string, client: DbClient = db) {
    return client.notification.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } });
  },
};
