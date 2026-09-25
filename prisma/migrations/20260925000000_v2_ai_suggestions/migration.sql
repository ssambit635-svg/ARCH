-- ARCH v2 — ARCH Copilot drafts (AGENTS-V2.md, milestone M1).
-- AI output is stored as a PENDING draft and only takes effect after a human approves it.

CREATE TYPE "AiSuggestionType" AS ENUM ('SUMMARY', 'TRIAGE', 'STATUS_UPDATE', 'POSTMORTEM');
CREATE TYPE "AiSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'DISMISSED');

CREATE TABLE "ai_suggestions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "AiSuggestionType" NOT NULL,
    "status" "AiSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "output" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedEventId" TEXT,
    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_suggestions_organizationId_incidentId_createdAt_idx" ON "ai_suggestions"("organizationId", "incidentId", "createdAt");
CREATE INDEX "ai_suggestions_incidentId_status_idx" ON "ai_suggestions"("incidentId", "status");

ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
