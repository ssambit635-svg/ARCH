import type { DbClient } from './db';
import { db } from './db';
import { AppError } from './errors';
import { ROLES } from './roles';
import type { Role } from './roles';
export { ROLES } from './roles';
export type { Role } from './roles';

/**
 * RBAC — single source of truth.
 *
 * The matrix below is the contract from AGENTS.md §6. Route handlers, server actions and the
 * webhook ingestion path all call `requirePermission`; nothing trusts a role sent by a client.
 * `roleHasPermission` is pure so the matrix can be unit-tested without a database.
 */

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
  // V2 — ARCH Copilot. Generating and reviewing drafts is a responder job; anyone who can read
  // the incident can read its drafts.
  'copilot.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'copilot.generate': ['OWNER', 'ADMIN', 'RESPONDER'],
  'copilot.review': ['OWNER', 'ADMIN', 'RESPONDER'],
  // V3 — retraining the organization's ARCH model changes what every responder sees, so it is an
  // admin decision. (The worker also retrains automatically when incidents are resolved.)
  'copilot.train': ['OWNER', 'ADMIN'],
  // V4 — Verified Fix Loop: GitHub repo connect + commit pinning + sandbox verification + PR.
  // Repo linking is an admin decision (secrets, org permission). Verification reuses copilot
  // permissions but gets its own gate so it can be audited separately.
  'repo.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'repo.manage': ['OWNER', 'ADMIN'],
  'fix.verify': ['OWNER', 'ADMIN', 'RESPONDER'],
  'fix.approve': ['OWNER', 'ADMIN', 'RESPONDER'],
  'pr.create': ['OWNER', 'ADMIN', 'RESPONDER'],
  'pr.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  // V6 - change events and the risk they carry. Reading change history (and its risk scores) is
  // open to everyone who can read incidents; recording a change is a responder-or-above action.
  'change.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'change.write': ['OWNER', 'ADMIN', 'RESPONDER'],
  // V6 - the knowledge base feeding RAG. Reading and ingesting are open to responders (a runbook
  // is only useful if the on-call engineer can add it at 3am); deletion is an admin decision.
  'knowledge.read': ['OWNER', 'ADMIN', 'RESPONDER', 'VIEWER'],
  'knowledge.manage': ['OWNER', 'ADMIN', 'RESPONDER'],
  'knowledge.delete': ['OWNER', 'ADMIN'],
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
