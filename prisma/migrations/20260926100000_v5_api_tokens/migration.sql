CREATE TYPE "TokenScope" AS ENUM ('READ', 'READ_WRITE');
CREATE TABLE "api_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "api_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "api_tokens_hash_key" ON "api_tokens"("hash");
CREATE INDEX "api_tokens_organizationId_revokedAt_idx" ON "api_tokens"("organizationId", "revokedAt");
CREATE INDEX "api_tokens_prefix_idx" ON "api_tokens"("prefix");
