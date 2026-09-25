import { accepted, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { trainModel } from '@/server/services/archModel.service';

/**
 * POST — retrain this organization's ARCH model. OWNER/ADMIN.
 *
 * V3: this enqueues a background training job and returns 202 immediately — training never runs
 * inside the web request. The worker trains a candidate, evaluates it against the active model
 * and promotes it only if it beats it; the result appears on GET /api/copilot/model.
 */
export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const job = await trainModel({ organizationId: organization.id, userId: user.id });
  return accepted({ job, message: 'Training queued — the worker will train, evaluate and promote the new model only if it beats the current one.' });
});
