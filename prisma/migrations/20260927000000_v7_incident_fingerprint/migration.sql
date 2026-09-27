-- V7 — incident correlation: content-derived alert fingerprint for grouping repeat alerts and
-- linking incidents with the same root cause. Nullable: historical rows keep NULL and are
-- fingerprinted lazily by the correlation service.
ALTER TABLE "incidents" ADD COLUMN "fingerprint" TEXT;
CREATE INDEX "incidents_organizationId_fingerprint_idx" ON "incidents"("organizationId", "fingerprint");
