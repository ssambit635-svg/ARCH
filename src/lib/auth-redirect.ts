/**
 * Authentication only returns to a same-site path. Backslashes and control characters are
 * rejected too: browsers can normalise `/\\host` or strip a newline into a protocol-relative URL.
 * Shared by the route pages and all three server actions so mode switches cannot weaken it.
 */
export function safeAuthCallback(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !/[\\\u0000-\u001f\u007f]/.test(value)
    ? value
    : '/dashboard';
}
