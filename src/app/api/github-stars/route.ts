import { NextResponse } from 'next/server';
import { GITHUB_REPO } from '@/lib/brand';
import { getRepoStars } from '@/server/services/repoStars.service';

/**
 * GET /api/github-stars — the landing page's live GitHub star count.
 *
 * Public and unauthenticated on purpose (the marketing header calls it), so it exposes exactly one
 * fact — the star count of the one repository named in `brand.ts` — and takes no input: no query
 * parameter can point it at another repository or make it spend the server's GitHub token elsewhere.
 * It does not touch the database either, so the badge keeps working while PostgreSQL is down.
 *
 * `stars: null` means "GitHub could not be asked" (private repository without GITHUB_TOKEN, rate
 * limit, offline). It is still a 200: the header is cosmetic, and the client simply shows a plain
 * "Star" label instead of a number. See repoStars.service.ts.
 *
 * `force-dynamic` keeps Next from prerendering this at build time, which would freeze whatever
 * number GitHub returned during `next build` into the deployment.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const { stars, fetchedAt } = await getRepoStars();
  return NextResponse.json(
    { data: { repo: GITHUB_REPO, stars, fetchedAt } },
    {
      headers: {
        // The origin already reuses a reading for 5 minutes; keep any CDN in front of it short-lived
        // so the number does not lag by two cache layers, and retry an unknown answer sooner.
        'Cache-Control': stars === null ? 'public, s-maxage=30' : 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
