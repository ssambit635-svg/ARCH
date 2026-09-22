import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, fail } from '@/lib/api';
import { ingest } from '@/server/services/webhook.service';

type Context = { params: Promise<{ provider: string }> };

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/:provider?endpoint=<externalId>
 *
 * Machine-to-machine: authenticated by HMAC signature, never by session.
 *   401 invalid/absent signature (recorded as a REJECTED delivery)
 *   429 rate limited
 *   400 body is not JSON
 *   422 payload failed validation
 *   202 accepted — or a no-op duplicate for an already-seen delivery id
 */
export async function POST(request: NextRequest, context: Context) {
  try {
    const { provider } = await context.params;
    const rawBody = await request.text();

    const result = await ingest({
      provider,
      rawBody,
      headers: request.headers,
      searchParams: request.nextUrl.searchParams,
      clientIp: clientIp(request),
    });

    return NextResponse.json(result.body, { status: result.statusCode, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error);
  }
}
