import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { aiSuggestionRepository } from '@/server/repositories/aiSuggestion.repository';
import { repoConnectionRepository } from '@/server/repositories/repoConnection.repository';
import { fixVerificationRepository } from '@/server/repositories/fixVerification.repository';
import { pullRequestRepository } from '@/server/repositories/pullRequest.repository';
import { verifyPatchInSandbox, SANDBOX_DEFAULT_TIMEOUT_MS } from './sandbox.service';
import { createPullRequest } from './github.service';
import { buildKnowledge } from '@/server/ai/arch-model/engine';
import { buildCopilotContext } from '@/server/ai/context';
import { getOrganizationModel } from './archModel.service';
import { analyzeCode, detectLanguage, looksLikeStackTrace, scrubSecrets } from '@/server/ai/code/analyzer';
import { LIMITS, redact, truncate } from '@/server/ai/guardrails';
import { buildPrompt } from '@/server/ai/prompts';
import { callWithGuardrails, CopilotCallError } from '@/server/ai/guardrails';
import { copilotConfig, copilotTimeoutMs, copilotAttempts, getAiProvider } from '@/server/ai/provider';
import { parseCodeFix, parseVerifiedFix, suggestionTimelineText } from '@/server/ai/schemas';
import { enforceRateLimit } from '@/lib/rate-limit';
import { env } from '@/lib/env';

/**
 * V4 — Verified Fix Loop service.
 *
 * Flow:
 * 1. Incident + stack trace + code context → proposed patch (never auto-apply)
 * 2. Isolated sandbox me patch + tests chalao (no prod credentials, temporary container)
 * 3. UI: diff + test results + evidence bundle → human approve → PR create → audit log
 * 4. Tests + safeguards (unsafe fix, timeout, sandbox escape)
 *
 * Same EngineOutput interface, same draft→approval pattern, same audit log as V2/V3.
 */

const VERIFIED_FIX_RATE_LIMIT_WINDOW_MS = 60_000;

function rateLimitKey(orgId: string): string {
  return `verified-fix:${orgId}`;
}

async function loadIncident(organizationId: string, incidentId: string) {
  const incident = await incidentRepository.findByIdWithTimeline(organizationId, incidentId);
  if (!incident) throw AppError.notFound('Incident not found.');
  return incident;
}

/**
 * Generate a verified fix draft: same as CODE_FIX but with repo context and commit pinning.
 * Returns AiSuggestion (PENDING) with patch.
 */
