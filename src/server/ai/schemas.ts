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

export type SuggestionOutput = SummaryOutput | TriageOutput | StatusUpdateOutput | PostmortemOutput;

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
    case 'TRIAGE':
    default:
      return null;
  }
}
