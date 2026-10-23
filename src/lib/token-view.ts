export type TokenView = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

/** Pick display metadata, never retain the one-time raw token in the list's long-lived state. */
export function tokenDisplayMetadata(value: unknown): TokenView | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.id !== 'string' ||
    typeof data.name !== 'string' ||
    typeof data.prefix !== 'string' ||
    !Array.isArray(data.scopes) ||
    !data.scopes.every((scope) => typeof scope === 'string') ||
    typeof data.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(data.createdAt)) ||
    (data.lastUsedAt !== undefined &&
      data.lastUsedAt !== null &&
      (typeof data.lastUsedAt !== 'string' || !Number.isFinite(Date.parse(data.lastUsedAt))))
  )
    return null;
  return {
    id: data.id,
    name: data.name,
    prefix: data.prefix,
    scopes: [...data.scopes],
    createdAt: data.createdAt,
    lastUsedAt: typeof data.lastUsedAt === 'string' ? data.lastUsedAt : null,
  };
}

export function tokenScopeLabel(scopes: readonly string[]): string {
  return scopes
    .map((scope) =>
      scope === 'READ' ? 'Read only' : scope === 'READ_WRITE' ? 'Read and write' : scope,
    )
    .join(', ');
}
