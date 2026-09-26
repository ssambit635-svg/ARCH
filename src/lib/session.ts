import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { auth } from './auth';
import { db } from './db';
import { AppError } from './errors';
import { organizationRepository } from '@/server/repositories/organization.repository';
import type { Role } from './permissions';

/**
 * Who is calling, and which organization they are working in.
 *
 * The dashboard keeps the "current organization" in a cookie so pages do not have to carry it in
 * every URL; API calls may pass `?organizationId=` explicitly. Either way the membership is
 * verified server-side on every request — the cookie is a convenience, never a grant.
 */

export const ORG_COOKIE = 'arch.organizationId';

export type SessionUser = { id: string; email: string; name: string | null };

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? '', name: session.user.name ?? null };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw AppError.unauthorized();
  return user;
}

export type ActiveOrganization = { id: string; name: string; slug: string; role: Role };

export async function resolveOrganization(userId: string, requestedId?: string | null): Promise<ActiveOrganization> {
  let organizationId = requestedId ?? null;

  if (!organizationId) {
    const store = await cookies();
    organizationId = store.get(ORG_COOKIE)?.value ?? null;
  }

  if (organizationId) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    const organization = membership ? await organizationRepository.findById(organizationId) : null;
    if (membership && organization) {
      return { id: organization.id, name: organization.name, slug: organization.slug, role: membership.role as Role };
    }
    // An explicitly requested organization that the caller does not belong to is a 404 — never a
    // silent fallback to one of their own organizations (that would answer "not yours" with data).
    if (requestedId) throw AppError.notFound('Organization not found.');
  }

  // A stale cookie falls back to the oldest organization the user belongs to.
  const memberships = await organizationRepository.listForUser(userId);
  const first = memberships[0];
  if (!first) throw AppError.badRequest('You are not a member of any organization yet.', { code: 'organization_required' });

  return { id: first.organization.id, name: first.organization.name, slug: first.organization.slug, role: first.role as Role };
}

/**
 * Pages can render concurrently with the dashboard layout. Redirect here as well so an OAuth
 * newcomer with no organization does not throw a logged error while the layout redirects.
 * API routes still use requireApiContext and receive the normal organization_required error.
 */
export async function requireDashboardContext() {
  const user = await requireUser();
  let organization: ActiveOrganization;
  try {
    organization = await resolveOrganization(user.id);
  } catch (error) {
    if (error instanceof AppError && error.details &&
        typeof error.details === 'object' && 'code' in error.details &&
        error.details.code === 'organization_required') {
      redirect('/onboarding');
    }
    throw error;
  }
  return { user, organization };
}

/** Convenience for route handlers: session + organization in one call. */
export async function requireApiContext(request: NextRequest) {
  const user = await requireUser();
  const requestedId = request.nextUrl.searchParams.get('organizationId');
  const organization = await resolveOrganization(user.id, requestedId);
  return { user, organization, db };
}
