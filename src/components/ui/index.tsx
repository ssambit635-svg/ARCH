import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IncidentSeverity, IncidentStatus, ServiceStatus } from '@/generated/prisma/client';

/** Presentational primitives. Server-safe: no hooks, no 'use client'. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] bg-gradient-to-b from-abyss-800/90 to-abyss-850/90 shadow-[0_8px_32px_-16px_rgb(0_0_0/0.8)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-slate-400">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">{eyebrow}</p> : null}
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-[28px] sm:leading-tight">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div> : null}
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

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'warning' | 'ai';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-white/[0.06] text-slate-300 ring-white/10',
    accent: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
    danger: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    ai: 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-violet-200 ring-violet-500/40',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${severityStyles[severity]}`}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status, pulse = false }: { status: IncidentStatus; pulse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}>
      {pulse && status !== 'RESOLVED' ? <span className="size-1.5 animate-pulse-dot rounded-full bg-current" aria-hidden /> : null}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${serviceStyles[status]}`}>
      <span className={`size-1.5 rounded-full bg-current ${status === 'OPERATIONAL' ? '' : 'animate-pulse-dot'}`} aria-hidden />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-slate-600">{icon}</div> : null}
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description ? <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {head.map((cell, index) => (
              <th key={index} className="whitespace-nowrap px-4 py-2.5 font-medium first:pl-5 last:pr-5">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">{children}</tbody>
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
    <nav className="flex items-center justify-between gap-4 border-t border-white/[0.06] px-5 py-3 text-sm text-slate-400" aria-label="Pagination">
      <span className="text-xs tabular-nums">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="rounded-lg border border-white/10 px-3 py-1.5 text-[13px] transition hover:border-white/20 hover:bg-white/5" href={buildHref(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link className="rounded-lg border border-white/10 px-3 py-1.5 text-[13px] transition hover:border-white/20 hover:bg-white/5" href={buildHref(page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function Alert({ tone, children }: { tone: 'error' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  const tones = {
    error: 'border-rose-500/30 bg-rose-500/[0.08] text-rose-200',
    success: 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-200',
    warning: 'border-amber-500/30 bg-amber-500/[0.08] text-amber-200',
    info: 'border-white/10 bg-white/[0.03] text-slate-300',
  } as const;
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>{children}</div>;
}

export function DefinitionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 text-sm text-slate-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Muted divider with an optional centered label. */
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-white/[0.06]" />;
  return (
    <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500" aria-hidden="true">
      <span className="h-px flex-1 bg-white/[0.06]" />
      {label}
      <span className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}
