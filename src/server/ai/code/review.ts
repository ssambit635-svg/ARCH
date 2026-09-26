import { analyzeCode, type CodeAnalysis, type CodeLanguage, type FindingSeverity } from './analyzer';
import type { CodeReviewAttachment } from './attachments';

/**
 * ARCH Code Assist — the input sent to a provider and the native (no-LLM) answer.
 */

export type CodeReviewMode = 'review' | 'fix' | 'explain';

export type CodeReviewInput = {
  mode: CodeReviewMode;
  language: CodeLanguage;
  code: string;
  /** Built-in analyzer output, included so a local LLM is grounded on concrete findings. */
  staticFindings: { line: number; severity: FindingSeverity; rule: string; message: string }[];
  errorDiagnoses: { title: string; explanation: string; evidence: string }[];
  topFrame: string | null;
  /** Local OCR output and user-selected text files; always untrusted, never persisted. */
  attachments?: CodeReviewAttachment[];
};

export function buildCodeReviewInput(code: string, mode: CodeReviewMode, analysis: CodeAnalysis, attachments: CodeReviewAttachment[] = []): CodeReviewInput {
  return {
    mode,
    language: analysis.language,
    code,
    staticFindings: analysis.findings.map((finding) => ({ line: finding.line, severity: finding.severity, rule: finding.rule, message: finding.message })),
    errorDiagnoses: analysis.diagnoses.map((diagnosis) => ({ title: diagnosis.title, explanation: diagnosis.explanation, evidence: diagnosis.evidence })),
    topFrame: analysis.topFrame ? `${analysis.topFrame.file}:${analysis.topFrame.line}${analysis.topFrame.fn ? ` (${analysis.topFrame.fn})` : ''}` : null,
    attachments,
  };
}

/** Deterministic answer in the same JSON shape a local LLM is asked for (schemas.ts). */
export function buildCodeReviewOutput(input: CodeReviewInput) {
  // If the user uploaded only a screenshot / context file, analyze its extracted text as the main
  // input. Otherwise retain the original snippet as the only candidate for mechanical code fixes.
  const attachmentText = (input.attachments ?? []).map((item) => `# ${item.name} (${item.kind})\n${item.content}`).join('\n\n');
  const analysis = analyzeCode(input.code || attachmentText, input.language);
  const contextualAnalyses = input.code
    ? (input.attachments ?? []).map((attachment) => ({ attachment, analysis: analyzeCode(attachment.content) }))
    : [];
  const findings = [
    ...analysis.diagnoses.map((diagnosis) => ({ line: null, severity: 'error' as const, message: `${diagnosis.title}: ${diagnosis.evidence}`, suggestion: diagnosis.fixes.join(' ') })),
    ...analysis.findings.map((finding) => ({ line: finding.line, severity: finding.severity, message: finding.message, suggestion: finding.suggestion })),
    ...contextualAnalyses.flatMap(({ attachment, analysis: contextual }) => [
      ...contextual.diagnoses.map((diagnosis) => ({ line: null, severity: 'error' as const, message: `${attachment.name}: ${diagnosis.title}: ${diagnosis.evidence}`, suggestion: diagnosis.fixes.join(' ') })),
      ...contextual.findings.map((finding) => ({ line: finding.line, severity: finding.severity, message: `${attachment.name}: ${finding.message}`, suggestion: finding.suggestion })),
    ]),
  ].slice(0, 40);

  const explanation: string[] = [];
  if (analysis.diagnoses.length) {
    for (const diagnosis of analysis.diagnoses) {
      explanation.push(`${diagnosis.title} — ${diagnosis.explanation}`);
      explanation.push(...diagnosis.fixes.map((fix) => `  • ${fix}`));
    }
    if (analysis.topFrame) explanation.push(`Start at ${analysis.topFrame.file}:${analysis.topFrame.line}${analysis.topFrame.fn ? ` (${analysis.topFrame.fn})` : ''} — the first frame in your own code.`);
  }
  const important = analysis.findings.filter((finding) => finding.severity !== 'info');
  if (important.length) {
    explanation.push('Fix first:');
    explanation.push(...important.slice(0, 5).map((finding) => `  • Line ${finding.line}: ${finding.suggestion}`));
  }
  if (input.code && analysis.appliedFixes.length) explanation.push(`Applied automatically in the improved version: ${analysis.appliedFixes.join('; ')}.`);
  if (!explanation.length) explanation.push('Nothing risky stood out. For a deeper rewrite (naming, structure, idioms) enable the local LLM (AI_PROVIDER="arch-hybrid").');

  return {
    summary: analysis.summary,
    findings,
    improvedCode: input.code && analysis.kind !== 'stack_trace' && analysis.improvedCode !== input.code ? analysis.improvedCode : null,
    explanation: explanation.join('\n'),
  };
}
