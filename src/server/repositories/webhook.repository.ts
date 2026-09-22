import { db, type DbClient } from '@/lib/db';
import type { WebhookDeliveryStatus } from '@/generated/prisma/client';

export const webhookRepository = {
  listEndpoints(organizationId: string, client: DbClient = db) {
    return client.webhookEndpoint.findMany({
      where: { organizationId },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        service: { select: { id: true, name: true } },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findEndpointById(organizationId: string, id: string, client: DbClient = db) {
    return client.webhookEndpoint.findFirst({ where: { id, organizationId } });
  },

  findEndpointByExternalId(externalId: string, client: DbClient = db) {
    return client.webhookEndpoint.findUnique({
      where: { externalId },
      include: {
        project: { select: { id: true, organizationId: true } },
        service: { select: { id: true } },
      },
    });
  },

  createEndpoint(
    data: {
      organizationId: string;
      projectId: string;
      serviceId?: string | null;
      provider: string;
      externalId: string;
      description?: string | null;
      secretHash: string;
      secretEncrypted: string;
    },
    client: DbClient = db,
  ) {
    return client.webhookEndpoint.create({ data });
  },

  updateEndpoint(
    organizationId: string,
    id: string,
    data: { description?: string | null; isActive?: boolean; projectId?: string; serviceId?: string | null; secretHash?: string; secretEncrypted?: string },
    client: DbClient = db,
  ) {
    return client.webhookEndpoint.updateMany({ where: { id, organizationId }, data });
  },

  removeEndpoint(organizationId: string, id: string, client: DbClient = db) {
    return client.webhookEndpoint.deleteMany({ where: { id, organizationId } });
  },

  markDelivered(id: string, at: Date, client: DbClient = db) {
    return client.webhookEndpoint.update({ where: { id }, data: { lastDeliveryAt: at } });
  },

  findDelivery(endpointId: string, deliveryKey: string, client: DbClient = db) {
    return client.webhookDelivery.findUnique({ where: { endpointId_deliveryKey: { endpointId, deliveryKey } } });
  },

  createDelivery(
    data: {
      endpointId: string;
      deliveryKey: string;
      status: WebhookDeliveryStatus;
      httpStatus: number;
      incidentId?: string | null;
      error?: string | null;
      payload?: Record<string, unknown> | null;
    },
    client: DbClient = db,
  ) {
    return client.webhookDelivery.create({ data: { ...data, payload: (data.payload ?? undefined) as never } });
  },

  listDeliveries(endpointId: string, pagination: { skip: number; take: number }, client: DbClient = db) {
    return client.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { receivedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    });
  },

  countDeliveries(endpointId: string, client: DbClient = db) {
    return client.webhookDelivery.count({ where: { endpointId } });
  },
};
