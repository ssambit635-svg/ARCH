import { createHash, randomBytes } from 'node:crypto';
import type { PermissionAction } from './permissions';

export type TokenScope = 'READ' | 'READ_WRITE';
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const newToken = () => `arch_${randomBytes(32).toString('base64url')}`;
export function scopeAllows(scopes: TokenScope[], action: PermissionAction): boolean {
  return scopes.includes('READ_WRITE') || (scopes.includes('READ') && action.endsWith('.read'));
}
