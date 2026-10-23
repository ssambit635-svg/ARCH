export const WORKSPACE_THEME_COOKIE = 'arch-theme';
export const WORKSPACE_THEMES = ['system', 'light', 'dark'] as const;
export type WorkspaceThemePreference = (typeof WORKSPACE_THEMES)[number];

/** A display preference, never an authorization or organization identifier. */
export function readWorkspaceTheme(value: unknown): WorkspaceThemePreference {
  return typeof value === 'string' && WORKSPACE_THEMES.includes(value as WorkspaceThemePreference)
    ? (value as WorkspaceThemePreference)
    : 'system';
}

export function serializeWorkspaceTheme(
  preference: WorkspaceThemePreference,
  secure = false,
): string {
  return `${WORKSPACE_THEME_COOKIE}=${readWorkspaceTheme(preference)}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`;
}
