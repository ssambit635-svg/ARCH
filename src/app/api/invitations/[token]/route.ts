import { handleRoute, ok } from '@/lib/api';
import { getInvitationPreview } from '@/server/services/organization.service';

type Context = { params: Promise<{ token: string }> };

/** GET /api/invitations/:token — public preview shown before signing in. */
export const GET = handleRoute<Context>(async (_request, context) => {
  const { token } = await context.params;
  return ok(await getInvitationPreview(token));
});
