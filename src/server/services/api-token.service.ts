import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission, type PermissionAction } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { tokenHash, scopeAllows, type TokenScope } from '@/lib/token-crypto';

/** Every bearer request rechecks revocation, tenant, scope and the creator's live membership. */
export async function authenticateToken(raw: string, requestedOrganizationId: string | null, action: PermissionAction) {
  const token = await db.apiToken.findUnique({
    where: { hash: tokenHash(raw) },
    select: { id: true, organizationId: true, createdById: true, revokedAt: true, scopes: true },
  });
  if (!token || token.revokedAt) throw AppError.unauthorized('Invalid bearer token.');
  enforceRateLimit(`v1:token:${token.id}`, { limit: 60, windowMs: 60_000 });
  if (requestedOrganizationId && requestedOrganizationId !== token.organizationId) throw AppError.notFound('Organization not found.');
  const scopes = token.scopes;
  if (!Array.isArray(scopes) || !scopes.every((s) => s === 'READ' || s === 'READ_WRITE') || !scopeAllows(scopes as TokenScope[], action)) {
    throw AppError.forbidden('Token scope does not permit this action.');
  }
  await requirePermission(token.organizationId, token.createdById, action);
  const organization = await db.organization.findUnique({ where: { id: token.organizationId }, select: { id: true, name: true, slug: true } });
  if (!organization) throw AppError.notFound('Organization not found.');
  await db.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  return { user: { id: token.createdById }, organization };
}
