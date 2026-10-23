import { describe, expect, it } from 'vitest';
import { incidentFilterHref, readIncidentFilters } from '@/lib/incident-filters';
import { incidentListQuerySchema } from '@/lib/validation';

describe('recoverable incident page filters', () => {
  it('uses the normal schema defaults when there are no filters', () => {
    expect(readIncidentFilters({})).toEqual({
      query: { page: 1, pageSize: 25 },
      invalidFields: [],
    });
  });
  it('preserves valid filters when another URL parameter is malformed', () => {
    const result = readIncidentFilters({
      status: 'NOT_A_STATUS',
      severity: 'HIGH',
      q: '  checkout  ',
      page: '-1',
      pageSize: '10',
    });
    expect(result.query).toEqual({ page: 1, pageSize: 10, severity: 'HIGH', q: 'checkout' });
    expect(result.invalidFields).toEqual(['page', 'status']);
  });
  it('rejects ambiguous duplicate values rather than guessing', () => {
    expect(readIncidentFilters({ status: ['RESOLVED', 'INVESTIGATING'], q: 'gateway' })).toEqual({
      query: { page: 1, pageSize: 25, q: 'gateway' },
      invalidFields: ['status'],
    });
  });
  it.each([
    { page: 'NaN' },
    { pageSize: '10001' },
    { q: 'a'.repeat(201) },
    { open: 'yes' },
    { projectId: 'a'.repeat(65) },
  ])('recovers from malformed input %j', (params) => {
    expect(readIncidentFilters(params).invalidFields).toHaveLength(1);
    expect(() => readIncidentFilters(params)).not.toThrow();
  });
  it('ignores unknown parameters and harmless empty inputs', () => {
    expect(
      readIncidentFilters({ q: '', open: '', page: '', organizationId: 'someone-else' }),
    ).toEqual({ query: { page: 1, pageSize: 25 }, invalidFields: [] });
  });
  it('does not combine an incompatible open filter with a specific status', () => {
    expect(readIncidentFilters({ open: 'true', status: 'RESOLVED' }).query).toEqual({
      page: 1,
      pageSize: 25,
      status: 'RESOLVED',
    });
  });
  it('keeps API validation strict instead of applying UI recovery to external requests', () => {
    expect(incidentListQuerySchema.safeParse({ status: 'NOT_A_STATUS' }).success).toBe(false);
  });
  it('retains search, project, severity, and page size while moving between views', () => {
    const { query } = readIncidentFilters({
      q: 'checkout & billing',
      projectId: 'p-1',
      severity: 'CRITICAL',
      pageSize: '10',
      page: '8',
      open: 'true',
    });
    const href = incidentFilterHref(query, { status: 'MONITORING', open: undefined });
    const params = new URL(href, 'https://arch.test').searchParams;
    expect(params.get('q')).toBe('checkout & billing');
    expect(params.get('projectId')).toBe('p-1');
    expect(params.get('severity')).toBe('CRITICAL');
    expect(params.get('pageSize')).toBe('10');
    expect(params.get('status')).toBe('MONITORING');
    expect(params.has('open')).toBe(false);
    expect(params.has('page')).toBe(false);
  });
  it('changes only the page when paginating and never carries unknown parameters', () => {
    const { query } = readIncidentFilters({
      pageSize: '50',
      severity: 'HIGH',
      organizationId: 'other-org',
    });
    const params = new URL(
      incidentFilterHref(query, { page: 2, organizationId: 'other-org' }),
      'https://arch.test',
    ).searchParams;
    expect(Object.fromEntries(params)).toEqual({ pageSize: '50', severity: 'HIGH', page: '2' });
  });
});
