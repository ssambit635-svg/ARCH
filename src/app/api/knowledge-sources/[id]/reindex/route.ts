import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';

type Context = { params: Promise<{ id: string }> };
import { knowledgeSourceReindexSchema } from '@/lib/validation';
import { reindexKnowledgeSource } from '@/server/services/knowledge.service';

/** POST — re-chunk and re-embed a source from new text (the runbook changed). */
export const POST = handleRoute(async (request, context: Context) => {
  const { user, organization } = await requireApiContext(request);
  const { id } = await context.params;
  const body = knowledgeSourceReindexSchema.parse(await request.json());
  return created(
    await reindexKnowledgeSource({ organizationId: organization.id, userId: user.id, sourceId: id, text: body.text }),
  );
});
