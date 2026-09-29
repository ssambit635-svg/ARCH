/** Small display helpers shared by server and client components. */

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export function timeAgo(value: Date | string | null | undefined, now: Date = new Date()): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '—';
  if (seconds < 45) return 'just now';
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
    ['year', Number.POSITIVE_INFINITY],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let value_ = Math.abs(seconds);
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  for (const [candidate, size] of units) {
    if (value_ < size) {
      unit = candidate;
      break;
    }
    value_ = value_ / size;
  }
  return formatter.format(-Math.round(value_), unit);
}

export function formatDuration(from: Date | string, to?: Date | string | null): string {
  const start = typeof from === 'string' ? new Date(from) : from;
  const end = to ? (typeof to === 'string' ? new Date(to) : to) : new Date();
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Compact count for badges: 999 → "999", 1_234 → "1.2k", 12_000 → "12k", 3_400_000 → "3.4m".
 * Truncates instead of rounding, so a badge can never claim more than the real number
 * (1_999 is "1.9k", not "2k"). Integer arithmetic only, so 4_100 is never "4k" because of a float.
 */
export function formatCompactCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const count = Math.max(0, Math.floor(value));
  if (count < 1_000) return String(count);
  const units: ReadonlyArray<readonly [number, string]> = [
    [1_000_000_000, 'b'],
    [1_000_000, 'm'],
    [1_000, 'k'],
  ];
  for (const [size, suffix] of units) {
    if (count >= size) {
      const tenths = Math.floor((count * 10) / size);
      const whole = Math.floor(tenths / 10);
      const fraction = tenths % 10;
      return fraction === 0 ? `${whole}${suffix}` : `${whole}.${fraction}${suffix}`;
    }
  }
  return String(count);
}
