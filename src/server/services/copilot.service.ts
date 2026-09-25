import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { writeAudit } from '@/lib/audit';
import type { AiSuggestionStatus, AiSuggestionType } from '@/generated/prisma/client';
import { buildKnowledge } from '../ai/arch-model/engine';
import { detectLanguage, looksLikeStackTrace, scrubSecrets } from '../ai/code/analyzer';
import { buildCopilotContext } from '../ai/context';
import { CopilotCallError, LIMITS, callWithGuardrails, redact, truncate } from '../ai/guardrails';
import { buildPrompt } from '../ai/prompts';
import { copilotAttempts, copilotConfig, copilotTimeoutMs, getAiProvider, type CopilotTask } from '../ai/provider';
import {
  parseCodeFix,
  parsePostmortem,
  parseStatusUpdate,
  parseSummary,
  parseTriage,
  suggestionTimelineText,
  type SuggestionOutput,
  type TriageOutput,
} from '../ai/schemas';
import { aiSuggestionRepository } from '../repositories/aiSuggestion.repository';
import { incidentRepository } from '../repositories/incident.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { getOrganizationModel } from './archModel.service';
import { addIncidentCommentInTransaction, updateIncident } from './incident.service';

/**
 * ARCH Copilot service (AGENTS-V2.md).
 *
 * generate:  permission → incident loaded via org-scoped repository (404 across tenants) →
 *            per-org rate limit → MINIMAL redacted context → prompt → provider (timeout, retry
 *            once, validated output) → post-process → persist AiSuggestion(PENDING) + audit.
 * review:    approve applies the draft (timeline entry, or severity/assignee for triage) with the
 *            reviewer recorded; dismiss keeps the row for the audit trail. Both are audited.
 *
 * AI output never changes an incident, a status page or a notification by itself.
 */

export const COPILOT_RATE_LIMIT_WINDOW_MS = 60_000;

const TASK_BY_TYPE: Record<AiSuggestionType, Exclude<CopilotTask, 'code_review'>> = {
  SUMMARY: 'summary',
  TRIAGE: 'triage',
  STATUS_UPDATE: 'status_update',
  POSTMORTEM: 'postmortem',
  CODE_FIX: 'code_fix',
};

const FRIENDLY_FAILURE: Record<CopilotCallError['reason'], string> = {
  timeout: 'ARCH Copilot took too long to respond. Nothing was changed — please try again in a moment.',
  provider_error: 'ARCH Copilot could not reach the AI provider. Nothing was changed — please try again in a moment.',
  invalid_output: 'ARCH Copilot returned a draft it could not validate. Nothing was changed — please try again.',
  not_configured: 'ARCH Copilot is not configured for this workspace. Ask an administrator to check AI_PROVIDER (the default, "arch", needs no setup).',
};

export function copilotRateLimitKey(organizationId: string): string {
  return `copilot:${organizationId}`;
}

type Params = { organizationId: string; userId: string };

async function loadIncident(organizationId: string, incidentId: string) {
  const incident = await incidentRepository.findByIdWithTimeline(organizationId, incidentId);
  if (!incident) throw AppError.notFound('Incident not found.');
  return incident;
}

