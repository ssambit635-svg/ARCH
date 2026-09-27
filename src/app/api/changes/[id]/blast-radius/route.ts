import type { NextRequest } from 'next/server';
import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { getChangeBlastRadius } from '@/server/services/v6.service';

type Context = { params: Promise<{ id: string }> };

/**
 * V7 — change-aware blast radius: given a deploy/commit, which services sit downstream of it in
 * the dependency map and would be affected if it goes wrong? Pairs the graph walk with the
 * change-risk score and recent incidents on the affected set. Read-only.
 */
export const GET = handleRoute(async (request: NextRequest, context: Context) => {
  const { user, organization } = await requireApiContext(request);
  const { id } = await context.params;
  return ok(await getChangeBlastRadius({ organizationId: organization.id, userId: user.id, changeId: id }));
});
