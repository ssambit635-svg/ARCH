-- ARCH v4 — Verified Fix Loop: GitHub repo connect + org permission + commit pinning,
-- patch + sandbox verification + evidence bundle + human approve → PR + audit log.
-- See M1-M5 in the task description.

-- Extend AiSuggestionType for verified fixes (patch tested in sandbox).
ALTER TYPE "AiSuggestionType" ADD VALUE IF NOT EXISTS 'VERIFIED_FIX';

-- Repo connections: GitHub repo linked to an organization, RBAC enforced, commit pinned.
CREATE TABLE "repo_connections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'github',
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "pinnedCommitSha" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repo_connections_organizationId_fullName_key" ON "repo_connections"("organizationId", "fullName");
CREATE INDEX "repo_connections_organizationId_idx" ON "repo_connections"("organizationId");
CREATE INDEX "repo_connections_organizationId_isActive_idx" ON "repo_connections"("organizationId", "isActive");

ALTER TABLE "repo_connections" ADD CONSTRAINT "repo_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix verifications: one sandbox run per proposed patch, isolated, no prod credentials, evidence bundle.
CREATE TABLE "fix_verifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "repoConnectionId" TEXT,
    "commitSha" TEXT,
    "patch" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "testCommand" TEXT,
    "testOutput" TEXT,
    "evidence" JSONB,
    "durationMs" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "fix_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fix_verifications_organizationId_incidentId_idx" ON "fix_verifications"("organizationId", "incidentId");
CREATE INDEX "fix_verifications_suggestionId_idx" ON "fix_verifications"("suggestionId");
CREATE INDEX "fix_verifications_repoConnectionId_idx" ON "fix_verifications"("repoConnectionId");
CREATE INDEX "fix_verifications_organizationId_status_idx" ON "fix_verifications"("organizationId", "status");

ALTER TABLE "fix_verifications" ADD CONSTRAINT "fix_verifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fix_verifications" ADD CONSTRAINT "fix_verifications_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fix_verifications" ADD CONSTRAINT "fix_verifications_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "ai_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fix_verifications" ADD CONSTRAINT "fix_verifications_repoConnectionId_fkey" FOREIGN KEY ("repoConnectionId") REFERENCES "repo_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pull requests: created only after human approval, audited.
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "suggestionId" TEXT,
    "verificationId" TEXT,
    "repoConnectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "branch" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL DEFAULT 'main',
    "commitSha" TEXT,
    "patch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "externalUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pull_requests_verificationId_key" ON "pull_requests"("verificationId");
CREATE INDEX "pull_requests_organizationId_idx" ON "pull_requests"("organizationId");
CREATE INDEX "pull_requests_incidentId_idx" ON "pull_requests"("incidentId");
CREATE INDEX "pull_requests_repoConnectionId_idx" ON "pull_requests"("repoConnectionId");

ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repoConnectionId_fkey" FOREIGN KEY ("repoConnectionId") REFERENCES "repo_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "fix_verifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
