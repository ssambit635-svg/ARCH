import type { NextRequest } from 'next/server';
import { AppError } from './errors';
import { requirePermission, type PermissionAction } from './permissions';
import { enforceRateLimit } from './rate-limit';
import { clientIp } from './api';
import { requireApiContext } from './session';
import { authenticateToken } from '@/server/services/api-token.service';

/** Bearer credentials never fall back to cookies. A token stays bound to its creator's live membership. */
export async function publicContext(request: NextRequest, action: PermissionAction) {
  enforceRateLimit(`v1:ip:${clientIp(request)}`, { limit: 120, windowMs: 60_000 });
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    const context = await requireApiContext(request);
    await requirePermission(context.organization.id, context.user.id, action);
    return context;
  }
  const match = /^Bearer (arch_[A-Za-z0-9_-]{43})$/.exec(authorization);
  if (!match) throw AppError.unauthorized('Invalid bearer token.');
  return authenticateToken(match[1]!, request.nextUrl.searchParams.get('organizationId'), action);
}
