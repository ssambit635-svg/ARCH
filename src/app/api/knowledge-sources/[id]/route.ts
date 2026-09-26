import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';

type Context = { params: Promise<{ id: string }> };
import { deleteKnowledgeSource } from '@/server/services/knowledge.service';

/** DELETE — remove a source and its chunks (OWNER/ADMIN). Audited. */
export const DELETE = handleRoute(async (request, context: Context) => {
  const { user, organization } = await requireApiContext(request);
  const { id } = await context.params;
  return ok(await deleteKnowledgeSource({ organizationId: organization.id, userId: user.id, sourceId: id }));
});
