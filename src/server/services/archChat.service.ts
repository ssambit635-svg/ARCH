import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { writeAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { CATEGORIES, type CategoryId } from '../ai/arch-model/knowledge';
import {
  answerChat,
  CHAT_LIMITS,
  classifyChatIntent,
  extractMemory,
  titleFromMessage,
  type ChatAnswer,
  type ChatMemory,
  type ChatIncident,
  type ChatIntent,
  type ChatSnapshot,
  type ChatTurn,
} from '../ai/arch-model/chat';
import type { SimilarDoc } from '../ai/arch-model/runtime';
import { createNativeChatAgentModel, createNativeTools, detectToolRequest, needsPlanning, runAgentTurn, scriptForTask } from '../ai/agent';
import { archChatRepository } from '../repositories/archChat.repository';
import { incidentRepository } from '../repositories/incident.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { serviceRepository } from '../repositories/service.repository';
import { getOrganizationModel } from './archModel.service';
import { retrieveKnowledge } from './knowledge.service';

/**
 * Chat with ARCH — the service.
 *
 * A chat turn is: permissions → rate limit → load the workspace picture (counts, open and recent
 * incidents, services, roster) → retrieve what this question is about (the ARCH model's own
 * similarity search over the team's incidents + pattern library + public postmortems, plus the
 * organization's knowledge base) → hand it all to the pure engine in
 * `src/server/ai/arch-model/chat.ts` → persist the exchange.
 *
 * Everything here is tenant-scoped by construction: sessions belong to (organization, user), every
 * data read goes through an organization-scoped repository, and the engine never sees a row it was
 * not handed. Every answer comes from ARCH's own native engine — there is no vendor model, no API
 * key and no second inference server anywhere in the chat path.
 *
 * Complex prompts are additionally intercepted by the ARCH Agent loop (`src/server/ai/agent`):
 * the planner prefixes a chain-of-thought system prompt and scans the reply for <thinking>/<plan>
 * tags, native tools run from a plain function registry, and generated Python is executed in a
 * sandboxed subprocess with the self-correction loop feeding failures back to the engine. The
 * steps are managed server-side; the member only ever sees the final, tag-free answer.
 */

export const CHAT_RATE_LIMIT_WINDOW_MS = 60_000;

/** Intents where retrieval is worth the queries; small talk and status questions are answered from the snapshot alone. */
const RETRIEVAL_INTENTS = new Set<ChatIntent>([
  'incident_search',
  'lessons',
  'explain_incident',
  'runbook',
  'advice',
  'concept_explain',
  'tech_stack_advice',
  'unknown',
]);

const OPEN_INCIDENT_LIMIT = 25;
const RECENT_INCIDENT_LIMIT = 25;
const MATCH_LIMIT = 5;
/** How far back "resolve time" statistics look. */
const STATS_WINDOW_DAYS = 30;
/** V9 memory: bounded so one member can never grow a row without limit. */
const MEMORY_MAX_NOTES = 25;
const MEMORY_NOTE_CHARS = 240;
const MEMORY_MAX_STACK = 12;

export type ChatSessionSummary = {
  id: string;
  title: string;
  titleSource: 'AUTO' | 'USER';
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  /** First line of the newest ARCH answer, for the recents list. */
  preview: string | null;
};

export type ChatMessageView = {
  id: string;
  role: 'USER' | 'ARCH';
  content: string;
  intent: string | null;
  confidence: string | null;
  citations: ChatAnswer['citations'];
  suggestions: string[];
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
  feedbackRating: 'UP' | 'DOWN' | null;
  createdAt: string;
};

export type ChatSessionView = ChatSessionSummary & { messages: ChatMessageView[] };

type Params = { organizationId: string; userId: string };

export function chatRateLimitKey(organizationId: string): string {
  return `arch-chat:${organizationId}`;
}

// ---------------------------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------------------------

/** Re-exported so callers (and tests) can reach the engine's titler through the service. */
export { titleFromMessage };

const TITLE_MAX = 60;

// ---------------------------------------------------------------------------------------------
// The workspace picture the engine answers from
// ---------------------------------------------------------------------------------------------

type IncidentRow = Awaited<ReturnType<typeof incidentRepository.list>>[number];

function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
}

/**
 * What the ARCH model learned about one incident, keyed by incident id. It comes from the trained
 * artifact (which extracted the category, root cause and fix from the timeline and approved
 * postmortems at training time), so enriching a chat answer with it costs zero queries.
 */
type LearnedIncident = { category: CategoryId | null; rootCause?: string; mitigation?: string[]; prevention?: string[]; similarity?: number; matchSource?: ChatIncident['matchSource'] };

function toChatIncident(row: IncidentRow, now: Date, learned?: LearnedIncident): ChatIncident {
  const end = row.resolvedAt ?? now;
  const category = learned?.category ?? null;
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    service: row.service?.name ?? null,
    startedAt: row.startedAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    durationMinutes: minutesBetween(row.startedAt, end),
    category,
    categoryLabel: category && category in CATEGORIES ? CATEGORIES[category as CategoryId].label : null,
    rootCause: learned?.rootCause ?? null,
    fix: learned?.mitigation ?? [],
    prevention: learned?.prevention ?? [],
    assignedTo: row.assignedTo?.name ?? null,
    ...(learned?.similarity !== undefined ? { similarity: learned.similarity } : {}),
    ...(learned?.matchSource ? { matchSource: learned.matchSource } : {}),
  };
}

