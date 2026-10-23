import type { IncidentEventType } from '@/generated/prisma/client';

function humanLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replaceAll('_', ' ');
}

/** Human-readable event context; an assignment's opaque database IDs are not useful response information. */
export function timelineMetadataSummary(
  metadata: unknown,
  type: IncidentEventType,
  memberNames: Record<string, string> = {},
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  if (type === 'ASSIGNED') {
    const member = (value: unknown) =>
      typeof value === 'string' && value
        ? Object.hasOwn(memberNames, value)
          ? memberNames[value]!
          : 'Former member'
        : 'Unassigned';
    return `${member(record.from)} → ${member(record.to)}`;
  }
  if (type === 'LINKED') return 'Service link updated';
  if (type !== 'STATUS_CHANGED' && type !== 'SEVERITY_CHANGED') return null;
  return typeof record.from === 'string' && typeof record.to === 'string'
    ? `${humanLabel(record.from)} → ${humanLabel(record.to)}`
    : null;
}
