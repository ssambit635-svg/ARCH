-- V8 — Chat with ARCH.
--
-- Conversations are personal (one row per member) but tenant-scoped: every read filters on
-- organizationId AND userId. Messages stay in the workspace's database — the same database the
-- incidents live in — and are never sent to an external vendor (ARCH_OFFLINE_ONLY keeps that true
-- for the AI path as well).
CREATE TYPE "ArchChatRole" AS ENUM ('USER', 'ARCH');
CREATE TYPE "ArchChatTitleSource" AS ENUM ('AUTO', 'USER');

CREATE TABLE "arch_chat_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "titleSource" "ArchChatTitleSource" NOT NULL DEFAULT 'AUTO',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arch_chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "arch_chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "ArchChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "confidence" TEXT,
    "citations" JSONB,
    "suggestions" JSONB,
    "provider" TEXT,
    "model" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arch_chat_messages_pkey" PRIMARY KEY ("id")
);

-- The sidebar query: this member's sessions in this workspace, newest conversation first.
CREATE INDEX "arch_chat_sessions_organizationId_userId_lastMessageAt_idx"
  ON "arch_chat_sessions"("organizationId", "userId", "lastMessageAt" DESC);
CREATE INDEX "arch_chat_messages_sessionId_createdAt_idx" ON "arch_chat_messages"("sessionId", "createdAt");
CREATE INDEX "arch_chat_messages_organizationId_createdAt_idx" ON "arch_chat_messages"("organizationId", "createdAt");

ALTER TABLE "arch_chat_sessions" ADD CONSTRAINT "arch_chat_sessions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arch_chat_sessions" ADD CONSTRAINT "arch_chat_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arch_chat_messages" ADD CONSTRAINT "arch_chat_messages_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "arch_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arch_chat_messages" ADD CONSTRAINT "arch_chat_messages_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
