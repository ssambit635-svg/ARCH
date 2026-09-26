import { created, handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { knowledgeSourceCreateSchema } from '@/lib/validation';
import { ingestKnowledgeSource, listKnowledgeSources } from '@/server/services/knowledge.service';

/**
 * V6 — the organization's knowledge base (RAG).
 *
 * GET  list the indexed sources with their chunk counts.
 * POST index a document: it is chunked and embedded on this server, then retrievable by Copilot.
 */
export const GET = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  return ok(await listKnowledgeSources({ organizationId: organization.id, userId: user.id }));
});

export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const body = knowledgeSourceCreateSchema.parse(await request.json());
  const result = await ingestKnowledgeSource({
    organizationId: organization.id,
    userId: user.id,
    name: body.name,
    kind: body.kind,
    text: body.text,
    sourceUrl: body.sourceUrl ?? null,
  });
  return created(result);
});
