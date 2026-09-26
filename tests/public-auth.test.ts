import { describe, expect, it } from 'vitest';
import { newToken, scopeAllows, tokenHash } from '@/lib/token-crypto';

 describe('API token scope', () => {
  it('generates opaque unique tokens and hashes without persisting plaintext', () => {
    const a = newToken();
    const b = newToken();
    expect(a).toMatch(/^arch_[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(tokenHash(a)).not.toContain(a);
    expect(tokenHash(a)).not.toBe(tokenHash(b));
  });
  it('gates writes and preserves read permissions', () => {
    expect(scopeAllows(['READ'], 'incident.read')).toBe(true);
    expect(scopeAllows(['READ'], 'incident.write')).toBe(false);
    expect(scopeAllows(['READ'], 'copilot.generate')).toBe(false);
    expect(scopeAllows(['READ_WRITE'], 'incident.write')).toBe(true);
  });
});