function median(values: number[]): number | null {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2) : sorted[middle]!;
}

// ---------------------------------------------------------------------------------------------
// V9 memory — what ARCH actually remembers about one member
// ---------------------------------------------------------------------------------------------

type MemoryFacts = { userName: string | null; userRole: string | null; techStack: string[]; notes: string[] };

const EMPTY_FACTS: MemoryFacts = { userName: null, userRole: null, techStack: [], notes: [] };

/** Read one member's stored memory. Never throws: a broken row must not break the chat. */
async function loadMemory(organizationId: string, userId: string): Promise<{ facts: MemoryFacts; clearedAt: Date | null }> {
  const row = await archChatRepository.findMemory(organizationId, userId).catch(() => null);
  if (!row) return { facts: { ...EMPTY_FACTS }, clearedAt: null };
  const raw = (row.facts ?? {}) as Partial<MemoryFacts>;
  return {
    facts: {
      userName: typeof raw.userName === 'string' && raw.userName.trim() ? raw.userName.trim() : null,
      userRole: typeof raw.userRole === 'string' && raw.userRole.trim() ? raw.userRole.trim() : null,
      techStack: Array.isArray(raw.techStack) ? raw.techStack.filter((item): item is string => typeof item === 'string').slice(0, MEMORY_MAX_STACK) : [],
      notes: Array.isArray(raw.notes) ? raw.notes.filter((item): item is string => typeof item === 'string').slice(-MEMORY_MAX_NOTES) : [],
    },
    clearedAt: row.clearedAt,
  };
}

/**
 * Fold this turn's extraction into what is already stored and persist the result.
 *
 * A new name or role replaces the old one (people correct themselves), the tech stack accumulates
 * without duplicates, and notes are appended — bounded, because memory that grows forever is a
 * liability, not a feature. `cleared` (the member asked to forget) wipes the row instead.
 *
 * Returns the facts as they now stand, so the answer being built uses exactly what was saved.
 */
async function rememberFromTurn(
  params: Params,
  extracted: ChatMemory,
  stored: MemoryFacts,
): Promise<{ facts: MemoryFacts; cleared: boolean }> {
  if (extracted.cleared) {
    // The row stays (with `clearedAt`) so the Memory panel can say *when* it was wiped; the facts go.
    await archChatRepository.saveMemory(params.organizationId, params.userId, { ...EMPTY_FACTS }, { cleared: true }).catch(() => undefined);
    return { facts: { ...EMPTY_FACTS }, cleared: true };
  }

  const merged: MemoryFacts = {
    userName: extracted.userName?.trim() || stored.userName,
    userRole: extracted.userRole?.trim() || stored.userRole,
    techStack: dedupe([...stored.techStack, ...(extracted.techStack ?? [])]).slice(0, MEMORY_MAX_STACK),
    notes: [
      ...stored.notes,
      ...(extracted.notes ?? []).map((note) => note.trim().slice(0, MEMORY_NOTE_CHARS)).filter((note) => note.length > 0),
    ].reduce<string[]>((all: string[], note: string) => (all.includes(note) ? all : [...all, note]), []).slice(-MEMORY_MAX_NOTES),
  };

  const changed =
    merged.userName !== stored.userName ||
    merged.userRole !== stored.userRole ||
    merged.techStack.length !== stored.techStack.length ||
    merged.notes.length !== stored.notes.length;

  if (changed) await archChatRepository.saveMemory(params.organizationId, params.userId, merged).catch(() => undefined);
  return { facts: merged, cleared: false };
}

