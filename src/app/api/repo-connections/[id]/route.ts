import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { repoConnectionUpdateSchema } from '@/lib/validation';
import { getRepoConnection, updateRepoConnection, deactivateRepoConnection } from '@/server/services/repo.service';

type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute<Context>(async (_request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(_request);
  const connection = await getRepoConnection({ organizationId: organization.id, userId: user.id, repoConnectionId: id });
  return ok(connection);
});

export const PATCH = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = repoConnectionUpdateSchema.parse(await request.json());
  const updated = await updateRepoConnection({
    organizationId: organization.id,
    userId: user.id,
    repoConnectionId: id,
    defaultBranch: body.defaultBranch,
    isActive: body.isActive,
  });
  return ok(updated);
});

export const DELETE = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const deactivated = await deactivateRepoConnection({ organizationId: organization.id, userId: user.id, repoConnectionId: id });
  return ok(deactivated);
});
