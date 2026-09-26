-- V6 — RAG knowledge sources + learning feedback.
-- ARCH retrieves from documents the organization owns (runbooks, docs, notes) using embeddings its
-- own model produces. No external embedding API, no network at inference time.

CREATE TYPE "KnowledgeSourceKind" AS ENUM ('RUNBOOK', 'DOC', 'NOTE', 'URL', 'INCIDENT_EXPORT');
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "ArchModelFeedbackKind" AS ENUM ('DRAFT_EDITED', 'DRAFT_APPROVED', 'DRAFT_DISMISSED', 'SEVERITY_CORRECTED', 'CATEGORY_CORRECTED');

CREATE TABLE "knowledge_sources" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL, "kind" "KnowledgeSourceKind" NOT NULL DEFAULT 'DOC', "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'PENDING', "sourceUrl" TEXT, "contentHash" TEXT, "chunkCount" INTEGER NOT NULL DEFAULT 0, "tokenCount" INTEGER NOT NULL DEFAULT 0, "error" TEXT, "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id"));
CREATE INDEX "knowledge_sources_organizationId_status_idx" ON "knowledge_sources"("organizationId", "status");
CREATE INDEX "knowledge_sources_organizationId_createdAt_idx" ON "knowledge_sources"("organizationId", "createdAt");
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "knowledge_chunks" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "ordinal" INTEGER NOT NULL, "heading" TEXT, "text" TEXT NOT NULL, "tokenCount" INTEGER NOT NULL DEFAULT 0, "embedding" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id"));
CREATE INDEX "knowledge_chunks_organizationId_sourceId_idx" ON "knowledge_chunks"("organizationId", "sourceId");
CREATE INDEX "knowledge_chunks_sourceId_ordinal_idx" ON "knowledge_chunks"("sourceId", "ordinal");
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_fk" FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "arch_model_feedback" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "incidentId" TEXT, "suggestionId" TEXT, "task" TEXT NOT NULL, "kind" "ArchModelFeedbackKind" NOT NULL, "original" JSONB, "corrected" JSONB, "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "arch_model_feedback_pkey" PRIMARY KEY ("id"));
CREATE INDEX "arch_model_feedback_organizationId_createdAt_idx" ON "arch_model_feedback"("organizationId", "createdAt");
CREATE INDEX "arch_model_feedback_organizationId_task_kind_idx" ON "arch_model_feedback"("organizationId", "task", "kind");
ALTER TABLE "arch_model_feedback" ADD CONSTRAINT "arch_model_feedback_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arch_model_feedback" ADD CONSTRAINT "arch_model_feedback_incident_fk" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- V6 reproduction: the generated test that had to fail before the patch and pass after it.
ALTER TABLE "fix_verifications" ADD COLUMN "reproductionTest" TEXT, ADD COLUMN "reproduction" JSONB;
