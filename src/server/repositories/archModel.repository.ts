import { db, type DbClient } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';

/**
 * ARCH Model persistence. One row per organization; every query is organization-scoped like the
 * rest of the repositories, so one tenant's model can never be loaded for another.
 */

const summarySelect = {
  id: true,
  organizationId: true,
  version: true,
  name: true,
  format: true,
  trainedAt: true,
  teamDocuments: true,
  totalDocuments: true,
  metrics: true,
  trainedById: true,
  updatedAt: true,
} as const;

export const archModelRepository = {
  /** Metadata only — the artifact can be hundreds of KB. */
  findSummary(organizationId: string, client: DbClient = db) {
    return client.archModel.findUnique({ where: { organizationId }, select: summarySelect });
  },

  findWithArtifact(organizationId: string, client: DbClient = db) {
    return client.archModel.findUnique({ where: { organizationId }, select: { ...summarySelect, artifact: true } });
  },

  upsert(
    organizationId: string,
    data: { name: string; format: number; trainedAt: Date; teamDocuments: number; totalDocuments: number; metrics: Prisma.InputJsonValue; artifact: Prisma.InputJsonValue; trainedById: string | null },
    client: DbClient = db,
  ) {
    return client.archModel.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: { ...data, version: { increment: 1 } },
      select: summarySelect,
    });
  },

  /**
   * Resolved incidents with their timeline, newest first — the organization's training set.
   * Copilot-authored timeline entries are excluded by the caller, not here.
   */
  listResolvedIncidentsForTraining(organizationId: string, take: number, client: DbClient = db) {
    return client.incident.findMany({
      where: { organizationId, status: 'RESOLVED' },
      orderBy: { resolvedAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        severity: true,
        startedAt: true,
        resolvedAt: true,
        service: { select: { name: true } },
        events: { select: { type: true, body: true, metadata: true, createdAt: true }, orderBy: { createdAt: 'asc' }, take: 200 },
      },
    });
  },

  /** Human-approved postmortems are the best labels ARCH has: root cause + action items. */
  listApprovedPostmortems(organizationId: string, incidentIds: string[], client: DbClient = db) {
    if (incidentIds.length === 0) return Promise.resolve([]);
    return client.aiSuggestion.findMany({
      where: { organizationId, type: 'POSTMORTEM', status: 'APPROVED', incidentId: { in: incidentIds } },
      select: { incidentId: true, output: true },
      orderBy: { reviewedAt: 'desc' },
    });
  },

  /** Organizations whose newest resolution is newer than their model (or that have none yet). */
  async listOrganizationsNeedingTraining(client: DbClient = db): Promise<string[]> {
    const rows = await client.incident.groupBy({ by: ['organizationId'], where: { status: 'RESOLVED' }, _max: { resolvedAt: true } });
    if (rows.length === 0) return [];
    const models = await client.archModel.findMany({ where: { organizationId: { in: rows.map((row) => row.organizationId) } }, select: { organizationId: true, trainedAt: true } });
    const trainedAt = new Map(models.map((model) => [model.organizationId, model.trainedAt]));
    return rows
      .filter((row) => {
        const last = trainedAt.get(row.organizationId);
        return !last || (row._max.resolvedAt !== null && row._max.resolvedAt > last);
      })
      .map((row) => row.organizationId);
  },
};
