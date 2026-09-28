import { db, type DbClient } from '@/lib/db';
import type { ArchChatRole } from '@/generated/prisma/client';

/**
 * Chat storage. Every function takes `organizationId` *and* `userId`: a chat is personal, so a
 * session id from another member or another workspace must return nothing at all (the service
 * turns "nothing" into a 404 — never a 403, which would leak that the id exists).
 */
export const archChatRepository = {
  listSessions(organizationId: string, userId: string, options: { includeArchived?: boolean; take?: number } = {}, client: DbClient = db) {
    return client.archChatSession.findMany({
      where: { organizationId, userId, ...(options.includeArchived ? {} : { archivedAt: null }) },
      orderBy: { lastMessageAt: 'desc' },
      take: options.take ?? 50,
      select: {
        id: true,
        title: true,
        titleSource: true,
        messageCount: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  findSession(organizationId: string, userId: string, id: string, client: DbClient = db) {
    return client.archChatSession.findFirst({ where: { id, organizationId, userId } });
  },

  createSession(data: { organizationId: string; userId: string; title?: string }, client: DbClient = db) {
    return client.archChatSession.create({ data });
  },

  renameSession(organizationId: string, userId: string, id: string, title: string, client: DbClient = db) {
    return client.archChatSession.updateMany({
      where: { id, organizationId, userId },
      // A human rename is sticky: auto-titling never overwrites it.
      data: { title, titleSource: 'USER' },
    });
  },

  touchSession(id: string, data: { messagesAdded: number; title?: string }, client: DbClient = db) {
    return client.archChatSession.update({
      where: { id },
      data: {
        messageCount: { increment: data.messagesAdded },
        lastMessageAt: new Date(),
        ...(data.title ? { title: data.title } : {}),
      },
    });
  },

  deleteSession(organizationId: string, userId: string, id: string, client: DbClient = db) {
    return client.archChatSession.deleteMany({ where: { id, organizationId, userId } });
  },

  deleteAllSessions(organizationId: string, userId: string, client: DbClient = db) {
    return client.archChatSession.deleteMany({ where: { organizationId, userId } });
  },

  /** The transcript, oldest first (bounded by the service). */
  listMessages(sessionId: string, take: number, client: DbClient = db) {
    return client.archChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take,
    });
  },

  /** The newest `take` messages, returned oldest-first — what the engine needs for follow-ups. */
  async recentMessages(sessionId: string, take: number, client: DbClient = db) {
    const rows = await client.archChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.reverse();
  },

  createMessage(
    data: {
      sessionId: string;
      organizationId: string;
      role: ArchChatRole;
      content: string;
      intent?: string | null;
      confidence?: string | null;
      citations?: unknown;
      suggestions?: unknown;
      provider?: string | null;
      model?: string | null;
      latencyMs?: number | null;
    },
    client: DbClient = db,
  ) {
    // Json columns take any serializable value; the shapes are defined by ChatAnswer.
    return client.archChatMessage.create({ data: data as never });
  },

  /**
   * Rewrite one stored answer (regenerate). The row keeps its id, so the transcript still reads as
   * one question → one answer; only the words change.
   */
  updateMessage(
    id: string,
    data: {
      content: string;
      intent?: string | null;
      confidence?: string | null;
      citations?: unknown;
      suggestions?: unknown;
      provider?: string | null;
      model?: string | null;
      latencyMs?: number | null;
    },
    client: DbClient = db,
  ) {
    return client.archChatMessage.update({ where: { id }, data: data as never });
  },

  countMessages(sessionId: string, client: DbClient = db) {
    return client.archChatMessage.count({ where: { sessionId } });
  },
};
