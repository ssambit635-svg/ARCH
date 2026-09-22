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

  /** Worker claim step: oldest pending notifications first. */
  listPending(limit: number, client: DbClient = db) {
    return client.notification.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      include: { recipient: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
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
