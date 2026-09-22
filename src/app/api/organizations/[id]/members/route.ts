import { handleRoute, ok } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { listMembers } from '@/server/services/organization.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  return ok(await listMembers({ organizationId: id, userId: user.id }));
});
