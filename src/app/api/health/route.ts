import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { APP_VERSION } from '@/lib/api';
import { isProduction } from '@/lib/env';
import { describeGithubConfig } from '@/server/services/github.service';

export const dynamic = 'force-dynamic';

/** Public probe — mode only. The masked token hint stays on the authenticated /api/github route. */
function githubReadiness() {
  const config = describeGithubConfig();
  return {
    status: config.mode === 'real' ? 'configured' : 'offline',
    mode: config.mode,
    tokenConfigured: config.tokenConfigured,
    tokenKind: config.tokenKind,
  };
}

/** A Postgres error can echo the connection string. Never return that to an anonymous caller. */
function safeDbMessage(error: unknown): string {
  if (isProduction) return 'database unreachable';
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://[redacted]');
}

/** Liveness/readiness probe. Checks the database because a web process without a DB is useless. */
export async function GET() {
  const startedAt = Date.now();
  const github = githubReadiness();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      version: APP_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database: { status: 'ok', latencyMs: Date.now() - startedAt }, github },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        version: APP_VERSION,
        checks: { database: { status: 'error', message: safeDbMessage(error) }, github },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