/** The remembered facts as the engine expects them (plus the live name from the account). */
function toChatMemory(facts: MemoryFacts, user: { name: string | null; email: string | null } | undefined, cleared: boolean): ChatMemory {
  return {
    userName: facts.userName,
    // The account name greets people; it is never reported as something ARCH "remembered".
    accountName: user?.name ?? null,
    userRole: facts.userRole,
    techStack: facts.techStack,
    notes: facts.notes,
    ...(cleared ? { cleared: true } : {}),
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

type SnapshotInputs = {
  organizationName: string;
  now: Date;
  user?: { name: string | null; email: string | null };
  memory: ChatMemory;
  counts: ChatSnapshot['counts'];
  openIncidents: ChatIncident[];
  recentIncidents: ChatIncident[];
  services: ChatSnapshot['services'];
  members: ChatSnapshot['members'];
  model: ChatSnapshot['model'];
  matches: ChatIncident[];
  generalMatches: ChatSnapshot['generalMatches'];
  knowledgeChunks: ChatSnapshot['knowledgeChunks'];
  hasKnowledge: boolean;
};

/**
 * Load everything the engine may need. All reads are organization-scoped and run in parallel; the
 * per-query work is bounded (25 rows here, 50 there), so a chat turn costs a handful of indexed
 * queries rather than a full-workspace scan.
 */
async function buildSnapshotInputs(params: Params, intent: ChatIntent, question: string, memory: ChatMemory): Promise<SnapshotInputs> {
  const { organizationId, userId } = params;
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const since30 = new Date(now.getTime() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1_000);
  const wantsRetrieval = RETRIEVAL_INTENTS.has(intent);

  const [
    organization,
    statusRows,
    openRows,
    recentRows,
    serviceRows,
    totals,
    members,
    openByAssignee,
    resolveDurations,
    modelRuntime,
    registry,
    userRecord,
  ] = await Promise.all([
    db.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } }),
    incidentRepository.countByStatus(organizationId),
    incidentRepository.list(organizationId, { open: true }, { skip: 0, take: OPEN_INCIDENT_LIMIT }),
    // Resolved incidents, newest first. `list()` orders by status then start time, so this returns
    // the most recent resolved ones without loading their timelines.
    incidentRepository.list(organizationId, { status: 'RESOLVED' }, { skip: 0, take: RECENT_INCIDENT_LIMIT }),
    serviceRepository.list(organizationId),
    // Open-only severity mix: the live picture, not the all-time one.
    incidentRepository.countBySeverity(organizationId, { open: true }),
    organizationRepository.listMembers(organizationId),
    incidentRepository.countOpenByAssignee(organizationId),
    incidentRepository.resolveDurationsSince(organizationId, since30, 200),
    getOrganizationModel(organizationId).catch(() => null),
    db.archModel.findUnique({ where: { organizationId }, select: { version: true } }).catch(() => null),
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }).catch(() => null),
  ]);

  if (!organization) throw AppError.notFound('Organization not found.');

  const resolved7 = await incidentRepository.count(organizationId, { resolvedSince: since7 });
  const resolved30 = await incidentRepository.count(organizationId, { resolvedSince: since30 });

  // Everything the model already knows about this workspace's incidents, indexed by id.
  const learnedById = new Map<string, LearnedIncident>();
  for (const doc of modelRuntime?.artifact.docs ?? []) {
    if (doc.source !== 'team') continue;
    const id = doc.id.replace(/^team:/, '');
    learnedById.set(id, {
      category: doc.category,
      ...(doc.rootCause ? { rootCause: doc.rootCause } : {}),
      ...(doc.mitigation?.length ? { mitigation: doc.mitigation } : {}),
      ...(doc.prevention?.length ? { prevention: doc.prevention } : {}),
    });
  }

  const openSorted = [...openRows].sort((a, b) => {
    const rank = (severity: string) => (severity === 'CRITICAL' ? 0 : severity === 'HIGH' ? 1 : severity === 'MEDIUM' ? 2 : 3);
    return rank(a.severity) - rank(b.severity) || a.startedAt.getTime() - b.startedAt.getTime();
  });

  const openIncidents = openSorted.map((row) => toChatIncident(row, now, learnedById.get(row.id)));
  const recentIncidents = recentRows
    .filter((row) => row.resolvedAt)
    .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0))
    .map((row) => toChatIncident(row, now, learnedById.get(row.id)));

  // ---- retrieval: the ARCH model's own similarity search, plus the knowledge base ----
  let matches: ChatIncident[] = [];
  let generalMatches: ChatSnapshot['generalMatches'] = [];
  let knowledgeChunks: ChatSnapshot['knowledgeChunks'] = [];
  let hasKnowledge = false;

  if (wantsRetrieval) {
    const [chunks, knowledgeCount] = await Promise.all([
      retrieveKnowledge({ organizationId, query: question, k: 3 }).catch(() => []),
      db.knowledgeChunk.count({ where: { organizationId } }).catch(() => 0),
    ]);
    knowledgeChunks = chunks.map((chunk) => ({
      sourceName: chunk.sourceName,
      heading: chunk.heading,
      text: chunk.text,
      url: chunk.url ?? null,
      similarity: chunk.similarity,
    }));
    hasKnowledge = knowledgeCount > 0;

    if (modelRuntime) {
      const teamDocs = modelRuntime.similarDense(question, { k: MATCH_LIMIT, sources: ['team'], minScore: 0.1 });
      const ids = teamDocs.map((match) => match.doc.id.replace(/^team:/, '')).filter((id) => id !== '');
      const rows = ids.length ? await incidentRepository.findByIds(organizationId, ids) : [];
      const byId = new Map(rows.map((row) => [row.id, row]));
      matches = teamDocs
        .map((match) => {
          const row = byId.get(match.doc.id.replace(/^team:/, ''));
          if (!row) return null;
          return toChatIncident(row, now, {
            category: match.doc.category,
            ...(match.doc.rootCause ? { rootCause: match.doc.rootCause } : {}),
            ...(match.doc.mitigation?.length ? { mitigation: match.doc.mitigation } : {}),
            ...(match.doc.prevention?.length ? { prevention: match.doc.prevention } : {}),
            similarity: match.score,
            matchSource: 'team',
          });
        })
        .filter((match): match is ChatIncident => match !== null);

      const external: SimilarDoc[] = [
        ...modelRuntime.similarDense(question, { k: 2, sources: ['pattern'], minScore: 0.12 }),
        ...modelRuntime.similarDense(question, { k: 2, sources: ['public'], minScore: 0.18 }),
      ];
      generalMatches = external.map((match) => ({
        title: match.doc.title,
        categoryLabel: match.doc.category ? CATEGORIES[match.doc.category].label : null,
        rootCause: match.doc.rootCause ?? null,
        fix: match.doc.mitigation ?? [],
        similarity: match.score,
      }));
    }
  }

  const openByService = new Map<string, number>();
  for (const incident of openIncidents) {
    if (!incident.service) continue;
    openByService.set(incident.service, (openByService.get(incident.service) ?? 0) + 1);
  }

  const severityCounts: Partial<Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>> = {};
  let total = 0;
  let open = 0;
  for (const row of statusRows) {
    total += row._count._all;
    if (row.status !== 'RESOLVED') open += row._count._all;
  }
  for (const row of totals) severityCounts[row.severity] = row._count._all;

  const roleRank: Record<string, number> = { OWNER: 0, ADMIN: 1, RESPONDER: 2, VIEWER: 3 };

  return {
    organizationName: organization.name,
    now,
    counts: {
      open,
      bySeverity: severityCounts,
      resolvedLast7Days: resolved7,
      resolvedLast30Days: resolved30,
      totalTracked: total,
      medianResolveMinutes: median(resolveDurations),
    },
    openIncidents,
    recentIncidents,
    services: serviceRows.map((service) => ({
      name: service.name,
      status: service.status,
      openIncidents: openByService.get(service.name) ?? 0,
    })),
    // Names come from the roster the member already sees in Settings; emails are never included.
    members: members
      .map((member) => ({
        name: member.user.name?.trim() || 'Unnamed member',
        role: member.role,
        openIncidents: openByAssignee.get(member.userId) ?? 0,
      }))
      .sort((a, b) => (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9) || b.openIncidents - a.openIncidents),
    model: {
      name: modelRuntime?.name ?? 'arch-native-1',
      version: registry?.version ?? 1,
      trainedAt: modelRuntime?.trainedAt ?? null,
      teamDocuments: modelRuntime?.teamDocuments ?? 0,
      totalDocuments: modelRuntime?.artifact.metrics.documents
        ? Object.values(modelRuntime.artifact.metrics.documents).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0)
        : 0,
    },
    matches,
    generalMatches,
    knowledgeChunks,
    hasKnowledge,
    user: { name: userRecord?.name ?? null, email: userRecord?.email ?? null },
    memory,
  };
}

