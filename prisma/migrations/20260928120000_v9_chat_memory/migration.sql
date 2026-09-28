-- V9 — Chat memory that actually persists.
--
-- Until now "I have saved that" was true only inside the 12-turn history window: the engine
-- re-extracted facts from the visible transcript and forgot them when the window moved on. This
-- table stores what one member told ARCH about themselves — name, role, tech stack, notes — so a
-- brand-new conversation can still answer "what do you remember about me?".
--
-- Personal like chat itself: one row per (organizationId, userId), and nothing here trains the
-- model. Every value is editable or deletable by that member from the chat's Memory panel.
CREATE TABLE "arch_chat_memory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facts" JSONB NOT NULL DEFAULT '{}',
    "clearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arch_chat_memory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "arch_chat_memory_organizationId_userId_key"
  ON "arch_chat_memory"("organizationId", "userId");

ALTER TABLE "arch_chat_memory" ADD CONSTRAINT "arch_chat_memory_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arch_chat_memory" ADD CONSTRAINT "arch_chat_memory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
