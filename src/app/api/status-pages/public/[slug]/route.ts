import { NextResponse, type NextRequest } from 'next/server';
import { fail } from '@/lib/api';
import { getPublicStatusPage } from '@/server/services/statusPage.service';

type Context = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

/**
 * GET /api/status-pages/public/:slug — anonymous read of a *published* status page.
 * No session, no organization id: the query itself requires `isPublished: true`.
 */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const page = await getPublicStatusPage(slug);
    if (!page) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Status page not found.' } }, { status: 404 });
    }
    return NextResponse.json(
      { data: page },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
    );
  } catch (error) {
    return fail(error);
  }
}
