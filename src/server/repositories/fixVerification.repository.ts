import { db, type DbClient } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';

export const fixVerificationRepository = {
  create(
    data: {
      organizationId: string;
      incidentId: string;
      suggestionId: string;
      repoConnectionId?: string | null;
      commitSha?: string | null;
      patch: string;
      testCommand?: string | null;
      status?: string;
      createdById?: string | null;
    },
    client: DbClient = db,
  ) {
    return client.fixVerification.create({
      data: {
        organizationId: data.organizationId,
        incidentId: data.incidentId,
        suggestionId: data.suggestionId,
        repoConnectionId: data.repoConnectionId ?? null,
        commitSha: data.commitSha ?? null,
        patch: data.patch,
        testCommand: data.testCommand ?? null,
        status: data.status ?? 'PENDING',
        createdById: data.createdById ?? null,
      },
    });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.fixVerification.findFirst({
      where: { id, organizationId },
      include: {
        repoConnection: true,
        suggestion: true,
        pullRequest: true,
      },
    });
  },

  findBySuggestion(organizationId: string, suggestionId: string, client: DbClient = db) {
    return client.fixVerification.findMany({
      where: { organizationId, suggestionId },
      orderBy: { createdAt: 'desc' },
      include: { repoConnection: true, pullRequest: true },
    });
  },

  listForIncident(organizationId: string, incidentId: string, client: DbClient = db) {
    return client.fixVerification.findMany({
      where: { organizationId, incidentId },
      orderBy: { createdAt: 'desc' },
      include: { repoConnection: true, suggestion: { select: { id: true, type: true, output: true } }, pullRequest: true },
      take: 50,
    });
  },

  update(
    id: string,
    data: {
      status?: string;
      testOutput?: string | null;
      evidence?: Prisma.InputJsonValue;
      durationMs?: number | null;
      finishedAt?: Date | null;
    },
    client: DbClient = db,
  ) {
    return client.fixVerification.update({
      where: { id },
      data,
      include: { repoConnection: true, suggestion: true, pullRequest: true },
    });
  },

  setRunning(id: string, client: DbClient = db) {
    return client.fixVerification.update({ where: { id }, data: { status: 'RUNNING' } });
  },
};
