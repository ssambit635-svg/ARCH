import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { writeAudit } from '@/lib/audit';
import { analyzeCode, scrubSecrets, MAX_CODE_CHARS, type CodeAnalysis, type CodeLanguage } from '../ai/code/analyzer';
import { buildCodeReviewInput, buildCodeReviewOutput, type CodeReviewMode } from '../ai/code/review';
import { CopilotCallError, callWithGuardrails } from '../ai/guardrails';
import { buildCodeReviewPrompt } from '../ai/prompts';
import { copilotAttempts, copilotConfig, copilotTimeoutMs, getAiProvider } from '../ai/provider';
import { parseCodeReview, type CodeReviewOutput } from '../ai/schemas';
import { COPILOT_RATE_LIMIT_WINDOW_MS, copilotRateLimitKey } from './copilot.service';

/**
 * ARCH Code Assist — "make this code better" / "explain this stack trace", on your own server.
 *
 *   1. The built-in analyzer always runs on the raw code (secrets are detected, never echoed).
 *   2. AI_PROVIDER="arch": the analyzer's answer is returned directly — no model call at all.
 *      AI_PROVIDER="arch-hybrid": the code (with secrets scrubbed) + analyzer findings go to the
 *      LOCAL LLM for a deeper review / rewrite; the analyzer answers if the LLM is unavailable.
 *   3. The code is not stored. The audit log records who asked, the language and the finding
 *      counts — never the code itself.
 */

export type CodeReviewResult = CodeReviewOutput & {
  provider: string;
  model: string;
  latencyMs: number;
  language: CodeLanguage;
  kind: CodeAnalysis['kind'];
  diagnoses: CodeAnalysis['diagnoses'];
  topFrame: CodeAnalysis['topFrame'];
  metrics: CodeAnalysis['metrics'];
  appliedFixes: string[];
};

const FRIENDLY_FAILURE: Record<CopilotCallError['reason'], string> = {
  timeout: 'Code Assist took too long to respond. Try a smaller snippet or try again.',
  provider_error: 'Code Assist could not reach the local model. Try again in a moment.',
  invalid_output: 'Code Assist produced an answer it could not validate. Please try again.',
  not_configured: 'Code Assist is not configured. Ask an administrator to check AI_PROVIDER.',
};

export async function reviewCode(params: { organizationId: string; userId: string; code: string; mode: CodeReviewMode; language?: CodeLanguage | null }): Promise<CodeReviewResult> {
  const { organizationId, userId, mode } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');

  const code = params.code.replace(/\r\n/g, '\n');
  if (!code.trim()) throw AppError.badRequest('Paste some code or a stack trace first.');
  if (code.length > MAX_CODE_CHARS) throw AppError.badRequest(`Snippets are limited to ${MAX_CODE_CHARS.toLocaleString('en-US')} characters.`);

  enforceRateLimit(copilotRateLimitKey(organizationId), { limit: env.AI_RATE_LIMIT_PER_MINUTE, windowMs: COPILOT_RATE_LIMIT_WINDOW_MS });

  const started = Date.now();
  const analysis = analyzeCode(code, params.language ?? null);
  const config = copilotConfig();

  let output: CodeReviewOutput;
  let provider = config.provider;
  let model = config.model;
  let tokens = { prompt: 0, completion: 0 };

  if (config.provider === 'arch') {
    output = parseCodeReview(JSON.stringify(buildCodeReviewOutput({ ...buildCodeReviewInput(code, mode, analysis), code })));
  } else {
    const scrubbed = scrubSecrets(code, analysis.language);
    const prompt = buildCodeReviewPrompt(buildCodeReviewInput(scrubbed, mode, analysis));
    try {
      const llm = getAiProvider();
      const call = await callWithGuardrails({
        provider: llm,
        task: 'code_review',
        system: prompt.system,
        user: prompt.user,
        maxTokens: Math.max(env.AI_MAX_TOKENS, 3000),
        timeoutMs: copilotTimeoutMs(),
        attempts: copilotAttempts(),
        parse: parseCodeReview,
      });
      output = call.value;
      provider = llm.name;
      model = call.result.model;
      tokens = { prompt: call.promptTokens, completion: call.completionTokens };
    } catch (error) {
      if (!(error instanceof CopilotCallError)) throw error;
      await writeAudit({
        organizationId,
        actorId: userId,
        action: 'copilot.code_review_failed',
        entityType: 'code_review',
        entityId: 'snippet',
        metadata: { mode, language: analysis.language, provider: config.provider, reason: error.reason },
      });
      throw AppError.unavailable(FRIENDLY_FAILURE[error.reason], { reason: error.reason });
    }
  }

  // Secrets found in the raw code are always reported, whatever the model said.
  const secretFindings = analysis.findings
    .filter((finding) => finding.rule === 'hardcoded-secret')
    .map((finding) => ({ line: finding.line, severity: finding.severity, message: finding.message, suggestion: finding.suggestion }));
  const findings = [...secretFindings.filter((secret) => !output.findings.some((finding) => finding.line === secret.line && /secret|credential|key/i.test(finding.message))), ...output.findings];

  const latencyMs = Date.now() - started;
  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'copilot.code_review',
    entityType: 'code_review',
    entityId: 'snippet',
    metadata: {
      mode,
      language: analysis.language,
      lines: analysis.metrics.lines,
      findings: findings.length,
      errors: findings.filter((finding) => finding.severity === 'error').length,
      provider,
      model,
      promptTokens: tokens.prompt,
      completionTokens: tokens.completion,
      latencyMs,
    },
  });

  return {
    ...output,
    findings,
    provider,
    model,
    latencyMs,
    language: analysis.language,
    kind: analysis.kind,
    diagnoses: analysis.diagnoses,
    topFrame: analysis.topFrame,
    metrics: analysis.metrics,
    appliedFixes: analysis.appliedFixes,
  };
}
