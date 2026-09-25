import { z } from 'zod';
import type { AiSuggestionType } from '@/generated/prisma/client';
import { extractJson, sanitizeCustomerText } from './guardrails';

/**
 * What a model must return for each Copilot task (raw), and what ARCH stores after validation and
 * post-processing (stored). A completion that does not match its raw schema is rejected and
 * retried once — malformed AI output never reaches the database.
 */

const severity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const line = (max: number) => z.string().trim().min(1).max(max);

// ---------- raw model output ----------

export const summaryRawSchema = z.object({
  bullets: z.array(line(400)).min(1).max(12),
});

export const triageRawSchema = z.object({
  severity,
  assigneeRef: z.string().trim().max(10).nullish(),
  rationale: line(800),
});

export const statusUpdateRawSchema = z.object({
  body: line(1500),
});

export const postmortemRawSchema = z.object({
  timeline: z.array(line(400)).min(1).max(40),
  impact: line(2000),
  rootCause: line(2000),
  actionItems: z.array(line(400)).min(1).max(20),
});

export const codeFixRawSchema = z.object({
  diagnosis: line(1500),
  likelyCause: line(1500),
  suggestedFixes: z.array(line(500)).min(1).max(10),
  patch: z.string().trim().max(8000).nullish(),
  references: z.array(line(300)).max(8).nullish(),
});

export const codeReviewRawSchema = z.object({
  summary: line(2000),
  findings: z
    .array(
      z.object({
        line: z.number().int().min(0).max(100_000).nullish(),
        severity: z.enum(['error', 'warning', 'info']).catch('info'),
        message: line(600),
        suggestion: z.string().trim().max(1200).default(''),
      }),
    )
    .max(60),
  improvedCode: z.string().max(40_000).nullish(),
  explanation: z.string().trim().max(6000).default(''),
});

// ---------- stored output ----------

export type SummaryOutput = { bullets: string[] };
export type TriageOutput = { severity: z.infer<typeof severity>; assigneeId?: string; rationale: string };
export type StatusUpdateOutput = { body: string };
export type PostmortemOutput = {
  timeline: string[];
  impact: string;
  rootCause: string;
  actionItems: string[];
  markdown: string;
};

export type CodeFixOutput = { diagnosis: string; likelyCause: string; suggestedFixes: string[]; patch?: string; references: string[] };
export type CodeReviewOutput = z.infer<typeof codeReviewRawSchema>;

export type SuggestionOutput = SummaryOutput | TriageOutput | StatusUpdateOutput | PostmortemOutput | CodeFixOutput;

/** Summary acceptance criterion: at most five bullets. */
export const MAX_SUMMARY_BULLETS = 5;

export const POSTMORTEM_SECTIONS = ['Timeline', 'Impact', 'Root cause', 'Action items'] as const;

export function parseSummary(text: string): SummaryOutput {
  const raw = summaryRawSchema.parse(extractJson(text));
  return { bullets: raw.bullets.slice(0, MAX_SUMMARY_BULLETS) };
}

/**
 * `candidateRefs` maps the opaque refs the model saw ("m1") to real user ids. A ref that is not
 * in the map — hallucinated, or pointing at someone who is no longer a member — is dropped, so
 * `assigneeId` is either an actual member of the organization or absent.
 */
export function parseTriage(text: string, candidateRefs: Map<string, string>): TriageOutput {
  const raw = triageRawSchema.parse(extractJson(text));
  const assigneeId = raw.assigneeRef ? candidateRefs.get(raw.assigneeRef) : undefined;
  return { severity: raw.severity, rationale: raw.rationale, ...(assigneeId ? { assigneeId } : {}) };
}

export function parseStatusUpdate(text: string): StatusUpdateOutput {
  const raw = statusUpdateRawSchema.parse(extractJson(text));
  const body = sanitizeCustomerText(raw.body);
  if (!body) throw new Error('status update was empty after sanitizing');
  return { body };
}

export function renderPostmortemMarkdown(output: Omit<PostmortemOutput, 'markdown'>): string {
  const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n');
  return [
    `## ${POSTMORTEM_SECTIONS[0]}`,
    list(output.timeline),
    '',
    `## ${POSTMORTEM_SECTIONS[1]}`,
    output.impact,
    '',
    `## ${POSTMORTEM_SECTIONS[2]}`,
    output.rootCause,
    '',
    `## ${POSTMORTEM_SECTIONS[3]}`,
    list(output.actionItems),
  ].join('\n');
}

export function parsePostmortem(text: string): PostmortemOutput {
  const raw = postmortemRawSchema.parse(extractJson(text));
  return { ...raw, markdown: renderPostmortemMarkdown(raw) };
}

export function parseCodeFix(text: string): CodeFixOutput {
  const raw = codeFixRawSchema.parse(extractJson(text));
  return {
    diagnosis: raw.diagnosis,
    likelyCause: raw.likelyCause,
    suggestedFixes: raw.suggestedFixes,
    ...(raw.patch?.trim() ? { patch: raw.patch.trim() } : {}),
    references: raw.references ?? [],
  };
}

export function parseCodeReview(text: string): CodeReviewOutput {
  return codeReviewRawSchema.parse(extractJson(text));
}

export function renderCodeFixText(output: CodeFixOutput): string {
  return [
    'Code fix suggestion',
    '',
    `Diagnosis: ${output.diagnosis}`,
    '',
    `Likely cause: ${output.likelyCause}`,
    '',
    'Suggested fixes:',
    ...output.suggestedFixes.map((fix) => `- ${fix}`),
    ...(output.patch ? ['', 'Proposed patch:', '```', output.patch, '```'] : []),
    ...(output.references.length ? ['', `Similar incidents: ${output.references.join(' · ')}`] : []),
  ].join('\n');
}

/** The text an approved draft posts to the incident timeline. Triage posts nothing: it is applied. */
export function suggestionTimelineText(type: AiSuggestionType, output: unknown): string | null {
  const record = (output ?? {}) as Record<string, unknown>;
  switch (type) {
    case 'SUMMARY':
      return Array.isArray(record.bullets) ? `Summary\n${(record.bullets as string[]).map((bullet) => `• ${bullet}`).join('\n')}` : null;
    case 'STATUS_UPDATE':
      return typeof record.body === 'string' ? record.body : null;
    case 'POSTMORTEM':
      return typeof record.markdown === 'string' ? `Postmortem draft\n\n${record.markdown}` : null;
    case 'CODE_FIX':
      return typeof record.diagnosis === 'string' && Array.isArray(record.suggestedFixes)
        ? renderCodeFixText({
            diagnosis: record.diagnosis,
            likelyCause: String(record.likelyCause ?? ''),
            suggestedFixes: record.suggestedFixes as string[],
            ...(typeof record.patch === 'string' ? { patch: record.patch } : {}),
            references: Array.isArray(record.references) ? (record.references as string[]) : [],
          })
        : null;
    case 'TRIAGE':
    default:
      return null;
  }
}