export async function generateVerifiedFix(params: {
  organizationId: string;
  userId: string;
  incidentId: string;
  attachment?: string | null;
  repoConnectionId?: string | null;
  commitSha?: string | null;
  testCommand?: string | null;
}) {
  const { organizationId, userId, incidentId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  enforceRateLimit(rateLimitKey(organizationId), { limit: env.AI_RATE_LIMIT_PER_MINUTE, windowMs: VERIFIED_FIX_RATE_LIMIT_WINDOW_MS });

  const incident = await loadIncident(organizationId, incidentId);

  // Resolve repo connection + commit pinning (M1)
  let repoConnection: Awaited<ReturnType<typeof repoConnectionRepository.findById>> = null;
  let pinnedSha: string | null = params.commitSha ?? null;

  if (params.repoConnectionId) {
    repoConnection = await repoConnectionRepository.findById(organizationId, params.repoConnectionId);
    if (!repoConnection) throw AppError.notFound('Repository connection not found.');
    if (!repoConnection.isActive) throw AppError.badRequest('Repository connection is inactive.');
    pinnedSha = pinnedSha ?? repoConnection.pinnedCommitSha ?? null;
  } else {
    // Use default active connection if any
    const connections = await repoConnectionRepository.list(organizationId);
    if (connections.length > 0) {
      repoConnection = connections[0]!;
      pinnedSha = pinnedSha ?? repoConnection.pinnedCommitSha ?? null;
    }
  }

  // Build copilot context (minimal, redacted, org-scoped)
  const { context, candidateRefs } = buildCopilotContext(incident, {});

  if (params.attachment?.trim()) {
    const raw = params.attachment.trim();
    const language = detectLanguage(raw);
    context.attachment = {
      kind: looksLikeStackTrace(raw) ? 'log' : 'code',
      language,
      text: truncate(redact(scrubSecrets(raw, language)), LIMITS.maxAttachmentChars),
    };
  }

  // ARCH model knowledge (team history + pattern library)
  try {
    const model = await getOrganizationModel(organizationId);
    context.knowledge = buildKnowledge(model, context, { excludeIds: [`team:${incidentId}`], includeCodeCorpus: true });
  } catch (error) {
    console.warn(`[verified-fix] ARCH model unavailable for ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Build prompt for VERIFIED_FIX (same as CODE_FIX but with repo@commit context)
  const task = 'verified_fix' as const;
  const prompt = buildPrompt(task, context);

  // Add repo context to prompt if available
  let systemPrompt = prompt.system;
  if (repoConnection) {
    systemPrompt += `\n\nRepository context: ${repoConnection.fullName} @ ${pinnedSha ?? repoConnection.defaultBranch} (pinned commit). Generate a patch relative to this commit.`;
  }
  if (params.testCommand) {
    systemPrompt += `\nTest command that will be used to verify the fix: ${params.testCommand}`;
  }

  const parse = (text: string) => {
    try {
      // Try VERIFIED_FIX schema first, fallback to CODE_FIX
      return parseVerifiedFix(text);
    } catch {
      return parseCodeFix(text);
    }
  };

  const config = copilotConfig();
  try {
    const provider = getAiProvider();
    const call = await callWithGuardrails({
      provider,
      task,
      system: systemPrompt,
      user: prompt.user,
      maxTokens: Math.max(env.AI_MAX_TOKENS, 1500),
      timeoutMs: copilotTimeoutMs(),
      attempts: copilotAttempts(),
      parse,
    });

    // Persist as AiSuggestion with type VERIFIED_FIX (verified fix loop is always VERIFIED_FIX)
    const output = call.value as { patch?: string; diagnosis?: string; suggestedFixes?: string[]; likelyCause?: string; testPlan?: string[] };

    const suggestion = await db.$transaction(async (tx) => {
      const created = await aiSuggestionRepository.create(
        {
          organizationId,
          incidentId,
          type: 'VERIFIED_FIX',
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
          entityId: created.id,
          metadata: {
            incidentId,
            type: 'VERIFIED_FIX',
            provider: provider.name,
            model: call.result.model,
            repoConnectionId: repoConnection?.id ?? null,
            commitSha: pinnedSha,
            testCommand: params.testCommand ?? null,
          },
        },
        tx,
      );
      return created;
    });

    // If testCommand provided or repo connected, automatically trigger verification (M3)
    let verification: Awaited<ReturnType<typeof fixVerificationRepository.create>> | null = null;
    if (output.patch) {
      try {
        verification = await verifyFix({
          organizationId,
          userId,
          incidentId,
          suggestionId: suggestion.id,
          repoConnectionId: repoConnection?.id ?? null,
          commitSha: pinnedSha,
          patch: output.patch,
          testCommand: params.testCommand ?? 'npm test',
        });
      } catch (err) {
        console.warn(`[verified-fix] auto-verification failed for ${suggestion.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { suggestion, verification, repoConnection, commitSha: pinnedSha };
  } catch (error) {
    if (!(error instanceof CopilotCallError)) throw error;
    await writeAudit({
      organizationId,
      actorId: userId,
      action: 'copilot.generate_failed',
      entityType: 'incident',
      entityId: incidentId,
      metadata: { type: 'VERIFIED_FIX', provider: config.provider, model: config.model, reason: error.reason, attempts: error.attempts, repoConnectionId: repoConnection?.id ?? null },
    });
    throw AppError.unavailable('ARCH Copilot could not generate a verified fix. Please try again.', { reason: error.reason });
  }
}

/**
 * Verify an existing patch suggestion in isolated sandbox (M3).
 * Creates FixVerification record, runs sandbox, updates with evidence bundle.
 */
export async function verifyFix(params: {
  organizationId: string;
  userId: string;
  incidentId: string;
  suggestionId: string;
  repoConnectionId?: string | null;
  commitSha?: string | null;
  patch: string;
  testCommand?: string | null;
  timeoutMs?: number;
}) {
  await requirePermission(params.organizationId, params.userId, 'fix.verify');

  const incident = await loadIncident(params.organizationId, params.incidentId);
  const suggestion = await aiSuggestionRepository.findById(params.organizationId, params.suggestionId);
  if (!suggestion) throw AppError.notFound('Suggestion not found.');
  if (suggestion.incidentId !== params.incidentId) throw AppError.notFound('Suggestion not found for this incident.');

  // Resolve repo connection and commit SHA
  let repoConnection: Awaited<ReturnType<typeof repoConnectionRepository.findById>> = null;
  let commitSha = params.commitSha ?? null;

  if (params.repoConnectionId) {
    repoConnection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
    if (!repoConnection) throw AppError.notFound('Repository connection not found.');
    commitSha = commitSha ?? repoConnection.pinnedCommitSha ?? null;
  }

  // Create verification record PENDING
  const verification = await fixVerificationRepository.create({
    organizationId: params.organizationId,
    incidentId: params.incidentId,
    suggestionId: params.suggestionId,
    repoConnectionId: repoConnection?.id ?? null,
    commitSha,
    patch: params.patch,
    testCommand: params.testCommand ?? 'npm test',
    status: 'PENDING',
    createdById: params.userId,
  });

  await writeAudit({
    organizationId: params.organizationId,
    actorId: params.userId,
    action: 'fix.verify',
    entityType: 'fix_verification',
    entityId: verification.id,
    metadata: {
      incidentId: params.incidentId,
      suggestionId: params.suggestionId,
      repoConnectionId: repoConnection?.id ?? null,
      commitSha,
      testCommand: params.testCommand ?? 'npm test',
    },
  });

  // Mark RUNNING
  await fixVerificationRepository.setRunning(verification.id);

  // Run in sandbox (isolated, no prod credentials, timeout, temp container)
  const result = await verifyPatchInSandbox({
    patch: params.patch,
    commitSha,
    testCommand: params.testCommand ?? 'npm test',
    timeoutMs: params.timeoutMs ?? SANDBOX_DEFAULT_TIMEOUT_MS,
  });

  // Update with results
  const updated = await db.$transaction(async (tx) => {
    const finished = await fixVerificationRepository.update(
      verification.id,
      {
        status: result.status,
        testOutput: result.testOutput,
        evidence: result.evidence as never,
        durationMs: result.durationMs,
        finishedAt: new Date(),
      },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: `fix.verify_${result.status.toLowerCase()}`,
        entityType: 'fix_verification',
        entityId: verification.id,
        metadata: {
          incidentId: params.incidentId,
          suggestionId: params.suggestionId,
          status: result.status,
          durationMs: result.durationMs,
          commitSha,
          patchHash: result.evidence.patchHash,
          testCommand: result.testCommand,
        },
      },
      tx,
    );
    return finished;
  });

  return updated;
}

/**
 * List verifications for an incident (M4 UI needs diff + test results + evidence bundle)
 */
export async function listVerifications(params: { organizationId: string; userId: string; incidentId: string }) {
  await requirePermission(params.organizationId, params.userId, 'copilot.read');
  await loadIncident(params.organizationId, params.incidentId);
  return fixVerificationRepository.listForIncident(params.organizationId, params.incidentId);
}

/**
 * Approve verification and create PR (M4: human approve → PR create → audit log)
 * Only if verification PASSED, and human explicitly approves.
 */
export async function approveAndCreatePr(params: {
  organizationId: string;
  userId: string;
  verificationId: string;
  title?: string | null;
  body?: string | null;
}) {
  await requirePermission(params.organizationId, params.userId, 'fix.approve');

  const verification = await fixVerificationRepository.findById(params.organizationId, params.verificationId);
  if (!verification) throw AppError.notFound('Verification not found.');
  if (verification.status !== 'PASSED') {
    throw AppError.badRequest(`Cannot create PR: verification status is ${verification.status}, expected PASSED.`, { status: verification.status });
  }

  // Check if PR already exists for this verification
  const existingPr = await pullRequestRepository.findByVerification(params.organizationId, params.verificationId);
  if (existingPr) {
    throw AppError.conflict('A pull request already exists for this verification.', { prId: existingPr.id });
  }

  if (!verification.repoConnectionId) {
    throw AppError.badRequest('Verification has no repository connection — cannot create PR.');
  }

  const repoConnection = await repoConnectionRepository.findById(params.organizationId, verification.repoConnectionId);
  if (!repoConnection) throw AppError.notFound('Repository connection not found.');
  if (!repoConnection.isActive) throw AppError.badRequest('Repository connection is inactive.');

  const incident = await incidentRepository.findById(params.organizationId, verification.incidentId);
  if (!incident) throw AppError.notFound('Incident not found.');

  const suggestion = await aiSuggestionRepository.findById(params.organizationId, verification.suggestionId);
  if (!suggestion) throw AppError.notFound('Suggestion not found.');

  // Generate PR title/body
  const title = params.title?.trim() || `Fix: ${incident.title} (incident ${incident.id.slice(0, 8)})`;
  const body =
    params.body?.trim() ||
    `Automated fix for incident ${incident.id}\n\n**Incident:** ${incident.title}\n**Severity:** ${incident.severity}\n**Repo:** ${repoConnection.fullName} @ ${verification.commitSha ?? repoConnection.pinnedCommitSha ?? 'main'}\n\n**Diagnosis:** ${(suggestion.output as { diagnosis?: string })?.diagnosis ?? 'N/A'}\n\n**Verification:**\n- Status: ${verification.status}\n- Duration: ${verification.durationMs ?? 0}ms\n- Commit: ${verification.commitSha ?? 'none'}\n- Test command: ${verification.testCommand ?? 'none'}\n\n**Evidence bundle:**\n\`\`\`json\n${JSON.stringify(verification.evidence, null, 2).slice(0, 3000)}\n\`\`\`\n\n---\n*This PR was generated by ARCH Verified Fix Loop and approved by a human. Patch tested in isolated sandbox with no prod credentials.*`;

  // Create PR via GitHub service (mocked offline)
  const prResult = await createPullRequest({
    organizationId: params.organizationId,
    repoOwner: repoConnection.owner,
    repoName: repoConnection.repo,
    fullName: repoConnection.fullName,
    baseBranch: repoConnection.defaultBranch,
    commitSha: verification.commitSha ?? repoConnection.pinnedCommitSha ?? null,
    title,
    body,
    patch: verification.patch,
    incidentId: incident.id,
  });

  // Persist PR record
  const pr = await db.$transaction(async (tx) => {
    const created = await pullRequestRepository.create(
      {
        organizationId: params.organizationId,
        incidentId: incident.id,
        suggestionId: verification.suggestionId,
        verificationId: verification.id,
        repoConnectionId: repoConnection.id,
        title: prResult.title,
        body: prResult.body,
        branch: prResult.branch,
        baseBranch: repoConnection.defaultBranch,
        commitSha: prResult.commitSha,
        patch: verification.patch,
        externalUrl: prResult.externalUrl,
        createdById: params.userId,
        status: 'OPEN',
      },
      tx,
    );

    // Also mark suggestion as APPROVED if not already
    if (suggestion.status === 'PENDING') {
      await aiSuggestionRepository.review(params.organizationId, suggestion.id, { status: 'APPROVED', reviewedById: params.userId, reviewedAt: new Date() }, tx);
    }

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'pr.create',
        entityType: 'pull_request',
        entityId: created.id,
        metadata: {
          incidentId: incident.id,
          verificationId: verification.id,
          repoConnectionId: repoConnection.id,
          fullName: repoConnection.fullName,
          branch: prResult.branch,
          commitSha: prResult.commitSha,
          externalUrl: prResult.externalUrl,
        },
      },
      tx,
    );

    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'copilot.approve',
        entityType: 'ai_suggestion',
        entityId: suggestion.id,
        metadata: {
          incidentId: incident.id,
          type: suggestion.type,
          verificationId: verification.id,
          prId: created.id,
          approvedWithEvidence: true,
        },
      },
      tx,
    );

    return created;
  });

  return pr;
}

/**
 * Get PRs for incident
 */
export async function listPullRequests(params: { organizationId: string; userId: string; incidentId: string }) {
  await requirePermission(params.organizationId, params.userId, 'pr.read');
  await loadIncident(params.organizationId, params.incidentId);
  return pullRequestRepository.listForIncident(params.organizationId, params.incidentId);
}
