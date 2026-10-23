import { incidentListQuerySchema } from './validation';

export type IncidentSearchParams = Record<string, string | string[] | undefined>;
const keys = ['page', 'pageSize', 'status', 'severity', 'projectId', 'q', 'open'] as const;

/** Recover one malformed filter at a time without discarding the user's other valid filters. API validation remains strict. */
export function readIncidentFilters(params: IncidentSearchParams) {
  const clean: Record<string, unknown> = {};
  const invalidFields: string[] = [];
  for (const key of keys) {
    const value = params[key];
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      invalidFields.push(key);
      continue;
    }
    const parsed = incidentListQuerySchema.shape[key].safeParse(value);
    if (parsed.success) clean[key] = parsed.data;
    else invalidFields.push(key);
  }
  // A specific lifecycle filter takes precedence over a stale "open" filter in a saved URL.
  if (clean.status) delete clean.open;
  return { query: incidentListQuerySchema.parse(clean), invalidFields };
}

export function incidentFilterHref(
  query: ReturnType<typeof readIncidentFilters>['query'],
  overrides: Record<string, string | number | boolean | undefined>,
) {
  const params = new URLSearchParams();
  for (const key of keys) {
    if (key === 'page') continue;
    const value = query[key];
    if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (!keys.includes(key as (typeof keys)[number])) continue;
    if (value === undefined || value === '' || value === false) params.delete(key);
    else params.set(key, String(value));
  }
  const search = params.toString();
  return `/dashboard/incidents${search ? `?${search}` : ''}`;
}
