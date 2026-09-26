import Link from 'next/link';
import type { Metadata } from 'next';
import { z } from 'zod';
import { requireDashboardContext } from '@/lib/session';
import { auditActionSummary, listAuditLogs } from '@/server/services/audit.service';
import { roleHasPermission } from '@/lib/permissions';
import { isAppError } from '@/lib/errors';
import { formatDateTime, timeAgo } from '@/lib/format';
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Pagination, Table } from '@/components/ui';
import { paginationSchema } from '@/lib/validation';

export const metadata: Metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

const filtersSchema = paginationSchema.extend({
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(40).optional(),
});

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, organization } = await requireDashboardContext();
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  if (!roleHasPermission(organization.role, 'audit.read')) {
    return (
      <div>
        <PageHeader title="Audit log" />
        <Alert tone="error">Your role ({organization.role}) cannot read the audit log — ADMIN or OWNER is required.</Alert>
      </div>
    );
  }

  const query = filtersSchema.parse({
    page: first(params.page),
    pageSize: first(params.pageSize),
    action: first(params.action),
    entityType: first(params.entityType),
  });

  const [{ items, total, totalPages, page }, summary] = await Promise.all([
    listAuditLogs({
      organizationId: organization.id,
      userId: user.id,
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        ...(query.action ? { action: query.action } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
      },
    }),
    auditActionSummary({ organizationId: organization.id, userId: user.id }),
  ]);

  const buildHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query.action) next.set('action', query.action);
    if (query.entityType) next.set('entityType', query.entityType);
    next.set('page', String(nextPage));
    return `/dashboard/audit?${next.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Audit log"
        description={`${total} recorded change${total === 1 ? '' : 's'}. Written in the same transaction as the change, so it can never disagree with the data.`}
      />

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3 px-5 py-4" method="get">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Action prefix</span>
            <input
              name="action"
              defaultValue={query.action ?? ''}
              placeholder="incident."
              className="w-52 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Entity type</span>
            <select
              name="entityType"
              defaultValue={query.entityType ?? ''}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {['incident', 'service', 'project', 'membership', 'invitation', 'status_page', 'webhook_endpoint', 'organization'].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm text-slate-200 hover:bg-slate-800">
            Filter
          </button>
          <Link className="pb-2 text-sm text-slate-400 hover:text-slate-200" href="/dashboard/audit">
            Reset
          </Link>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            {items.length === 0 ? (
              <EmptyState title="No audit entries" description="Actions recorded by you or your teammates will show up here." />
            ) : (
              <>
                <Table head={['When', 'Actor', 'Action', 'Entity', 'Metadata']}>
                  {items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-slate-400" title={formatDateTime(entry.createdAt)}>
                        {timeAgo(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {entry.actor?.name ?? entry.actor?.email ?? entry.actorLabel ?? 'system'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="arch-mono text-xs text-indigo-300">{entry.action}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className="arch-mono text-xs">
                          {entry.entityType}:{entry.entityId.slice(0, 8)}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500" title={JSON.stringify(entry.metadata ?? {})}>
                        {entry.metadata ? JSON.stringify(entry.metadata) : '—'}
                      </td>
                    </tr>
                  ))}
                </Table>
                <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
              </>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Top actions" description="Across the whole history." />
          <CardBody className="space-y-2">
            {summary.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing recorded yet.</p>
            ) : (
              summary.slice(0, 10).map((row) => (
                <div key={row.action} className="flex items-center justify-between gap-2 text-sm">
                  <span className="arch-mono truncate text-xs text-slate-300">{row.action}</span>
                  <Badge tone="neutral">{row.count}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
