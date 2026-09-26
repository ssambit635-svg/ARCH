import { db, type DbClient } from '@/lib/db';
import type { ArchModelFeedbackKind, Prisma } from '@/generated/prisma/client';

/**
 * V6 — active-learning feedback. Every row is a human judgement about a model output, captured
 * during ordinary product use (approve / edit / dismiss / correct the severity). The next training
 * run folds these in as extra labels.
 *
 * Tenant-scoped like every other repository.
 */

const feedbackSelect = {
  id: true,
  organizationId: true,
  incidentId: true,
  suggestionId: true,
  task: true,
  kind: true,
  original: true,
  corrected: true,
  createdById: true,
  createdAt: true,
} as const;

export const modelFeedbackRepository = {
  /** Newest first — the freshest corrections matter most. */
  list(organizationId: string, options: { take?: number; task?: string; kind?: string } = {}, client: DbClient = db) {
    return client.archModelFeedback.findMany({
      where: {
        organizationId,
        ...(options.task ? { task: options.task } : {}),
        ...(options.kind ? { kind: options.kind as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(options.take ?? 200, 1), 2_000),
      select: feedbackSelect,
    });
  },

  count(organizationId: string, client: DbClient = db) {
    return client.archModelFeedback.count({ where: { organizationId } });
  },

  create(
    data: {
      organizationId: string;
      incidentId?: string | null;
      suggestionId?: string | null;
      task: string;
      kind: string;
      original?: Prisma.InputJsonValue;
      corrected?: Prisma.InputJsonValue;
      createdById?: string | null;
    },
    client: DbClient = db,
  ) {
    const { original, corrected, ...rest } = data;
    return client.archModelFeedback.create({
      data: {
        ...rest,
        kind: data.kind as ArchModelFeedbackKind,
        ...(original === undefined ? {} : { original }),
        ...(corrected === undefined ? {} : { corrected }),
      },
      select: feedbackSelect,
    });
  },

  /**
   * Feedback rows for training: only the ones that carry a label the classifiers can use, with the
   * incident text they refer to (so the example can be tokenized the same way at training time).
   */
  listForTraining(organizationId: string, take = 500, client: DbClient = db) {
    return client.archModelFeedback.findMany({
      where: {
        organizationId,
        kind: { in: ['SEVERITY_CORRECTED', 'CATEGORY_CORRECTED', 'DRAFT_EDITED'] },
        incidentId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        incidentId: true,
        task: true,
        kind: true,
        corrected: true,
        incident: { select: { title: true, events: { select: { body: true }, orderBy: { createdAt: 'asc' as const }, take: 50 } } },
      },
    });
  },
};