function toSnapshot(inputs: SnapshotInputs): ChatSnapshot {
  return {
    organizationName: inputs.organizationName,
    now: inputs.now.toISOString(),
    user: inputs.user,
    memory: inputs.memory,
    model: inputs.model,
    counts: inputs.counts,
    openIncidents: inputs.openIncidents,
    recentIncidents: inputs.recentIncidents,
    services: inputs.services,
    members: inputs.members,
    matches: inputs.matches,
    generalMatches: inputs.generalMatches,
    knowledgeChunks: inputs.knowledgeChunks,
    hasKnowledge: inputs.hasKnowledge,
  };
}

// ---------------------------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------------------------

function previewOf(content: string): string {
  const firstLine = content.split('\n').map((line) => line.trim()).find((line) => line.length > 0) ?? '';
  return firstLine.length > 120 ? `${firstLine.slice(0, 120).trimEnd()}…` : firstLine;
}

type SessionRow = {
  id: string;
  title: string;
  titleSource: 'AUTO' | 'USER';
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
};

/** One shape for every session response, so a new field can never appear on one endpoint only. */
function toSessionSummary(row: SessionRow, preview: string | null = null): ChatSessionSummary {
  return {
    id: row.id,
    title: row.title,
    titleSource: row.titleSource,
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    preview,
  };
}

function toMessageView(row: {
  id: string;
  role: 'USER' | 'ARCH';
  content: string;
  intent: string | null;
  confidence: string | null;
  citations: unknown;
  suggestions: unknown;
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
  feedbackRating: 'UP' | 'DOWN' | null;
  createdAt: Date;
}): ChatMessageView {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    intent: row.intent,
    confidence: row.confidence,
    citations: Array.isArray(row.citations) ? (row.citations as ChatAnswer['citations']) : [],
    suggestions: Array.isArray(row.suggestions) ? (row.suggestions as string[]) : [],
    provider: row.provider,
    model: row.model,
    latencyMs: row.latencyMs,
    feedbackRating: row.feedbackRating,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listChatSessions(params: Params): Promise<ChatSessionSummary[]> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.read');
  const sessions = await archChatRepository.listSessions(organizationId, userId, { take: 50 });
  if (sessions.length === 0) return [];

  // One query for the previews instead of one per session.
  const previews = await db.archChatMessage.findMany({
    where: { sessionId: { in: sessions.map((session) => session.id) }, role: 'ARCH' },
    orderBy: { createdAt: 'desc' },
    select: { sessionId: true, content: true },
    take: 300,
  });
  const bySession = new Map<string, string>();
  for (const row of previews) if (!bySession.has(row.sessionId)) bySession.set(row.sessionId, row.content);

  return sessions.map((session) => toSessionSummary(session, bySession.has(session.id) ? previewOf(bySession.get(session.id)!) : null));
}

