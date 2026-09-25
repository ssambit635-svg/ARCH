import { db, type DbClient } from '@/lib/db';
import type { AiSuggestionStatus, AiSuggestionType } from '@/generated/prisma/client';

/**
 * ARCH Copilot drafts. Every query takes `organizationId` and filters on it — a suggestion id
 * from another tenant behaves exactly like an id that does not exist.
 */

const people = {
  createdBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
} as const;

export const aiSuggestionRepository = {
  create(
    data: {
      organizationId: string;
      incidentId: string;
      type: AiSuggestionType;
      provider: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      latencyMs: number;
      output: unknown;
      createdById: string;
    },
    client: DbClient = db,
  ) {
    return client.aiSuggestion.create({ data: { ...data, status: 'PENDING', output: data.output as never }, include: people });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.aiSuggestion.findFirst({ where: { id, organizationId }, include: people });
  },

  listForIncident(organizationId: string, incidentId: string, filters: { status?: AiSuggestionStatus } = {}, client: DbClient = db) {
    return client.aiSuggestion.findMany({
      where: { organizationId, incidentId, ...(filters.status ? { status: filters.status } : {}) },
      include: people,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },

  /**
   * Move a PENDING draft to APPROVED/DISMISSED. Conditional on the current status so two people
   * clicking at the same time cannot both review it: returns false if someone else got there first.
   */
  async review(
    organizationId: string,
    id: string,
    data: { status: 'APPROVED' | 'DISMISSED'; reviewedById: string; reviewedAt: Date },
    client: DbClient = db,
  ): Promise<boolean> {
    const result = await client.aiSuggestion.updateMany({ where: { id, organizationId, status: 'PENDING' }, data });
    return result.count === 1;
  },

  /** Undo a claim when applying an approved draft failed. */
  async reopen(organizationId: string, id: string, client: DbClient = db): Promise<void> {
    await client.aiSuggestion.updateMany({
      where: { id, organizationId, status: 'APPROVED' },
      data: { status: 'PENDING', reviewedById: null, reviewedAt: null },
    });
  },

  async setAppliedEvent(organizationId: string, id: string, appliedEventId: string, client: DbClient = db): Promise<void> {
    await client.aiSuggestion.updateMany({ where: { id, organizationId }, data: { appliedEventId } });
  },
};
