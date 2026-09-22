import { describe, expect, it } from 'vitest';
import { INCIDENT_TRANSITIONS, allowedTransitions, assertTransition, canTransition, isReopen, isTerminal } from '@/server/services/incident-state';
import { AppError } from '@/lib/errors';
import { incidentStatuses } from '@/lib/validation';

/**
 * The incident state machine: forward moves (possibly skipping ahead) plus an explicit reopen.
 * Everything else must be rejected — the timeline would otherwise stop matching reality.
 */
describe('incident state machine', () => {
  it('allows the documented happy path', () => {
    expect(canTransition('INVESTIGATING', 'IDENTIFIED')).toBe(true);
    expect(canTransition('IDENTIFIED', 'MONITORING')).toBe(true);
    expect(canTransition('MONITORING', 'RESOLVED')).toBe(true);
  });

  it('allows skipping ahead to a resolution', () => {
    expect(canTransition('INVESTIGATING', 'RESOLVED')).toBe(true);
    expect(canTransition('IDENTIFIED', 'RESOLVED')).toBe(true);
  });

  it('rejects moving backwards', () => {
    expect(canTransition('IDENTIFIED', 'INVESTIGATING')).toBe(false);
    expect(canTransition('MONITORING', 'IDENTIFIED')).toBe(false);
    expect(canTransition('MONITORING', 'INVESTIGATING')).toBe(false);
  });

  it('only allows reopening from RESOLVED', () => {
    expect(canTransition('RESOLVED', 'INVESTIGATING')).toBe(true);
    expect(isReopen('RESOLVED', 'INVESTIGATING')).toBe(true);
    expect(canTransition('RESOLVED', 'MONITORING')).toBe(false);
    expect(canTransition('RESOLVED', 'RESOLVED')).toBe(false);
  });

  it('rejects no-op transitions', () => {
    for (const status of incidentStatuses) {
      expect(() => assertTransition(status, status)).toThrowError(AppError);
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it('throws a conflict (409) with the allowed options for illegal transitions', () => {
    try {
      assertTransition('MONITORING', 'INVESTIGATING');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.status).toBe(409);
      expect(appError.details).toMatchObject({ from: 'MONITORING', to: 'INVESTIGATING', allowed: ['RESOLVED'] });
    }
  });

  it('declares every status and only valid targets', () => {
    expect(Object.keys(INCIDENT_TRANSITIONS).sort()).toEqual([...incidentStatuses].sort());
    for (const status of incidentStatuses) {
      for (const target of allowedTransitions(status)) {
        expect(incidentStatuses).toContain(target);
      }
    }
    expect(isTerminal('RESOLVED')).toBe(true);
    expect(isTerminal('INVESTIGATING')).toBe(false);
  });
});
