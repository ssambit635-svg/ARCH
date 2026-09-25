import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { pullRequestCreateSchema } from '@/lib/validation';
import { approveAndCreatePr } from '@/server/services/verifiedFix.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — Approve verified fix and create PR (human approve → PR create → audit log)
 * M4: Approve pe PR banta hai, sab logged
 * Body: { title?, body? }
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = pullRequestCreateSchema.parse(await request.json().catch(() => ({})));
  // The verificationId is from URL, but schema expects it — we inject
  const pr = await approveAndCreatePr({
    organizationId: organization.id,
    userId: user.id,
    verificationId: id,
    title: body.title ?? null,
    body: body.body ?? null,
  });
  return created(pr);
});