export async function createChatSession(params: Params & { title?: string | null }): Promise<ChatSessionSummary> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  const title = params.title?.trim().slice(0, TITLE_MAX) || 'New chat';
  const session = await archChatRepository.createSession({ organizationId, userId, title });
  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'chat.session.create',
    entityType: 'arch_chat_session',
    entityId: session.id,
    metadata: { title: session.title },
  });
  return toSessionSummary(session);
}

export async function getChatSession(params: Params & { sessionId: string }): Promise<ChatSessionView> {
  const { organizationId, userId, sessionId } = params;
  await requirePermission(organizationId, userId, 'copilot.read');
  const session = await archChatRepository.findSession(organizationId, userId, sessionId);
  if (!session) throw AppError.notFound('Chat not found.');
  const messages = await archChatRepository.listMessages(sessionId, CHAT_LIMITS.maxLoadedMessages);
  const views = messages.map(toMessageView);
  const preview = views.length
    ? previewOf([...views].reverse().find((message) => message.role === 'ARCH')?.content ?? views[views.length - 1]!.content)
    : null;
  return { ...toSessionSummary(session, preview), messages: views };
}

export async function renameChatSession(params: Params & { sessionId: string; title: string }): Promise<ChatSessionSummary> {
  const { organizationId, userId, sessionId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  const title = params.title.trim().slice(0, TITLE_MAX);
  if (title.length < 1) throw AppError.badRequest('A chat title needs at least one character.');
  const session = await archChatRepository.findSession(organizationId, userId, sessionId);
  if (!session) throw AppError.notFound('Chat not found.');
  await archChatRepository.renameSession(organizationId, userId, sessionId, title);
  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'chat.session.rename',
    entityType: 'arch_chat_session',
    entityId: sessionId,
    metadata: { from: session.title, to: title },
  });
  return toSessionSummary({ ...session, title, titleSource: 'USER' });
}

export async function deleteChatSession(params: Params & { sessionId: string }): Promise<{ id: string }> {
  const { organizationId, userId, sessionId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  const session = await archChatRepository.findSession(organizationId, userId, sessionId);
  if (!session) throw AppError.notFound('Chat not found.');
  await archChatRepository.deleteSession(organizationId, userId, sessionId);
  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'chat.session.delete',
    entityType: 'arch_chat_session',
    entityId: sessionId,
    metadata: { title: session.title, messages: session.messageCount },
  });
  return { id: sessionId };
}

/** "Clear all chats" — the escape hatch when someone shares a screen and wants their history gone. */
export async function deleteAllChatSessions(params: Params): Promise<{ deleted: number }> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  const result = await archChatRepository.deleteAllSessions(organizationId, userId);
  if (result.count > 0) {
    await writeAudit({
      organizationId,
      actorId: userId,
      action: 'chat.session.delete_all',
      entityType: 'arch_chat_session',
      entityId: userId,
      metadata: { deleted: result.count },
    });
  }
  return { deleted: result.count };
}

// ---------------------------------------------------------------------------------------------
// One chat turn
// ---------------------------------------------------------------------------------------------

export type SendChatMessageResult = {
  session: ChatSessionSummary;
  userMessage: ChatMessageView;
  archMessage: ChatMessageView;
  /** True when this turn wiped the member's memory ("forget everything"). */
  memoryCleared: boolean;
};

function toChatTurn(row: { role: 'USER' | 'ARCH'; content: string }): ChatTurn {
  return { role: row.role === 'USER' ? 'user' : 'arch', content: row.content };
}

/**
 * The agent intercept: decide whether this prompt needs the loop (complex / tool-worthy / a
 * bounded script), run one bounded agent turn if so, and fall back to the untouched native answer
 * on any failure. The engine answer is authoritative — the agent only adds planning discipline,
 * exact tool results, or a verified script on top of it.
 */
