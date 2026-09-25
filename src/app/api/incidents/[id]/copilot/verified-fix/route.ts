import { created, handleRoute } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { verifiedFixGenerateSchema } from '@/lib/validation';
import { generateVerifiedFix } from '@/server/services/verifiedFix.service';

type Context = { params: Promise<{ id: string }> };

/**
 * POST — Generate verified fix draft + auto-verify in sandbox.
 * M2: Incident + stack trace + code context → proposed patch (kabhi auto-apply nahi)
 * M3: Isolated sandbox me patch + tests chalao (no prod credentials, temporary container)
 *
 * Body: { attachment?, repoConnectionId?, commitSha?, testCommand? }
 * Returns: { suggestion, verification, repoConnection, commitSha }
 */
export const POST = handleRoute<Context>(async (request, context) => {
  const { id } = await context.params;
  const { user, organization } = await requireApiContext(request);
  const body = verifiedFixGenerateSchema.parse(await request.json().catch(() => ({})));
  const result = await generateVerifiedFix({
    organizationId: organization.id,
    userId: user.id,
    incidentId: id,
    attachment: body.attachment ?? null,
    repoConnectionId: body.repoConnectionId ?? null,
    commitSha: body.commitSha ?? null,
    testCommand: body.testCommand ?? null,
  });
  return created(result);
});
