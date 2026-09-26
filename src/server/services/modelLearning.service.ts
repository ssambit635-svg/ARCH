import { writeAudit } from '@/lib/audit';
import { clip } from '../ai/arch-model/text';
import { modelFeedbackRepository } from '../repositories/modelFeedback.repository';

/**
 * V6 — active learning.
 *
 * The cheapest training data in the product is the work responders already do: approving a draft,
 * rewriting it, throwing it away, or setting the severity themselves. Each of those is a label the
 * model can learn from, so this service records them as feedback rows. Nothing here is required
 * for ARCH to work — every call site treats a failure as non-fatal — but without it the model
 * never improves from experience.
 *
 * What is stored is deliberately small and redacted by the caller: the task, the kind of
 * correction, the original output and what the human settled on.
 */

export type FeedbackKind = 'DRAFT_EDITED' | 'DRAFT_APPROVED' | 'DRAFT_DISMISSED' | 'SEVERITY_CORRECTED' | 'CATEGORY_CORRECTED';

type BaseParams = {
  organizationId: string;
  userId: string;
  incidentId?: string | null;
  suggestionId?: string | null;
  task: string;
};

/** A draft the responder accepted as-is: positive signal, weakest weight. */
export async function recordDraftApproved(params: BaseParams): Promise<void> {
  await save({ ...params, kind: 'DRAFT_APPROVED', corrected: { approved: true } });
}

/**
 * A draft the responder rewrote before approving. The edit is the most valuable label ARCH gets:
 * it shows exactly where the model's wording or judgement was off.
 */
export async function recordDraftEdited(params: BaseParams & { original: unknown; edited: string }): Promise<void> {
  await save({
    ...params,
    kind: 'DRAFT_EDITED',
    original: params.original as object,
    corrected: { text: clip(params.edited, 2_000) },
  });
}

/** A draft thrown away: negative signal, kept for the audit trail and for tuning thresholds. */
export async function recordDraftDismissed(params: BaseParams & { original?: unknown }): Promise<void> {
  await save({ ...params, kind: 'DRAFT_DISMISSED', original: (params.original ?? null) as object | null });
}

/**
 * A severity a human set that differs from what the model predicted. `predicted` is the model's
 * guess at the time, so a retrain can measure whether corrections are being learned.
 */
export async function recordSeverityCorrection(
  params: BaseParams & { incidentText: string; predicted: string; actual: string },
): Promise<void> {
  if (params.predicted === params.actual) return; // agreement is not a correction
  await save({
    ...params,
    task: 'severity',
    kind: 'SEVERITY_CORRECTED',
    original: { severity: params.predicted },
    corrected: { severity: params.actual, incidentText: clip(params.incidentText, 2_000) },
  });
}

async function save(params: BaseParams & { kind: FeedbackKind; original?: object | null; corrected?: object }): Promise<void> {
  try {
    await modelFeedbackRepository.create({
      organizationId: params.organizationId,
      incidentId: params.incidentId ?? null,
      suggestionId: params.suggestionId ?? null,
      task: params.task,
      kind: params.kind,
      ...(params.original ? { original: params.original } : {}),
      ...(params.corrected ? { corrected: params.corrected } : {}),
      createdById: params.userId,
    });
  } catch (error) {
    // Learning must never break the responder's flow.
    console.warn(`[arch-model] feedback not recorded for ${params.organizationId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Exposed so the dashboard can explain what the model is learning from. */
export async function feedbackSummary(organizationId: string) {
  const rows = await modelFeedbackRepository.list(organizationId, { take: 500 });
  const byKind = new Map<string, number>();
  for (const row of rows) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1);
  return {
    total: rows.length,
    byKind: Object.fromEntries(byKind),
    last: rows[0] ? { task: rows[0].task, kind: rows[0].kind, createdAt: rows[0].createdAt.toISOString() } : null,
  };
}

/** Audit a correction so the trail shows what the model was taught, not just what it did. */
export async function auditFeedback(organizationId: string, userId: string, kind: FeedbackKind, incidentId: string): Promise<void> {
  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'arch_model.feedback',
    entityType: 'incident',
    entityId: incidentId,
    metadata: { kind },
  }).catch(() => undefined);
}