async function runChatAgent(params: { question: string; nativeAnswer: ChatAnswer; snapshot: ChatSnapshot }): Promise<ChatAnswer> {
  const { question, nativeAnswer, snapshot } = params;
  const script = scriptForTask(question);
  const shouldIntercept = needsPlanning(question) || Boolean(script) || Boolean(detectToolRequest(question));
  if (!shouldIntercept) return nativeAnswer;

  try {
    const result = await runAgentTurn({
      input: question,
      model: createNativeChatAgentModel({
        answer: nativeAnswer.answer,
        intent: nativeAnswer.intent,
        language: nativeAnswer.lang,
        notes: [
          `intent=${nativeAnswer.intent}`,
          `confidence=${nativeAnswer.confidence}`,
          `${nativeAnswer.citations.length} citation(s) for this answer`,
          `${snapshot.knowledgeChunks.length} knowledge chunk(s) retrieved`,
          `${snapshot.matches.length} similar team incident(s) matched`,
          `${snapshot.openIncidents.length} open incident(s) in the workspace`,
        ],
        script,
      }),
      tools: createNativeTools({ workdir: env.ARCH_AGENT_WORKDIR }),
      maxFixAttempts: env.ARCH_AGENT_MAX_FIX_ATTEMPTS,
      // Budget for the whole turn: engine calls are instant, up to three Python runs at 5s each.
      signal: AbortSignal.timeout(20_000),
    });

    if (result.outcome !== 'answered' || !result.answer.trim()) return nativeAnswer;
    // A script answer replaces the engine's "use Code Assist" refusal wholesale; tool/plan turns
    // keep the engine's grounded text as the base, so citations stay honest.
    return {
      ...nativeAnswer,
      answer: result.answer,
      citations: script && result.steps.some((step) => step.type === 'code') ? [] : nativeAnswer.citations,
    };
  } catch (error) {
    // Never log the prompt or the answer — only why the loop bailed.
    console.warn(`[chat] agent turn unavailable (${error instanceof Error ? error.name : 'unknown_error'}); using the native answer`);
    return nativeAnswer;
  }
}

/**
 * One grounded answer: build the workspace snapshot, then let the pure engine speak.
 *
 * Shared by a normal send and by regenerate, so a retried answer is produced exactly the way the
 * original was — same retrieval, same citations, same grounding rules. The engine classifies the
 * intent itself; asking the same deterministic classifier here lets the service skip retrieval for
 * turns that cannot use it (greetings, status questions).
 */
async function answerQuestion(
  params: Params,
  question: string,
  history: ChatTurn[],
): Promise<{ answer: ChatAnswer; engineModel: string; provider: string; latencyMs: number; memoryCleared: boolean }> {
  const intent = classifyChatIntent(question);
  const startedAt = Date.now();
  try {
    const stored = await loadMemory(params.organizationId, params.userId);
    // What the member said *this turn* (and everything still visible in the history window).
    const extracted = extractMemory({ history, question });
    const { facts, cleared } = await rememberFromTurn(params, extracted, stored.facts);
    const snapshot = toSnapshot(await buildSnapshotInputs(params, intent, question, toChatMemory(facts, undefined, cleared)));
    const nativeAnswer = answerChat({ question, snapshot, history });
    const answer = await runChatAgent({ question, nativeAnswer, snapshot });

    return {
      answer,
      engineModel: snapshot.model.name,
      provider: 'arch',
      latencyMs: Date.now() - startedAt,
      memoryCleared: cleared,
    };
  } catch (error) {
    // Chat is the interface people reach for when something is broken — it must not 500.
    console.error('[chat] failed to answer', error instanceof Error ? error.message : String(error));
    throw AppError.unavailable('ARCH could not answer that just now. Nothing was changed — please try again.');
  }
}

export async function sendChatMessage(
  params: Params & { content: string; sessionId?: string | null },
): Promise<SendChatMessageResult> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');

  const content = params.content.trim();
  if (content.length < 2) throw AppError.badRequest('Type a question first.');
  if (content.length > CHAT_LIMITS.maxQuestionChars) {
    throw AppError.badRequest(`Keep the question under ${CHAT_LIMITS.maxQuestionChars.toLocaleString('en-US')} characters.`);
  }

  enforceRateLimit(chatRateLimitKey(organizationId), { limit: env.AI_RATE_LIMIT_PER_MINUTE, windowMs: CHAT_RATE_LIMIT_WINDOW_MS });

  // Resolve (or open) the conversation. A session id that is not this member's is a 404 — same
  // answer as an id that never existed, so ids cannot be probed.
  let session = params.sessionId ? await archChatRepository.findSession(organizationId, userId, params.sessionId) : null;
  if (params.sessionId && !session) throw AppError.notFound('Chat not found.');
  if (!session) {
    session = await archChatRepository.createSession({ organizationId, userId, title: titleFromMessage(content) });
  }

  const history: ChatTurn[] = (await archChatRepository.recentMessages(session.id, CHAT_LIMITS.maxHistoryTurns)).map(toChatTurn);

  const { answer, engineModel, provider, latencyMs, memoryCleared } = await answerQuestion({ organizationId, userId }, content, history);

  const userMessage = await archChatRepository.createMessage({
    sessionId: session.id,
    organizationId,
    role: 'USER',
    content,
  });

  const archMessage = await archChatRepository.createMessage({
    sessionId: session.id,
    organizationId,
    role: 'ARCH',
    content: answer.answer,
    intent: answer.intent,
    confidence: answer.confidence,
    citations: answer.citations,
    suggestions: answer.suggestions,
    provider,
    model: engineModel,
    latencyMs,
  });

  // The first user message names the chat, unless a human already renamed it.
  const autoTitle = session.titleSource === 'AUTO' && session.messageCount === 0 ? titleFromMessage(content) : undefined;
  const updated = await archChatRepository.touchSession(session.id, { messagesAdded: 2, ...(autoTitle ? { title: autoTitle } : {}) });

  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'chat.message',
    entityType: 'arch_chat_session',
    entityId: session.id,
    // Metadata carries shape, never the conversation itself: content is the user's to keep, not the audit log's.
    metadata: { intent: answer.intent, confidence: answer.confidence, provider, latencyMs, chars: content.length },
  });

  return {
    session: toSessionSummary(updated, previewOf(answer.answer)),
    userMessage: toMessageView(userMessage),
    archMessage: toMessageView(archMessage),
    memoryCleared,
  };
}

