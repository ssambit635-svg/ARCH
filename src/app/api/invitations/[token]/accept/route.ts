import { handleRoute, ok } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { acceptInvitation } from '@/server/services/organization.service';

type Context = { params: Promise<{ token: string }> };

/** POST /api/invitations/:token/accept — the signed-in email must match the invited email. */
export const POST = handleRoute<Context>(async (_request, context) => {
  const { token } = await context.params;
  const user = await requireUser();
  return ok(await acceptInvitation({ token, userId: user.id, userEmail: user.email }));
});
