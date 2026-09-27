import { handleRoute, ok } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { repoInsightAskSchema } from '@/lib/validation';
import { askRepoInsight } from '@/server/services/repoInsight.service';

/** POST — read-only GitHub insight. Never writes to the repository. */
export const POST = handleRoute(async (request) => {
  const { user, organization } = await requireApiContext(request);
  const input = repoInsightAskSchema.parse(await request.json());
  const result = await askRepoInsight({
    organizationId: organization.id,
    userId: user.id,
    repoConnectionId: input.repoConnectionId,
    question: input.question,
  });
  return ok(result);
});