// ---------------------------------------------------------------------------------------------
// Regenerate ("Try again")
// ---------------------------------------------------------------------------------------------

export type RegenerateChatAnswerResult = {
  session: ChatSessionSummary;
  archMessage: ChatMessageView;
  memoryCleared: boolean;
};

/**
 * Retry the last answer of a chat — the one ChatGPT-shaped button every user reaches for when an
 * answer misses. Nothing new is stored: the last ARCH row is rewritten in place, so the transcript
 * still reads as one question → one answer and the message count does not drift.
 *
 * The question is re-answered from the workspace as it is *now*, with the same grounding rules,
 * and the retry is audited with shape only — never the text.
 */
export async function regenerateChatAnswer(params: Params & { sessionId: string }): Promise<RegenerateChatAnswerResult> {
  const { organizationId, userId, sessionId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  enforceRateLimit(chatRateLimitKey(organizationId), { limit: env.AI_RATE_LIMIT_PER_MINUTE, windowMs: CHAT_RATE_LIMIT_WINDOW_MS });

  const session = await archChatRepository.findSession(organizationId, userId, sessionId);
  if (!session) throw AppError.notFound('Chat not found.');

  // The tail of the transcript: the newest answer, and the question it answered.
  const tail = await archChatRepository.recentMessages(sessionId, CHAT_LIMITS.maxHistoryTurns + 2);
  const last = tail[tail.length - 1];
  if (!last || last.role !== 'ARCH') throw AppError.badRequest('There is no answer to regenerate yet.');
  let questionIndex = tail.length - 2;
  while (questionIndex >= 0 && tail[questionIndex]!.role !== 'USER') questionIndex -= 1;
  const question = questionIndex >= 0 ? tail[questionIndex]! : null;
  if (!question) throw AppError.badRequest('That answer has no question in this chat to retry.');

  const history = tail.slice(0, questionIndex).slice(-CHAT_LIMITS.maxHistoryTurns).map(toChatTurn);
  const { answer, engineModel, provider, latencyMs, memoryCleared } = await answerQuestion({ organizationId, userId }, question.content, history);

  const updated = await archChatRepository.updateMessage(last.id, {
    content: answer.answer,
    intent: answer.intent,
    confidence: answer.confidence,
    citations: answer.citations,
    suggestions: answer.suggestions,
    provider,
    model: engineModel,
    latencyMs,
    feedbackRating: null,
  });

  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'chat.message.regenerate',
    entityType: 'arch_chat_session',
    entityId: sessionId,
    metadata: { messageId: last.id, intent: answer.intent, confidence: answer.confidence, provider, latencyMs },
  });

  return { session: toSessionSummary(session, previewOf(answer.answer)), archMessage: toMessageView(updated), memoryCleared };
}

/** Save (or clear) the caller's one-tap rating on an answer in their own private chat. */
export async function setChatMessageFeedback(
  params: Params & { sessionId: string; messageId: string; rating: 'UP' | 'DOWN' | null },
): Promise<{ messageId: string; rating: 'UP' | 'DOWN' | null }> {
  const { organizationId, userId, sessionId, messageId, rating } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  const message = await archChatRepository.findOwnedAssistantMessage(organizationId, userId, sessionId, messageId);
  if (!message) throw AppError.notFound('Chat answer not found.');

  const updated = await archChatRepository.updateFeedback(messageId, rating);
  await writeAudit({
    organizationId,
    actorId: userId,
    action: rating ? 'chat.feedback' : 'chat.feedback.clear',
    entityType: 'arch_chat_message',
    entityId: messageId,
    // Ratings are evaluation metadata only. Never store the answer or question in the audit log.
    metadata: { rating },
  });
  return { messageId, rating: updated.feedbackRating };
}

export type ChatCorpusSummary = {
  incidents: number;
  knowledgeChunks: number;
  services: number;
  members: number;
  medianResolveMinutes: number | null;
  /** Registry version of the model serving this workspace (1 = built-in base model). */
  modelVersion: number;
  /** True once the model has been trained on this workspace's own resolved incidents. */
  modelTrained: boolean;
};

