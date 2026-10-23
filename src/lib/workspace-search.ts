export type PaletteEntry =
  | { kind: 'page'; label: string; hint: string; href: string }
  | {
      kind: 'incident';
      label: string;
      hint: string;
      href: string;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      status: string;
    }
  | { kind: 'service'; label: string; hint: string; href: string; status: string }
  | { kind: 'action'; label: string; hint: string; href: string };

export const PALETTE_GROUPS = [
  { kind: 'action', title: 'Actions', quota: 1 },
  { kind: 'incident', title: 'Recent incidents', quota: 3 },
  { kind: 'service', title: 'Services', quota: 3 },
  { kind: 'page', title: 'Pages', quota: 5 },
] as const;

/** The flattened order is also the visual order, so arrow keys never jump between groups. */
export function workspaceSearchResults(
  entries: readonly PaletteEntry[],
  query: string,
  limit = 12,
): PaletteEntry[] {
  if (!Number.isFinite(limit) || limit < 1) return [];
  const maximum = Math.min(100, Math.floor(limit));
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const matches = entries.filter((entry) => {
    if (seen.has(entry.href)) return false;
    const text =
      `${entry.label} ${entry.hint} ${'severity' in entry ? entry.severity : ''} ${'status' in entry ? entry.status : ''}`.toLocaleLowerCase();
    if (!terms.every((term) => text.includes(term))) return false;
    seen.add(entry.href);
    return true;
  });
  const ordered = PALETTE_GROUPS.flatMap((group) =>
    matches.filter((entry) => entry.kind === group.kind),
  );
  if (terms.length) return ordered.slice(0, maximum);
  // A busy organization must not push every page out of the empty-query quick switcher.
  const selected = new Set(
    PALETTE_GROUPS.flatMap((group) =>
      matches.filter((entry) => entry.kind === group.kind).slice(0, group.quota),
    ).slice(0, maximum),
  );
  for (const entry of ordered) {
    if (selected.size >= maximum) break;
    selected.add(entry);
  }
  return ordered.filter((entry) => selected.has(entry));
}

/** Full history is a separate, tenant-scoped incident-list search, not an implied global index. */
export function fullIncidentSearchHref(query: string): string {
  const value = query.trim().slice(0, 200);
  return value
    ? `/dashboard/incidents?${new URLSearchParams({ q: value })}`
    : '/dashboard/incidents';
}
