import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleRoute, ok, parseQuery } from '@/lib/api';
import { requireApiContext } from '@/lib/session';
import { paginationSchema } from '@/lib/validation';
import { auditActionSummary, listAuditLogs } from '@/server/services/audit.service';

const auditQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(80).optional(),
  actorId: z.string().trim().max(64).optional(),
  entityType: z.string().trim().max(40).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  summary: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});

/** GET /api/audit — ADMIN+ only, paginated, org-scoped. */
export const GET = handleRoute(async (request: NextRequest) => {
  const { user, organization } = await requireApiContext(request);
  const query = parseQuery(auditQuerySchema, request.nextUrl.searchParams);

  if (query.summary) {
    return ok({ summary: await auditActionSummary({ organizationId: organization.id, userId: user.id }) });
  }

  return ok(
    await listAuditLogs({
      organizationId: organization.id,
      userId: user.id,
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        ...(query.action ? { action: query.action } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.from ? { from: new Date(query.from) } : {}),
        ...(query.to ? { to: new Date(query.to) } : {}),
      },
    }),
  );
});