/** What chat has to answer from — drives the page header and the empty-workspace notice. */
export async function chatCorpusSummary(params: Params): Promise<ChatCorpusSummary> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.read');
  const since30 = new Date(Date.now() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1_000);
  const [incidents, knowledgeChunks, services, members, durations, model] = await Promise.all([
    incidentRepository.count(organizationId),
    db.knowledgeChunk.count({ where: { organizationId } }),
    serviceRepository.list(organizationId).then((rows) => rows.length),
    organizationRepository.countMembers(organizationId),
    incidentRepository.resolveDurationsSince(organizationId, since30, 200),
    db.archModel.findUnique({ where: { organizationId }, select: { version: true, teamDocuments: true } }),
  ]);
  return {
    incidents,
    knowledgeChunks,
    services,
    members,
    medianResolveMinutes: median(durations),
    modelVersion: model?.version ?? 1,
    modelTrained: Boolean(model) && (model?.teamDocuments ?? 0) > 0,
  };
}

// ---------------------------------------------------------------------------------------------
// Memory, as the member sees and controls it (V9)
// ---------------------------------------------------------------------------------------------

export type ChatMemoryView = {
  /** True when ARCH has actually saved something about this member. */
  hasFacts: boolean;
  userName: string | null;
  userRole: string | null;
  techStack: string[];
  notes: string[];
  memory: boolean;
  updatedAt: string | null;
  clearedAt: string | null;
  /** What a new chat would be able to answer from, in one line — shown in the panel. */
  summary: string;
  limits: { maxNotes: number; maxNoteChars: number; maxStack: number };
};

function memorySummary(facts: MemoryFacts): string {
  const parts = [
    facts.userName ? `name: ${facts.userName}` : null,
    facts.userRole ? `role: ${facts.userRole}` : null,
    facts.techStack.length ? `stack: ${facts.techStack.join(', ')}` : null,
    facts.notes.length ? `${facts.notes.length} note${facts.notes.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nothing saved yet';
}

/**
 * Everything ARCH remembers about the caller, for the Memory panel. Read permission is the same as
 * reading a chat (`copilot.read`) because it is the member's own row — nobody else's.
 */
export async function getChatMemory(params: Params): Promise<ChatMemoryView> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.read');
  const row = await archChatRepository.findMemory(organizationId, userId);
  const { facts } = await loadMemory(organizationId, userId);
  const hasFacts = Boolean(facts.userName || facts.userRole || facts.techStack.length || facts.notes.length);
  return {
    hasFacts,
    ...facts,
    memory: true,
    updatedAt: row?.updatedAt.toISOString() ?? null,
    clearedAt: row?.clearedAt?.toISOString() ?? null,
    summary: memorySummary(facts),
    limits: { maxNotes: MEMORY_MAX_NOTES, maxNoteChars: MEMORY_NOTE_CHARS, maxStack: MEMORY_MAX_STACK },
  };
}

/**
 * Edit memory by hand: add a note, remove one, correct the name or role. The panel needs this for
 * the same reason ChatGPT has one — memory the user cannot see is memory the user cannot trust.
 */
export async function updateChatMemory(
  params: Params & {
    notes?: { add?: string; remove?: string };
    userName?: string | null;
    userRole?: string | null;
    clearStack?: boolean;
  },
): Promise<ChatMemoryView> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  const stored = await loadMemory(organizationId, userId);
  const next: MemoryFacts = { ...stored.facts, techStack: [...stored.facts.techStack], notes: [...stored.facts.notes] };

  if (params.notes?.add !== undefined) {
    const note = params.notes.add.trim().slice(0, MEMORY_NOTE_CHARS);
    if (note.length < 3) throw AppError.badRequest('A memory needs at least a few characters.');
    if (!next.notes.includes(note)) next.notes = [...next.notes, note].slice(-MEMORY_MAX_NOTES);
  }
  if (params.notes?.remove !== undefined) {
    const target = params.notes.remove.trim();
    const before = next.notes.length;
    next.notes = next.notes.filter((note) => note !== target);
    if (next.notes.length === before) throw AppError.notFound('That memory entry was not found.');
  }
  if (params.userName !== undefined) next.userName = params.userName?.trim().slice(0, 60) || null;
  if (params.userRole !== undefined) next.userRole = params.userRole?.trim().slice(0, 60) || null;
  if (params.clearStack) next.techStack = [];

  await archChatRepository.saveMemory(organizationId, userId, next);
  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'chat.memory.update',
    entityType: 'arch_chat_memory',
    entityId: userId,
    // Metadata carries shape only — never what was remembered.
    metadata: { notes: next.notes.length, stack: next.techStack.length, hasName: Boolean(next.userName), hasRole: Boolean(next.userRole) },
  });
  return getChatMemory(params);
}

/** Forget everything — the one click that makes "ARCH remembers things" acceptable. */
export async function clearChatMemory(params: Params): Promise<ChatMemoryView> {
  const { organizationId, userId } = params;
  await requirePermission(organizationId, userId, 'copilot.generate');
  const existing = await archChatRepository.findMemory(organizationId, userId);
  // A cleared row is kept (with `clearedAt`) so the panel can say *when* — the facts themselves go.
  await archChatRepository.saveMemory(organizationId, userId, { ...EMPTY_FACTS }, { cleared: true });
  await writeAudit({
    organizationId,
    actorId: userId,
    action: 'chat.memory.clear',
    entityType: 'arch_chat_memory',
    entityId: userId,
    metadata: { existed: Boolean(existing) },
  });
  return getChatMemory(params);
}
