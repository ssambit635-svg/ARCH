-- ARCH v3 — model registry + background training jobs.
-- Every training run is kept as a version (never overwritten), evaluated against the active
-- model, and promoted only if it beats it. Retraining runs in the worker, not in web requests.
-- See docs/engineering/ARCH-MODEL.md.

-- Model registry: one row per training run.
CREATE TABLE "arch_model_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" INTEGER NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL,
    "teamDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "artifact" JSONB NOT NULL,
    "evaluation" JSONB NOT NULL DEFAULT '{}',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "trainedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arch_model_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "arch_model_versions_organizationId_version_key" ON "arch_model_versions"("organizationId", "version");
CREATE INDEX "arch_model_versions_organizationId_createdAt_idx" ON "arch_model_versions"("organizationId", "createdAt");

ALTER TABLE "arch_model_versions" ADD CONSTRAINT "arch_model_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Background training queue (outbox pattern, drained by `npm run worker`).
CREATE TABLE "arch_model_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "requestedById" TEXT,
    "error" TEXT,
    "versionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "arch_model_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "arch_model_jobs_status_createdAt_idx" ON "arch_model_jobs"("status", "createdAt");
CREATE INDEX "arch_model_jobs_organizationId_createdAt_idx" ON "arch_model_jobs"("organizationId", "createdAt");

ALTER TABLE "arch_model_jobs" ADD CONSTRAINT "arch_model_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- arch_models becomes the ACTIVE pointer into the registry.
ALTER TABLE "arch_models" ADD COLUMN "activeVersionId" TEXT;
CREATE UNIQUE INDEX "arch_models_activeVersionId_key" ON "arch_models"("activeVersionId");
ALTER TABLE "arch_models" ADD CONSTRAINT "arch_models_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "arch_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
