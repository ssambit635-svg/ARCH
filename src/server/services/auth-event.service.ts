import { db } from '@/lib/db';
import { safeErrorLog } from '@/lib/db-errors';
import { authEventRepository } from '../repositories/auth-event.repository';

/**
 * The authentication security trail.
 *
 * Every OAuth sign-in, provider link and refused sign-in is recorded here so an administrator
 * can answer "who signed in, from where, with which provider?" The table is deliberately not
 * tenant-scoped: an identity event happens before a person necessarily belongs to an
 * organization.
 *
 * No token, secret, password or provider payload is ever written here — only the provider name,
 * the event, the IP address and the user agent.
 */

export type AuthEventKind = 'oauth_sign_in' | 'oauth_link' | 'oauth_denied';

export type AuthEventInput = {
  userId?: string | null;
  provider: string;
  event: AuthEventKind;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Record one authentication event.
 *
 * A failure to write the trail must never break a sign-in: the person is already authenticated
 * at this point, and refusing them because the audit table is unavailable would be a worse
 * outcome than a missing row. The failure is logged on the server instead.
 */
export async function recordAuthEvent(input: AuthEventInput): Promise<void> {
  try {
    await authEventRepository.create(input);
  } catch (error) {
    console.error('[auth] could not record auth event', JSON.stringify(safeErrorLog(error)));
  }
}

/** The most recent events for one person. */
export async function listAuthEvents(userId: string, limit = 10) {
  return authEventRepository.listForUser(userId, limit);
}

/** Only used by tests that need a clean slate. */
export async function clearAuthEvents(): Promise<void> {
  await db.authEvent.deleteMany({});
}
