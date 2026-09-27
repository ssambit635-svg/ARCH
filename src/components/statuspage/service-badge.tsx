import type { ServiceStatus } from '@/generated/prisma/client';

const config: Record<ServiceStatus, { dot: string; text: string; label: string }> = {
  OPERATIONAL: { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'Operational' },
  DEGRADED: { dot: 'bg-amber-400', text: 'text-amber-200', label: 'Degraded' },
  OUTAGE: { dot: 'bg-rose-400', text: 'text-rose-300', label: 'Outage' },
  MAINTENANCE: { dot: 'bg-sky-400', text: 'text-sky-300', label: 'Maintenance' },
};

/** Public-facing service status badge — calm wording, no internal jargon. */
export function PublicServiceBadge({ status, size = 'md' }: { status: ServiceStatus; size?: 'sm' | 'md' }) {
  const { dot, text, label } = config[status];
  return (
    <span className={`inline-flex items-center gap-2 font-medium ${text} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <span className={`rounded-full ${dot} ${size === 'sm' ? 'size-2' : 'size-2.5'} ${status === 'OPERATIONAL' ? '' : 'animate-pulse-dot'}`} aria-hidden />
      {label}
    </span>
  );
}
