-- ARCH v3 — ARCH's own model (no external AI vendor) + Code Assist inside incidents.
-- See docs/engineering/ARCH-MODEL.md.

ALTER TYPE "AiSuggestionType" ADD VALUE IF NOT EXISTS 'CODE_FIX';

CREATE TABLE "arch_models" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "format" INTEGER NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL,
    "teamDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "artifact" JSONB NOT NULL,
    "trainedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "arch_models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "arch_models_organizationId_key" ON "arch_models"("organizationId");

ALTER TABLE "arch_models" ADD CONSTRAINT "arch_models_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
