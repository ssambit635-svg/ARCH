import { db, type DbClient } from '@/lib/db';
import type { KnowledgeSourceKind, KnowledgeSourceStatus } from '@/generated/prisma/client';

/**
 * V6 — knowledge sources (RAG).
 *
 * Every query is organization-scoped: one tenant's runbooks can never be retrieved for another.
 * Chunks are deleted with their source, so removing a document leaves nothing behind to retrieve.
 */

const sourceSelect = {
  id: true,
  organizationId: true,
  name: true,
  kind: true,
  status: true,
  sourceUrl: true,
  contentHash: true,
  chunkCount: true,
  tokenCount: true,
  error: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const chunkSelect = {
  id: true,
  organizationId: true,
  sourceId: true,
  ordinal: true,
  heading: true,
  text: true,
  tokenCount: true,
  embedding: true,
  createdAt: true,
  source: { select: { name: true, kind: true, sourceUrl: true } },
} as const;

export const knowledgeSourceRepository = {
  list(organizationId: string, take = 100, client: DbClient = db) {
    return client.knowledgeSource.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
      select: sourceSelect,
    });
  },

  /** Cross-tenant ids return null, so callers answer 404 rather than 403. */
  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.knowledgeSource.findFirst({ where: { organizationId, id }, select: sourceSelect });
  },

  /** Same content already indexed for this organization → skip re-embedding. */
  findByContentHash(organizationId: string, contentHash: string, client: DbClient = db) {
    return client.knowledgeSource.findFirst({ where: { organizationId, contentHash }, select: sourceSelect });
  },

  create(
    data: {
      organizationId: string;
      name: string;
      kind: string;
      status?: string;
      sourceUrl?: string | null;
      contentHash?: string | null;
      createdById?: string | null;
    },
    client: DbClient = db,
  ) {
    return client.knowledgeSource.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        kind: data.kind as KnowledgeSourceKind,
        status: (data.status ?? 'PENDING') as KnowledgeSourceStatus,
        sourceUrl: data.sourceUrl ?? null,
        contentHash: data.contentHash ?? null,
        createdById: data.createdById ?? null,
      },
      select: sourceSelect,
    });
  },

  markReady(
    id: string,
    data: { chunkCount: number; tokenCount: number },
    client: DbClient = db,
  ) {
    return client.knowledgeSource.update({
      where: { id },
      data: { status: 'READY', chunkCount: data.chunkCount, tokenCount: data.tokenCount, error: null },
      select: sourceSelect,
    });
  },

  markFailed(id: string, error: string, client: DbClient = db) {
    return client.knowledgeSource.update({ where: { id }, data: { status: 'FAILED', error: error.slice(0, 500) }, select: sourceSelect });
  },

  /** Deleting a source deletes its chunks (cascade in the migration). */
  async delete(organizationId: string, id: string, client: DbClient = db): Promise<boolean> {
    const result = await client.knowledgeSource.deleteMany({ where: { organizationId, id } });
    return result.count === 1;
  },

  countChunks(organizationId: string, client: DbClient = db) {
    return client.knowledgeChunk.count({ where: { organizationId } });
  },

  // ----------------------------------------------------------------------------------- chunks

  /** Every chunk of an organization, for retrieval. Bounded: a workspace with a huge corpus is
   *  expected to filter by source, and the cap keeps a single request honest. */
  listChunks(organizationId: string, options: { take?: number; sourceIds?: string[] } = {}, client: DbClient = db) {
    const take = Math.min(Math.max(options.take ?? 500, 1), 2_000);
    return client.knowledgeChunk.findMany({
      where: { organizationId, ...(options.sourceIds?.length ? { sourceId: { in: options.sourceIds } } : {}) },
      orderBy: [{ sourceId: 'asc' }, { ordinal: 'asc' }],
      take,
      select: chunkSelect,
    });
  },

  /** Chunks shaped like training documents, so the model can index them like any other corpus. */
  listChunksForTraining(organizationId: string, take = 4_000, client: DbClient = db) {
    return client.knowledgeChunk.findMany({
      where: { organizationId },
      orderBy: [{ sourceId: 'asc' }, { ordinal: 'asc' }],
      take,
      select: { id: true, sourceId: true, ordinal: true, heading: true, text: true, source: { select: { name: true, kind: true, sourceUrl: true } } },
    });
  },

  replaceChunks(
    sourceId: string,
    organizationId: string,
    chunks: { ordinal: number; heading: string | null; text: string; tokenCount: number; embedding: number[] }[],
    client: DbClient = db,
  ) {
    return client.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { sourceId, organizationId } });
      if (chunks.length === 0) return [];
      await tx.knowledgeChunk.createMany({
        data: chunks.map((chunk) => ({ ...chunk, sourceId, organizationId })),
      });
      return tx.knowledgeChunk.findMany({ where: { sourceId, organizationId }, orderBy: { ordinal: 'asc' }, select: chunkSelect });
    });
  },
};
