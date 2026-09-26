import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { getHints } from '@/server/services/copilot.service';

type Context = { params: Promise<{ id: string }> };

/**
 * GET — ARCH Hints (gap detection).
 *
 * Returns risks / missing actions ARCH found from the timeline (stale updates, no assignee on HIGH,
 * runbook match, resolution-without-cause, status flapping, etc.). Pure deterministic analysis —
 * runs on CPU, no cost, no network. Safe to poll from the dashboard.
 */
export const GET = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const result = await getHints({ organizationId: organization.id, userId: user.id, incidentId: id });
  return ok(result);
});
