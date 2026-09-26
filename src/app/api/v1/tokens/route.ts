import { z } from 'zod';
import { created, handleRoute, ok, parseBody, readJson } from '@/lib/api';
import { publicContext } from '@/lib/public-auth';
import { newToken, tokenHash } from '@/lib/token-crypto';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

const schema = z.object({ name: z.string().trim().min(1).max(100), scopes: z.array(z.enum(['READ', 'READ_WRITE'])).min(1).max(1) });
export const POST = handleRoute(async (request) => {
  const { user, organization } = await publicContext(request, 'webhook.manage');
  const body = parseBody(schema, await readJson(request));
  const secret = newToken();
  const token = await db.$transaction(async (tx) => {
    const createdToken = await tx.apiToken.create({ data: { organizationId: organization.id, createdById: user.id, name: body.name, scopes: body.scopes, prefix: secret.slice(0, 13), hash: tokenHash(secret) } });
    await writeAudit({ organizationId: organization.id, actorId: user.id, action: 'token.create', entityType: 'ApiToken', entityId: createdToken.id }, tx);
    return createdToken;
  });
  return created({ id: token.id, name: token.name, prefix: token.prefix, scopes: body.scopes, token: secret, createdAt: token.createdAt });
});

export const GET = handleRoute(async (request) => {
  const { organization } = await publicContext(request, 'webhook.manage');
  const tokens = await db.apiToken.findMany({
    where: { organizationId: organization.id, revokedAt: null },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' }, take: 100,
  });
  return ok(tokens);
});
