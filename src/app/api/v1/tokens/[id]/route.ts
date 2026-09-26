import { handleRoute, ok } from '@/lib/api';
import { publicContext } from '@/lib/public-auth';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { writeAudit } from '@/lib/audit';

type Context = { params: Promise<{ id: string }> };
export const DELETE = handleRoute<Context>(async (request, context) => {
  const { user, organization } = await publicContext(request, 'webhook.manage');
  const { id } = await context.params;
  await db.$transaction(async (tx) => {
    const result = await tx.apiToken.updateMany({ where: { id, organizationId: organization.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) throw AppError.notFound('Token not found.');
    await writeAudit({ organizationId: organization.id, actorId: user.id, action: 'token.revoke', entityType: 'ApiToken', entityId: id }, tx);
  });
  return ok({ revoked: true });
});
