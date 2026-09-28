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
  titleFromMessage,
  type ChatAnswer,
  type ChatIncident,
  type ChatIntent,
  type ChatSnapshot,
  type ChatTurn,
} from '../ai/arch-model/chat';
import type { SimilarDoc } from '../ai/arch-model/runtime';
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
 * not handed. Chat is free — no vendor, no tokens, no network — so it is available to every member
 * who can read incidents, not just admins.
 */

export const CHAT_RATE_LIMIT_WINDOW_MS = 60_000;

/** Intents where retrieval is worth the queries; small talk and status questions are answered from the snapshot alone. */
const RETRIEVAL_INTENTS = new Set<ChatIntent>(['incident_search', 'lessons', 'explain_incident', 'runbook', 'advice', 'unknown']);

const OPEN_INCIDENT_LIMIT = 25;
const RECENT_INCIDENT_LIMIT = 25;
const MATCH_LIMIT = 5;
/** How far back "resolve time" statistics look. */
const STATS_WINDOW_DAYS = 30;

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

type SnapshotInputs = {
  organizationName: string;
  now: Date;
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
async function buildSnapshotInputs(params: Params, intent: ChatIntent, question: string): Promise<SnapshotInputs> {
  const { organizationId, userId } = params;
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const since30 = new Date(now.getTime() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1_000);
  const wantsRetrieval = RETRIEVAL_INTENTS.has(intent);

  const [organization, statusRows, openRows, recentRows, serviceRows, totals, members, openByAssignee, resolveDurations, modelRuntime, registry] = await Promise.all([
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
  };
}

function toSnapshot(inputs: SnapshotInputs): ChatSnapshot {
  return {
    organizationName: inputs.organizationName,
    now: inputs.now.toISOString(),
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

  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    titleSource: session.titleSource,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    preview: bySession.has(session.id) ? previewOf(bySession.get(session.id)!) : null,
  }));
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
  return {
    id: session.id,
    title: session.title,
    titleSource: session.titleSource,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    preview: null,
  };
}

export async function getChatSession(params: Params & { sessionId: string }): Promise<ChatSessionView> {
  const { organizationId, userId, sessionId } = params;
  await requirePermission(organizationId, userId, 'copilot.read');
  const session = await archChatRepository.findSession(organizationId, userId, sessionId);
  if (!session) throw AppError.notFound('Chat not found.');
  const messages = await archChatRepository.listMessages(sessionId, CHAT_LIMITS.maxLoadedMessages);
  const views = messages.map(toMessageView);
  return {
    id: session.id,
    title: session.title,
    titleSource: session.titleSource,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    preview: views.length ? previewOf([...views].reverse().find((message) => message.role === 'ARCH')?.content ?? views[views.length - 1]!.content) : null,
    messages: views,
  };
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
  return {
    id: session.id,
    title,
    titleSource: 'USER',
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    preview: null,
  };
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
};

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

  const history: ChatTurn[] = (await archChatRepository.recentMessages(session.id, CHAT_LIMITS.maxHistoryTurns)).map((row) => ({
    role: row.role === 'USER' ? 'user' : 'arch',
    content: row.content,
  }));

  // The engine classifies intent itself; asking the same deterministic classifier here lets the
  // service skip retrieval for turns that cannot use it (greetings, status questions).
  const intent = classifyChatIntent(content);

  const startedAt = Date.now();
  let answer: ChatAnswer;
  let engineModel = 'arch-native-1';
  try {
    const snapshot = toSnapshot(await buildSnapshotInputs({ organizationId, userId }, intent, content));
    engineModel = snapshot.model.name;
    answer = answerChat({ question: content, snapshot, history });
  } catch (error) {
    // Chat is the interface people reach for when something is broken — it must not 500.
    console.error('[chat] failed to answer', error instanceof Error ? error.message : String(error));
    throw AppError.unavailable('ARCH could not answer that just now. Nothing was changed — please try again.');
  }
  const latencyMs = Date.now() - startedAt;

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
    provider: 'arch',
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
    metadata: { intent: answer.intent, confidence: answer.confidence, provider: 'arch', latencyMs, chars: content.length },
  });

  return {
    session: {
      id: updated.id,
      title: updated.title,
      titleSource: updated.titleSource,
      messageCount: updated.messageCount,
      lastMessageAt: updated.lastMessageAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      preview: previewOf(answer.answer),
    },
    userMessage: toMessageView(userMessage),
    archMessage: toMessageView(archMessage),
  };
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
