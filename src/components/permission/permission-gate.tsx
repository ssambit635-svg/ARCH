import type { ReactNode } from 'react';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission, type PermissionAction } from '@/lib/permissions';

/**
 * PERMISSION_CHECK wrapper (server component).
 *
 * Resolves the current user's role for the active organization and renders `children`
 * only when the role grants `permission`. Otherwise renders `fallback` (default: nothing).
 *
 * This only hides UI — every server action and API route re-checks the same matrix,
 * so a hidden button is never a bypass.
 */
export async function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { organization } = await requireDashboardContext();
  if (!roleHasPermission(organization.role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}
