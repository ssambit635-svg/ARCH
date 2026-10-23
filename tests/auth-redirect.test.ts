import { describe, expect, it } from 'vitest';
import { safeAuthCallback } from '@/lib/auth-redirect';

describe('same-site authentication callbacks', () => {
  it.each([
    '/',
    '/dashboard',
    '/onboarding',
    '/invite/opaque-token',
    '/dashboard/incidents/123?tab=notes#timeline',
  ])('preserves the same-site destination %s', (path) => {
    expect(safeAuthCallback(path)).toBe(path);
  });

  it.each([
    undefined,
    null,
    '',
    42,
    {},
    ['/dashboard', '//other.example'],
    'https://other.example',
    '//other.example',
    '///other.example',
    'javascript:alert(1)',
    'dashboard',
    ' /dashboard',
    '/\\other.example',
    '/\n/other.example',
    '/\t/other.example',
    '/dashboard\u0000',
    '/dashboard\u007f',
  ])('rejects invalid or browser-normalised cross-site input %j', (value) => {
    expect(safeAuthCallback(value)).toBe('/dashboard');
  });
});
