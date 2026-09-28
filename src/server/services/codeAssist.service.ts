import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { writeAudit } from '@/lib/audit';
import { analyzeCode, scrubSecrets, MAX_CODE_CHARS, type CodeAnalysis, type CodeLanguage } from '../ai/code/analyzer';
import { extractCodeReviewAttachments, type CodeReviewAttachment } from '../ai/code/attachments';
import { buildCodeReviewInput, buildCodeReviewOutput, type CodeReviewMode } from '../ai/code/review';
import { CopilotCallError, callWithGuardrails } from '../ai/guardrails';
import { buildCodeReviewPrompt } from '../ai/prompts';
import { copilotConfig, copilotTimeoutMs, getAiProvider } from '../ai/provider';
import { parseCodeReview, type CodeReviewOutput } from '../ai/schemas';
import { COPILOT_RATE_LIMIT_WINDOW_MS, copilotRateLimitKey } from './copilot.service';
import { getOrganizationModel } from './archModel.service';

/**
 * ARCH Code Assist — "make this code better" / "explain this stack trace", on your own server.
 *
 *   1. The built-in analyzer always runs on the raw code (secrets are detected, never echoed).
 *   2. The answer comes from ARCH's own native engines (analyzer + review/thinker templates) —
 *      there is no second model, no local LLM and no vendor call anywhere in this path.
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
  provider_error: 'Code Assist could not reach the ARCH engine. Try again in a moment.',
  invalid_output: 'Code Assist produced an answer it could not validate. Please try again.',
  not_configured: 'Code Assist is not configured. Ask an administrator to check AI_PROVIDER.',
};

export async function reviewCode(params: { organizationId: string; userId: string; code: string; mode: CodeReviewMode; language?: CodeLanguage | null; attachments?: CodeReviewAttachment[]; uploads?: readonly File[] }): Promise<CodeReviewResult> {
  const { organizationId, userId, mode } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');

  const code = params.code.replace(/\r\n/g, '\n');
  let attachments = params.attachments ?? [];
  const uploads = params.uploads ?? [];
  if (!code.trim() && attachments.length === 0 && uploads.length === 0 && mode !== 'scaffold') {
    throw AppError.badRequest('Paste code or attach an image, Markdown file, log or source file first.');
  }
  if (mode === 'scaffold' && !code.trim() && attachments.length === 0 && uploads.length === 0) {
    throw AppError.badRequest('Describe the small snippet you need (CRUD route, Zod schema, Prisma model, webhook, status machine, test or form).');
  }
  if (code.length > MAX_CODE_CHARS) throw AppError.badRequest(`Snippets are limited to ${MAX_CODE_CHARS.toLocaleString('en-US')} characters.`);

  // Authorize and rate-limit before invoking OCR (an external local executable) on uploaded bytes.
  enforceRateLimit(copilotRateLimitKey(organizationId), { limit: env.AI_RATE_LIMIT_PER_MINUTE, windowMs: COPILOT_RATE_LIMIT_WINDOW_MS });
  if (uploads.length) attachments = [...attachments, ...await extractCodeReviewAttachments(uploads)];
  if (!code.trim() && attachments.length === 0) throw AppError.badRequest('Paste code or attach an image, Markdown file, log or source file first.');
  const inputChars = code.length + attachments.reduce((total, item) => total + item.content.length, 0);
  if (inputChars > MAX_CODE_CHARS) throw AppError.badRequest(`Code and extracted attachment text must total ${MAX_CODE_CHARS.toLocaleString('en-US')} characters or less.`);

  const started = Date.now();
  const analysisCode = code || attachments.map((item) => `# ${item.name}\n${item.content}`).join('\n\n');
  const analysis = analyzeCode(analysisCode, params.language ?? null);
  const config = copilotConfig();

  let output: CodeReviewOutput;
  let provider = config.provider;
  let model = config.model;
  let tokens = { prompt: 0, completion: 0 };

  // Thinker is native: templates + risks, never a model rewriting a whole feature.
  if (config.provider === 'arch' || mode === 'scaffold') {
    if (mode === 'scaffold') {
      provider = 'arch';
      model = config.provider === 'arch' ? config.model : 'arch-native-thinker';
    }
    output = parseCodeReview(JSON.stringify(buildCodeReviewOutput({ ...buildCodeReviewInput(code, mode, analysis, attachments), code })));

    // Ground the answer in what similar real bugs and code reviews said (downloaded corpora:
    // SWE-bench, ManySStuBs4J, github-codereview, CodeReviewer). The output contract is
    // unchanged — this only adds references to `explanation`. A model problem never breaks a review.
    // Thinker scaffolds are templates, not incident diagnoses — skip retrieval.
    if (mode !== 'scaffold') {
      try {
        const organizationModel = await getOrganizationModel(organizationId);
        const query = [...analysis.diagnoses.map((diagnosis) => `${diagnosis.title}. ${diagnosis.explanation}`), analysis.summary].join(' ');
        const hits = organizationModel.similar(query, { k: 3, sources: ['code', 'review'], minScore: 0.12 });
        if (hits.length > 0) {
          const references = hits.map(
            (hit, index) => `(${index + 1}) ${hit.doc.title}${hit.doc.rootCause ? ` — ${hit.doc.rootCause}` : ''}${hit.doc.url ? ` [source: ${hit.doc.url}]` : ''}`,
          );
          output = {
            ...output,
            explanation: [output.explanation, '', 'Similar issues seen in the bug-fix / code-review knowledge base:', ...references].join('\n').trim().slice(0, 6000),
          };
        }
      } catch (error) {
        console.warn(`[code-assist] ARCH model unavailable for ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    const scrubbed = scrubSecrets(code, analysis.language);
    const scrubbedAttachments = attachments.map((attachment) => ({
      ...attachment,
      content: scrubSecrets(attachment.content, analyzeCode(attachment.content).language),
    }));
    const safeAnalysisText = scrubbed || scrubbedAttachments.map((item) => `# ${item.name}\n${item.content}`).join('\n\n');
    const safeAnalysis = analyzeCode(safeAnalysisText, params.language ?? null);
    const prompt = buildCodeReviewPrompt(buildCodeReviewInput(scrubbed, mode, safeAnalysis, scrubbedAttachments));
    try {
      const llm = getAiProvider();
      const call = await callWithGuardrails({
        provider: llm,
        task: 'code_review',
        system: prompt.system,
        user: prompt.user,
        maxTokens: Math.max(env.AI_MAX_TOKENS, 3000),
        timeoutMs: copilotTimeoutMs(),
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
  const rawAnalyses = [analysis, ...attachments.filter(() => Boolean(code.trim())).map((attachment) => analyzeCode(attachment.content))];
  const secretFindings = rawAnalyses.flatMap((rawAnalysis, index) => rawAnalysis.findings
    .filter((finding) => finding.rule === 'hardcoded-secret')
    .map((finding) => ({
      line: finding.line,
      severity: finding.severity,
      message: index === 0 ? finding.message : `Possible hard-coded secret in an attached context file: ${finding.message}`,
      suggestion: finding.suggestion,
    })));
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
