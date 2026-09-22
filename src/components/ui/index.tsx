import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IncidentSeverity, IncidentStatus, ServiceStatus } from '@/generated/prisma/client';

/** Presentational primitives. Server-safe: no hooks, no 'use client'. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-800 bg-slate-900/60 ${className}`}>{children}</div>;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const severityStyles: Record<IncidentSeverity, string> = {
  CRITICAL: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  HIGH: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  LOW: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
};

const statusStyles: Record<IncidentStatus, string> = {
  INVESTIGATING: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  IDENTIFIED: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  MONITORING: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
};

const serviceStyles: Record<ServiceStatus, string> = {
  OPERATIONAL: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  DEGRADED: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  OUTAGE: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  MAINTENANCE: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'success' }) {
  const tones = {
    neutral: 'bg-slate-800 text-slate-300 ring-slate-700',
    accent: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
    danger: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${severityStyles[severity]}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${serviceStyles[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            {head.map((cell) => (
              <th key={cell} className="px-4 py-2.5 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-400" aria-label="Pagination">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="rounded-md border border-slate-700 px-3 py-1 hover:bg-slate-800" href={buildHref(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link className="rounded-md border border-slate-700 px-3 py-1 hover:bg-slate-800" href={buildHref(page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function Alert({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const tones = {
    error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    info: 'border-slate-700 bg-slate-800/60 text-slate-300',
  } as const;
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function DefinitionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 text-sm text-slate-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
