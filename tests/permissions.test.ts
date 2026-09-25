import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLES, roleHasPermission, highestRole, assertCan } from '@/lib/permissions';
import { AppError } from '@/lib/errors';
import type { PermissionAction } from '@/lib/permissions';
import type { Role } from '@/lib/permissions';

/**
 * The RBAC matrix from AGENTS.md §6, asserted cell by cell: every role × every action.
 * If someone widens a permission, this test fails and the change has to be deliberate.
 */
const EXPECTED: Record<PermissionAction, Record<Role, boolean>> = {
  'org.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
  'org.settings': { OWNER: true, ADMIN: false, RESPONDER: false, VIEWER: false },
  'member.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
  'member.manage': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'project.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
  'project.manage': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'incident.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
  'incident.write': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: false },
  'incident.assign': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: false },
  'statuspage.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
  'statuspage.manage': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'statuspage.publish': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'webhook.read': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'webhook.manage': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'audit.read': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'copilot.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
  'copilot.generate': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: false },
  'copilot.review': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: false },
  'copilot.train': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'repo.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
  'repo.manage': { OWNER: true, ADMIN: true, RESPONDER: false, VIEWER: false },
  'fix.verify': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: false },
  'fix.approve': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: false },
  'pr.create': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: false },
  'pr.read': { OWNER: true, ADMIN: true, RESPONDER: true, VIEWER: true },
};

describe('permission matrix', () => {
  it('covers every declared action', () => {
    expect(Object.keys(PERMISSIONS).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const action of Object.keys(EXPECTED) as PermissionAction[]) {
    for (const role of ROLES) {
      const allowed = EXPECTED[action][role];
      it(`${role} ${allowed ? 'may' : 'may not'} ${action}`, () => {
        expect(roleHasPermission(role, action)).toBe(allowed);
        if (allowed) {
          expect(() => assertCan(role, action)).not.toThrow();
        } else {
          expect(() => assertCan(role, action)).toThrowError(AppError);
        }
      });
    }
  }

  it('never lists a role twice and never invents one', () => {
    for (const action of Object.keys(PERMISSIONS) as PermissionAction[]) {
      const roles = PERMISSIONS[action];
      expect(new Set(roles).size).toBe(roles.length);
      expect([...roles].every((role) => ROLES.includes(role))).toBe(true);
    }
  });

  it('ranks roles so a higher role can do everything a lower one can except ownership-only actions', () => {
    expect(highestRole(['VIEWER', 'RESPONDER'])).toBe('RESPONDER');
    expect(highestRole(['ADMIN', 'OWNER'])).toBe('OWNER');
    expect(highestRole([])).toBeNull();
  });
});
