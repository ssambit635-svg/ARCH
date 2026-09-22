import type { DbClient } from './db';
import { db } from './db';
import { AppError } from './errors';

/**
 * RBAC — single source of truth.
 *
 * The matrix below is the contract from AGENTS.md §6. Route handlers, server actions and the
 * webhook ingestion path all call `requirePermission`; nothing trusts a role sent by a client.
 * `roleHasPermission` is pure so the matrix can be unit-tested without a database.
 */

export const ROLES = ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  'org.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'org.settings': ['OWNER'],
  'member.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'member.manage': ['OWNER', 'ADMIN'],
  'project.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'project.manage': ['OWNER', 'ADMIN'],
  'incident.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'incident.write': ['OWNER', 'ADMIN', 'RESPONDER'],
  'incident.assign': ['OWNER', 'ADMIN', 'RESPONDER'],
  'statuspage.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'statuspage.manage': ['OWNER', 'ADMIN'],
  'statuspage.publish': ['OWNER', 'ADMIN'],
  'webhook.read': ['OWNER', 'ADMIN'],
  'webhook.manage': ['OWNER', 'ADMIN'],
  'audit.read': ['OWNER', 'ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export type PermissionAction = keyof typeof PERMISSIONS;

export const ROLE_RANK: Record<Role, number> = { OWNER: 40, ADMIN: 30, RESPONDER: 20, VIEWER: 10 };

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Pure permission check — used by the API layer and by unit tests. */
export function roleHasPermission(role: Role, action: PermissionAction): boolean {
  return (PERMISSIONS[action] as readonly Role[]).includes(role);
}

export function highestRole(roles: Role[]): Role | null {
  return roles.reduce<Role | null>((best, role) => (!best || ROLE_RANK[role] > ROLE_RANK[best] ? role : best), null);
}

/** Throws a 403 when the supplied role may not perform `action`. */
export function assertCan(role: Role, action: PermissionAction): void {
  if (!roleHasPermission(role, action)) {
    throw AppError.forbidden(`Your role (${role}) cannot perform "${action}".`);
  }
}

export type Membership = { id: string; organizationId: string; userId: string; role: Role };

/**
 * Look up the caller's membership in an organization. Always scoped by both ids: a user who is
 * not a member of the org sees the same thing as a user with no account at all.
 */
export async function getMembership(
  organizationId: string,
  userId: string,
  client: DbClient = db,
): Promise<Membership | null> {
  const membership = await client.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true, organizationId: true, userId: true, role: true },
  });
  return membership ?? null;
}

/**
 * Authorize a user for an action inside an organization.
 *
 * Two different failures, two different answers (AGENTS.md §6):
 *  - the caller is not a member at all -> 404, so an id from another tenant is indistinguishable
 *    from an id that does not exist and cannot be probed;
 *  - the caller is a member but their role is too low -> 403.
 */
export async function requirePermission(
  organizationId: string,
  userId: string,
  action: PermissionAction,
  client: DbClient = db,
): Promise<Membership> {
  const membership = await getMembership(organizationId, userId, client);
  if (!membership) {
    throw AppError.notFound('Organization not found.');
  }
  assertCan(membership.role, action);
  return membership;
}
