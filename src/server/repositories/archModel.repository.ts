import { db, type DbClient } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';

/**
 * ARCH Model persistence. Every query is organization-scoped like the rest of the repositories,
 * so one tenant's model can never be loaded for another.
 *
 * V3 registry: `arch_models` holds the ACTIVE model of an organization; `arch_model_versions`
 * keeps every training run (promoted or not) and `arch_model_jobs` is the background training
 * queue drained by the worker.
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
  activeVersionId: true,
} as const;

export const versionSummarySelect = {
  id: true,
  organizationId: true,
  version: true,
  status: true,
  name: true,
  format: true,
  trainedAt: true,
  teamDocuments: true,
  totalDocuments: true,
  metrics: true,
  evaluation: true,
  trigger: true,
  trainedById: true,
  createdAt: true,
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
    data: {
      /** Registry version number of the model being activated. */
      version: number;
      name: string;
      format: number;
      trainedAt: Date;
      teamDocuments: number;
      totalDocuments: number;
      metrics: Prisma.InputJsonValue;
      artifact: Prisma.InputJsonValue;
      trainedById: string | null;
      /** Registry row this artifact came from (null for pre-registry rows). */
      activeVersionId: string | null;
    },
    client: DbClient = db,
  ) {
    return client.archModel.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: { ...data },
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

  // --------------------------------------------------------------------------- registry versions

  /** The registry row currently serving the organization (null before the registry existed). */
  findActiveVersion(organizationId: string, client: DbClient = db) {
    return client.archModelVersion.findFirst({
      where: { organizationId, status: 'ACTIVE' },
      select: { ...versionSummarySelect, artifact: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  findVersion(organizationId: string, versionId: string, client: DbClient = db) {
    return client.archModelVersion.findFirst({
      where: { organizationId, id: versionId },
      select: { ...versionSummarySelect, artifact: true },
    });
  },

  /** Most recent versions first, metadata only (artifacts can be hundreds of KB each). */
  listVersions(organizationId: string, take: number, client: DbClient = db) {
    return client.archModelVersion.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
      select: versionSummarySelect,
    });
  },

  /** The most recently superseded version — what "rollback" reactivates. */
  findLatestSupersededVersion(organizationId: string, client: DbClient = db) {
    return client.archModelVersion.findFirst({
      where: { organizationId, status: 'SUPERSEDED' },
      select: { ...versionSummarySelect, artifact: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  nextVersionNumber(organizationId: string, client: DbClient = db) {
    return client.archModelVersion.aggregate({ where: { organizationId }, _max: { version: true } }).then((row) => (row._max.version ?? 0) + 1);
  },

  createVersion(
    data: {
      organizationId: string;
      version: number;
      status: string;
      name: string;
      format: number;
      trainedAt: Date;
      teamDocuments: number;
      totalDocuments: number;
      metrics: Prisma.InputJsonValue;
      artifact: Prisma.InputJsonValue;
      evaluation: Prisma.InputJsonValue;
      trigger: string;
      trainedById: string | null;
    },
    client: DbClient = db,
  ) {
    return client.archModelVersion.create({ data, select: versionSummarySelect });
  },

  setVersionStatus(id: string, status: string, client: DbClient = db) {
    return client.archModelVersion.update({ where: { id }, data: { status } });
  },

  // -------------------------------------------------------------------------------- training jobs

  createJob(
    data: { organizationId: string; trigger: string; requestedById: string | null },
    client: DbClient = db,
  ) {
    return client.archModelJob.create({ data: { ...data, status: 'PENDING' } });
  },

  /** True while a training run for this organization is already queued or running. */
  hasOpenJob(organizationId: string, client: DbClient = db) {
    return client.archModelJob
      .count({ where: { organizationId, status: { in: ['PENDING', 'RUNNING'] } } })
      .then((count) => count > 0);
  },

  listJobs(organizationId: string, take: number, client: DbClient = db) {
    return client.archModelJob.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take });
  },

  /** Oldest pending job, whatever organization it belongs to. */
  findNextPendingJob(client: DbClient = db) {
    return client.archModelJob.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
  },

  /**
   * Atomically claim a pending job for this worker. The conditional update means two workers can
   * race for the same row and exactly one wins (the other gets count = 0 and moves on).
   */
  async claimJob(id: string, client: DbClient = db): Promise<boolean> {
    const result = await client.archModelJob.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    return result.count === 1;
  },

  completeJob(id: string, versionId: string, client: DbClient = db) {
    return client.archModelJob.update({ where: { id }, data: { status: 'COMPLETED', versionId, finishedAt: new Date() } });
  },

  failJob(id: string, error: string, client: DbClient = db) {
    return client.archModelJob.update({ where: { id }, data: { status: 'FAILED', error: error.slice(0, 2000), finishedAt: new Date() } });
  },
};