export async function generateSuggestion(params: Params & { incidentId: string; type: AiSuggestionType; attachment?: string | null }) {
  const { organizationId, userId, incidentId, type } = params;

  await requirePermission(organizationId, userId, 'copilot.generate');
  const incident = await loadIncident(organizationId, incidentId);

  // Per-organization budget (hard rule 5). Checked before any tokens are spent.
  enforceRateLimit(copilotRateLimitKey(organizationId), { limit: env.AI_RATE_LIMIT_PER_MINUTE, windowMs: COPILOT_RATE_LIMIT_WINDOW_MS });

  const task = TASK_BY_TYPE[type];
  let members: { userId: string; role: 'OWNER' | 'ADMIN' | 'RESPONDER' | 'VIEWER' }[] | undefined;
  let openAssignmentsByUser: Map<string, number> | undefined;
  if (type === 'TRIAGE') {
    const [memberRows, load] = await Promise.all([
      organizationRepository.listMembers(organizationId),
      incidentRepository.countOpenByAssignee(organizationId),
    ]);
    members = memberRows.map((member) => ({ userId: member.userId, role: member.role }));
    openAssignmentsByUser = load;
  }

  const { context, candidateRefs } = buildCopilotContext(incident, { members, openAssignmentsByUser });

  if (type === 'CODE_FIX' && params.attachment?.trim()) {
    const raw = params.attachment.trim();
    const language = detectLanguage(raw);
    context.attachment = {
      kind: looksLikeStackTrace(raw) ? 'log' : 'code',
      language,
      text: truncate(redact(scrubSecrets(raw, language)), LIMITS.maxAttachmentChars),
    };
  }

  // ARCH model knowledge: this organization's trained model (similar past incidents, category,
  // severity). The incident itself is excluded so a resolved incident is not "similar to itself".
  // A model problem must never block a responder, so failures fall back to no knowledge.
  try {
    const model = await getOrganizationModel(organizationId);
    context.knowledge = buildKnowledge(model, context, { excludeIds: [`team:${incidentId}`] });
  } catch (error) {
    console.warn(`[copilot] ARCH model unavailable for ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const prompt = buildPrompt(task, context);

  const parse = (text: string): SuggestionOutput => {
    switch (type) {
      case 'SUMMARY':
        return parseSummary(text);
      case 'TRIAGE':
        return parseTriage(text, candidateRefs);
      case 'STATUS_UPDATE':
        return parseStatusUpdate(text);
      case 'POSTMORTEM':
        return parsePostmortem(text);
      case 'CODE_FIX':
        return parseCodeFix(text);
    }
  };

  const config = copilotConfig();
  try {
    const provider = getAiProvider();
    const call = await callWithGuardrails({
      provider,
      task,
      system: prompt.system,
      user: prompt.user,
      maxTokens: type === 'CODE_FIX' || type === 'POSTMORTEM' ? Math.max(env.AI_MAX_TOKENS, 1500) : env.AI_MAX_TOKENS,
      timeoutMs: copilotTimeoutMs(),
      attempts: copilotAttempts(),
      parse,
    });

    return await db.$transaction(async (tx) => {
      const suggestion = await aiSuggestionRepository.create(
        {
          organizationId,
          incidentId,
          type,
          provider: provider.name,
          model: call.result.model,
          promptTokens: call.promptTokens,
          completionTokens: call.completionTokens,
          latencyMs: call.latencyMs,
          output: call.value,
          createdById: userId,
        },
        tx,
      );
      await writeAudit(
        {
          organizationId,
          actorId: userId,
          action: 'copilot.generate',
          entityType: 'ai_suggestion',
          entityId: suggestion.id,
          metadata: {
            incidentId,
            type,
            provider: provider.name,
            model: call.result.model,
            promptTokens: call.promptTokens,
            completionTokens: call.completionTokens,
            attempts: call.attempts,
            latencyMs: call.latencyMs,
            ...(context.knowledge
              ? { knowledge: { category: context.knowledge.likelyCategory, similarIncidents: context.knowledge.similarIncidents.length } }
              : {}),
          },
        },
        tx,
      );
      return suggestion;
    });
  } catch (error) {
    if (!(error instanceof CopilotCallError)) throw error;
    // The failure itself is audited too, so usage and outages are visible to admins.
    await writeAudit({
      organizationId,
      actorId: userId,
      action: 'copilot.generate_failed',
      entityType: 'incident',
      entityId: incidentId,
      metadata: { type, provider: config.provider, model: config.model, reason: error.reason, attempts: error.attempts },
    });
    console.warn(`[copilot] ${type} failed for incident ${incidentId}: ${error.reason} after ${error.attempts} attempt(s)`);
    throw AppError.unavailable(FRIENDLY_FAILURE[error.reason], { reason: error.reason });
  }
}

export async function listSuggestions(params: Params & { incidentId: string; status?: AiSuggestionStatus }) {
  await requirePermission(params.organizationId, params.userId, 'copilot.read');
  await loadIncident(params.organizationId, params.incidentId);
  return aiSuggestionRepository.listForIncident(params.organizationId, params.incidentId, { status: params.status });
}

async function loadPendingSuggestion(organizationId: string, suggestionId: string) {
  const suggestion = await aiSuggestionRepository.findById(organizationId, suggestionId);
  if (!suggestion) throw AppError.notFound('Suggestion not found.');
  if (suggestion.status !== 'PENDING') {
    throw AppError.conflict(`This draft was already ${suggestion.status.toLowerCase()}.`, { status: suggestion.status });
  }
  return suggestion;
}

/**
 * Approve a draft. Only OWNER/ADMIN/RESPONDER (VIEWER → 403). The reviewer and timestamp are
 * recorded on the row and in the audit log.
 *
 *  - SUMMARY / STATUS_UPDATE / POSTMORTEM → posted to the incident timeline as a comment (the
 *    reviewer may edit the text first). A status update therefore becomes the incident's latest
 *    update on any published status page — because a human approved it, not because AI wrote it.
 *  - TRIAGE → severity and/or assignee applied through the normal incident service, so the usual
 *    timeline events, audit rows and notifications happen.
 */
export async function approveSuggestion(params: Params & { suggestionId: string; text?: string | null }) {
  const { organizationId, userId, suggestionId } = params;
  await requirePermission(organizationId, userId, 'copilot.review');
  const suggestion = await loadPendingSuggestion(organizationId, suggestionId);
  const reviewedAt = new Date();

  if (suggestion.type === 'TRIAGE') {
    const output = suggestion.output as TriageOutput;
    const incident = await loadIncident(organizationId, suggestion.incidentId);

    const changes: { severity?: TriageOutput['severity']; assignedToId?: string } = {};
    if (output.severity && output.severity !== incident.severity) changes.severity = output.severity;
    if (output.assigneeId && output.assigneeId !== incident.assignedToId) {
      // Membership may have changed since the draft was generated.
      const stillMember = await organizationRepository.findMembership(organizationId, output.assigneeId);
      if (stillMember) changes.assignedToId = output.assigneeId;
    }

    if (!(await aiSuggestionRepository.review(organizationId, suggestionId, { status: 'APPROVED', reviewedById: userId, reviewedAt }))) {
      throw AppError.conflict('This draft was already reviewed by someone else.');
    }
    try {
      if (Object.keys(changes).length > 0) {
        await updateIncident({
          organizationId,
          userId,
          incidentId: suggestion.incidentId,
          input: { ...changes, message: `Applied ARCH Copilot triage suggestion: ${output.rationale}` },
        });
      }
    } catch (error) {
      await aiSuggestionRepository.reopen(organizationId, suggestionId);
      throw error;
    }
    await writeAudit({
      organizationId,
      actorId: userId,
      action: 'copilot.approve',
      entityType: 'ai_suggestion',
      entityId: suggestionId,
      metadata: { incidentId: suggestion.incidentId, type: suggestion.type, applied: changes },
    });
    return aiSuggestionRepository.findById(organizationId, suggestionId);
  }

  const draftText = suggestionTimelineText(suggestion.type, suggestion.output);
  const edited = typeof params.text === 'string' && params.text.trim().length > 0 && params.text.trim() !== draftText;
  const body = (edited ? params.text!.trim() : draftText)?.slice(0, 10_000);
  if (!body) throw AppError.badRequest('This draft has no text to post.');

  await db.$transaction(async (tx) => {
    if (!(await aiSuggestionRepository.review(organizationId, suggestionId, { status: 'APPROVED', reviewedById: userId, reviewedAt }, tx))) {
      throw AppError.conflict('This draft was already reviewed by someone else.');
    }
    const incident = await incidentRepository.findById(organizationId, suggestion.incidentId, tx);
    if (!incident) throw AppError.notFound('Incident not found.');

    const event = await addIncidentCommentInTransaction(tx, {
      organizationId,
      userId,
      incident,
      body,
      metadata: { source: 'copilot', suggestionId, suggestionType: suggestion.type, edited },
    });
    await aiSuggestionRepository.setAppliedEvent(organizationId, suggestionId, event.id, tx);
    await writeAudit(
      {
        organizationId,
        actorId: userId,
        action: 'copilot.approve',
        entityType: 'ai_suggestion',
        entityId: suggestionId,
        metadata: { incidentId: suggestion.incidentId, type: suggestion.type, timelineEventId: event.id, edited },
      },
      tx,
    );
  });

  return aiSuggestionRepository.findById(organizationId, suggestionId);
}

/** Dismiss a draft: it leaves the pending list but the row stays for the audit trail. */
export async function dismissSuggestion(params: Params & { suggestionId: string }) {
  const { organizationId, userId, suggestionId } = params;
  await requirePermission(organizationId, userId, 'copilot.review');
  const suggestion = await loadPendingSuggestion(organizationId, suggestionId);

  await db.$transaction(async (tx) => {
    if (!(await aiSuggestionRepository.review(organizationId, suggestionId, { status: 'DISMISSED', reviewedById: userId, reviewedAt: new Date() }, tx))) {
      throw AppError.conflict('This draft was already reviewed by someone else.');
    }
    await writeAudit(
      {
        organizationId,
        actorId: userId,
        action: 'copilot.dismiss',
        entityType: 'ai_suggestion',
        entityId: suggestionId,
        metadata: { incidentId: suggestion.incidentId, type: suggestion.type },
      },
      tx,
    );
  });

  return aiSuggestionRepository.findById(organizationId, suggestionId);
}
