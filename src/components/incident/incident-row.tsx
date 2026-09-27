import Link from 'next/link';
import type { IncidentSeverity, IncidentStatus } from '@/generated/prisma/client';
import { timeAgo } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import { SeverityBadge, StatusBadge } from '@/components/ui';

export type IncidentRowData = {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: Date;
  updatedAt: Date;
  project: { name: string };
  service: { name: string } | null;
  assignedTo: { name: string | null; email: string } | null;
};

/** Rich incident table row — shared by the dashboard overview and the incident list. */
export function IncidentRow({ incident, showProject = true }: { incident: IncidentRowData; showProject?: boolean }) {
  return (
    <tr className="link-row group hover:bg-white/[0.025]">
      <td className="max-w-0 px-4 py-3 first:pl-5">
        <Link href={`/dashboard/incidents/${incident.id}`} className="block min-w-0">
          <span className="block truncate font-medium text-slate-100 group-hover:text-white group-hover:underline group-hover:decoration-indigo-400/60 group-hover:underline-offset-4">
            {incident.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {showProject ? `${incident.project.name} · ` : ''}started {timeAgo(incident.startedAt)}
          </span>
        </Link>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <SeverityBadge severity={incident.severity} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StatusBadge status={incident.status} pulse />
      </td>
      <td className="max-w-44 truncate px-4 py-3 text-[13px] text-slate-300">
        {incident.service ? incident.service.name : <span className="text-slate-600">—</span>}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {incident.assignedTo ? (
          <span className="flex items-center gap-2">
            <Avatar name={incident.assignedTo.name} email={incident.assignedTo.email} size="xs" />
            <span className="max-w-28 truncate text-[13px] text-slate-300">{incident.assignedTo.name ?? incident.assignedTo.email}</span>
          </span>
        ) : (
          <span className="text-[13px] text-slate-600">Unassigned</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[13px] tabular-nums text-slate-500 last:pr-5">{timeAgo(incident.updatedAt)}</td>
    </tr>
  );
}
