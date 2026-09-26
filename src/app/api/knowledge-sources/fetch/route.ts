import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { knowledgeSourceFetchSchema } from '@/lib/validation';
import { fetchKnowledgeUrl } from '@/server/services/knowledge.service';

/**
 * V6 — fetch a *public* document and index it.
 *
 * This is the only outbound request in the knowledge path, and it happens when a human asks for it,
 * never while answering a question. The URL is checked against a private-address blocklist first
 * (SSRF guard), the response is size- and time-capped, and only text is accepted.
 */
export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const body = knowledgeSourceFetchSchema.parse(await request.json());
  const result = await fetchKnowledgeUrl({ organizationId: organization.id, userId: user.id, url: body.url, name: body.name });
  return created(result);
});
