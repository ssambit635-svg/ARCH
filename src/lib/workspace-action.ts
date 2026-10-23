import type { ActionResult } from '@/app/dashboard/actions';

/**
 * Transport failures must not throw away a responder's draft by mounting a route error boundary.
 * A failed response does not prove that a write failed: never automatically retry a mutation.
 * Preserve Next's navigation control flow (for example, successful onboarding redirects).
 */
export async function runWorkspaceAction(
  action: () => Promise<ActionResult>,
  unconfirmedMessage: string,
): Promise<ActionResult> {
  try {
    return await action();
  } catch (error) {
    const digest = error && typeof error === 'object' && 'digest' in error ? error.digest : null;
    if (
      typeof digest === 'string' &&
      (digest.startsWith('NEXT_REDIRECT;') || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;'))
    )
      throw error;
    return { ok: false, error: unconfirmedMessage };
  }
}
