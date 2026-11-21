export const WORKSPACE_DENSITY_COOKIE = 'arch-density';
export type WorkspaceDensity = 'comfortable' | 'compact';
/** Appearance only, never an authorization or tenant identifier. */
export function readWorkspaceDensity(value: unknown): WorkspaceDensity {
  return value === 'compact' ? 'compact' : 'comfortable';
}
export function serializeWorkspaceDensity(value: WorkspaceDensity, secure = false): string {
  return `${WORKSPACE_DENSITY_COOKIE}=${readWorkspaceDensity(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`;
}
