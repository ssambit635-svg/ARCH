import type { IncidentEventType, IncidentSeverity, IncidentStatus, MembershipRole } from '@/generated/prisma/client';
import { LIMITS, redact, truncate } from './guardrails';

/**
 * Minimal, tenant-scoped context for a Copilot call (AGENTS-V2.md hard rules 2 + 3).
 *
 * This module is PURE: it receives rows the service layer already loaded through the
 * organization-scoped repositories and whitelists the few fields a model may see. There is no
 * database access here, so nothing in `ai/` can ever read across tenants.
 *
 * What is sent:     incident title, severity, status, start/resolve time, affected service name,
 *                   timeline entries (type, time, actor KIND, redacted body, from→to change).
 * What is NEVER:    ids, emails, names, passwords, tokens, API keys, webhook payloads, other
 *                   organizations' data, full database rows.
 * Triage only:      assignee candidates as opaque refs ("m1", "m2") + role + current load. The
 *                   service maps refs back to user ids; the model never sees a real id.
 */

export type CopilotTimelineEntry = {
  at: string;
  type: IncidentEventType;
  actor: 'responder' | 'integration' | 'system';
  change?: string;
  text?: string;
};

export type CopilotCandidate = {
  ref: string;
  role: MembershipRole;
  openIncidentsAssigned: number;
  activeOnThisIncident: boolean;
  isCurrentAssignee: boolean;
};

/**
 * A past incident the ARCH model found similar (same organization, pattern library or public),
 * or — for code tasks only — a real bug fix / code review from the downloaded corpora.
 */
export type SimilarIncidentHint = {
  source: 'your_team' | 'pattern_library' | 'public_postmortem' | 'code_corpus' | 'review_corpus';
  title: string;
  category: string | null;
  severity?: IncidentSeverity;
  resolvedInMinutes?: number;
  rootCause?: string;
  fix?: string[];
  prevention?: string[];
  similarity: number;
};

/**
 * V6 — a passage retrieved from the organization's own knowledge base (runbooks, docs, notes).
 * Retrieved by ARCH's own embeddings on the organization's server; nothing is sent anywhere.
 */
export type KnowledgeChunkHint = {
  id: string;
  sourceName: string;
  sourceKind: string;
  heading: string | null;
  text: string;
  /** URL the document was fetched from, when it came from one. */
  url?: string | null;
  similarity: number;
};

/**
 * What the organization's ARCH model thinks, computed on the server before any prompt is built.
 * The built-in engines draft from it directly: it is the retrieval-augmented grounding that makes
 * an answer read like "this looks like your March database incident".
 */
export type CopilotKnowledge = {
  model: string;
  likelyCategory: string;
  categoryLabel: string;
  categoryConfidence: number;
  predictedSeverity: IncidentSeverity;
  severityConfidence: number;
  similarIncidents: SimilarIncidentHint[];
  /** V6 — runbook / doc passages retrieved for this incident (RAG). */
  knowledgeChunks?: KnowledgeChunkHint[];
};

/** Optional code / stack trace a responder pasted for the CODE_FIX task (redacted, bounded). */
export type CopilotAttachment = { kind: 'code' | 'log'; language: string; text: string };

export type CopilotContext = {
  incident: {
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    affectedService: string | null;
    startedAt: string;
    resolvedAt: string | null;
    durationMinutes: number;
  };
  timeline: CopilotTimelineEntry[];
  /** Number of timeline entries left out to respect the size limit. */
  omittedTimelineEntries: number;
  candidates?: CopilotCandidate[];
  knowledge?: CopilotKnowledge;
  attachment?: CopilotAttachment;
};

export type IncidentForContext = {
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: Date;
  resolvedAt: Date | null;
  assignedToId: string | null;
  service: { name: string } | null;
  events: {
    type: IncidentEventType;
    body: string | null;
    authorId: string | null;
    actorLabel: string | null;
    metadata: unknown;
    createdAt: Date;
  }[];
};

export type MemberForContext = { userId: string; role: MembershipRole };

function changeSummary(type: IncidentEventType, metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const record = metadata as Record<string, unknown>;
  // Assignment changes carry user ids — never forward them.
  if (type === 'ASSIGNED') return record.to ? 'assignee changed' : 'unassigned';
  if (type === 'LINKED') return 'affected service changed';
  const from = typeof record.from === 'string' ? record.from : null;
  const to = typeof record.to === 'string' ? record.to : null;
  if (from && to) return `${from} -> ${to}`;
  if (type === 'CREATED' && typeof record.severity === 'string') return `opened as ${record.severity}`;
  return undefined;
}

function actorKind(event: { authorId: string | null; actorLabel: string | null }): CopilotTimelineEntry['actor'] {
  if (event.authorId) return 'responder';
  if (event.actorLabel?.startsWith('webhook:')) return 'integration';
  return 'system';
}

/** Keep the opening entry plus the most recent ones when a timeline is too long. */
function boundTimeline(entries: CopilotTimelineEntry[]): { kept: CopilotTimelineEntry[]; omitted: number } {
  let kept = entries;
  if (kept.length > LIMITS.maxTimelineEntries) {
    kept = [kept[0]!, ...kept.slice(-(LIMITS.maxTimelineEntries - 1))];
  }
  // Enforce the total character budget by dropping the oldest non-opening entries.
  while (kept.length > 2 && JSON.stringify(kept).length > LIMITS.maxContextChars) {
    kept = [kept[0]!, ...kept.slice(2)];
  }
  return { kept, omitted: entries.length - kept.length };
}

export function buildCopilotContext(
  incident: IncidentForContext,
  options: { now?: Date; members?: MemberForContext[]; openAssignmentsByUser?: Map<string, number> } = {},
): { context: CopilotContext; candidateRefs: Map<string, string> } {
  const now = options.now ?? new Date();
  const end = incident.resolvedAt ?? now;

  const entries: CopilotTimelineEntry[] = incident.events.map((event) => {
    const entry: CopilotTimelineEntry = { at: event.createdAt.toISOString(), type: event.type, actor: actorKind(event) };
    const change = changeSummary(event.type, event.metadata);
    if (change) entry.change = change;
    if (event.body?.trim()) entry.text = truncate(redact(event.body.trim()), LIMITS.maxEventChars);
    return entry;
  });
  const { kept, omitted } = boundTimeline(entries);

  const context: CopilotContext = {
    incident: {
      title: truncate(redact(incident.title), LIMITS.maxTitleChars),
      severity: incident.severity,
      status: incident.status,
      affectedService: incident.service ? truncate(redact(incident.service.name), 120) : null,
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
      durationMinutes: Math.max(0, Math.round((end.getTime() - incident.startedAt.getTime()) / 60_000)),
    },
    timeline: kept,
    omittedTimelineEntries: omitted,
  };

  const candidateRefs = new Map<string, string>();
  if (options.members) {
    const participants = new Set(incident.events.map((event) => event.authorId).filter((id): id is string => Boolean(id)));
    context.candidates = options.members
      .filter((member) => member.role !== 'VIEWER')
      .slice(0, LIMITS.maxCandidates)
      .map((member, index) => {
        const ref = `m${index + 1}`;
        candidateRefs.set(ref, member.userId);
        return {
          ref,
          role: member.role,
          openIncidentsAssigned: options.openAssignmentsByUser?.get(member.userId) ?? 0,
          activeOnThisIncident: participants.has(member.userId),
          isCurrentAssignee: incident.assignedToId === member.userId,
        };
      });
  }

  return { context, candidateRefs };
}
