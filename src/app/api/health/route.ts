import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { APP_VERSION } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Liveness/readiness probe. Checks the database because a web process without a DB is useless. */
export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      version: APP_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database: { status: 'ok', latencyMs: Date.now() - startedAt } },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        version: APP_VERSION,
        checks: { database: { status: 'error', message: error instanceof Error ? error.message : String(error) } },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
