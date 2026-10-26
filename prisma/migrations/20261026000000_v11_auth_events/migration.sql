CREATE TABLE "auth_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "provider" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "auth_events_userId_createdAt_idx" ON "auth_events"("userId", "createdAt");
CREATE INDEX "auth_events_event_createdAt_idx" ON "auth_events"("event", "createdAt");
