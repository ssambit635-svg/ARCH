import { analyzeCode, type CodeAnalysis, type CodeLanguage, type FindingSeverity } from './analyzer';

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
};

export function buildCodeReviewInput(code: string, mode: CodeReviewMode, analysis: CodeAnalysis): CodeReviewInput {
  return {
    mode,
    language: analysis.language,
    code,
    staticFindings: analysis.findings.map((finding) => ({ line: finding.line, severity: finding.severity, rule: finding.rule, message: finding.message })),
    errorDiagnoses: analysis.diagnoses.map((diagnosis) => ({ title: diagnosis.title, explanation: diagnosis.explanation, evidence: diagnosis.evidence })),
    topFrame: analysis.topFrame ? `${analysis.topFrame.file}:${analysis.topFrame.line}${analysis.topFrame.fn ? ` (${analysis.topFrame.fn})` : ''}` : null,
  };
}

/** Deterministic answer in the same JSON shape a local LLM is asked for (schemas.ts). */
export function buildCodeReviewOutput(input: CodeReviewInput) {
  const analysis = analyzeCode(input.code, input.language);
  const findings = [
    ...analysis.diagnoses.map((diagnosis) => ({ line: null, severity: 'error' as const, message: `${diagnosis.title}: ${diagnosis.evidence}`, suggestion: diagnosis.fixes.join(' ') })),
    ...analysis.findings.map((finding) => ({ line: finding.line, severity: finding.severity, message: finding.message, suggestion: finding.suggestion })),
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
  if (analysis.appliedFixes.length) explanation.push(`Applied automatically in the improved version: ${analysis.appliedFixes.join('; ')}.`);
  if (!explanation.length) explanation.push('Nothing risky stood out. For a deeper rewrite (naming, structure, idioms) enable the local LLM (AI_PROVIDER="arch-hybrid").');

  return {
    summary: analysis.summary,
    findings,
    improvedCode: analysis.kind !== 'stack_trace' && analysis.improvedCode !== input.code ? analysis.improvedCode : null,
    explanation: explanation.join('\n'),
  };
}
