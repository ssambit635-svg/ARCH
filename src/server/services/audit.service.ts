import { requirePermission } from '@/lib/permissions';
import { auditRepository, type AuditFilters } from '../repositories/audit.repository';

/**
 * Audit log reads. Writes happen through `writeAudit` inside the same transaction as the change
 * that produced them (see the individual services).
 */
export async function listAuditLogs(params: {
  organizationId: string;
  userId: string;
  filters: AuditFilters;
  page: number;
  pageSize: number;
}) {
  await requirePermission(params.organizationId, params.userId, 'audit.read');

  const [items, total] = await Promise.all([
    auditRepository.list(params.organizationId, params.filters, {
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    auditRepository.count(params.organizationId, params.filters),
  ]);

  return { items, page: params.page, pageSize: params.pageSize, total, totalPages: Math.max(1, Math.ceil(total / params.pageSize)) };
}

export async function auditActionSummary(params: { organizationId: string; userId: string }) {
  await requirePermission(params.organizationId, params.userId, 'audit.read');
  const rows = await auditRepository.actions(params.organizationId);
  return rows
    .map((row) => ({ action: row.action, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
}
