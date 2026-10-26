import { db } from './db';
import { autoLinkMatches, isVerifiedOAuthIdentity, type AutoLink } from './oauth-server';
import { isOAuthProviderId } from './oauth';

/**
 * The decisions Auth.js asks for while an OAuth identity is on its way in.
 *
 * They live on their own so they can be reasoned about — and tested — without an HTTP request
 * in the picture. Auth.js' own contract is used as-is:
 *
 *   true    the identity may sign in
 *   false   the identity may not — Auth.js answers with `AccessDenied`
 *   string  the identity may not, and the person is sent to this address instead
 */

/** What Auth.js should do with an OAuth identity. */
export type OAuthSignInDecision = true | false | string;

/**
 * Whether a provider identity may sign in.
 *
 * Two rules, in this order:
 *
 *  1. A link that continues automatically after a password sign-in has to carry the very
 *     address that was signed in with. The browser may already have been signed in at the
 *     provider, so the provider identity can otherwise belong to somebody else on a shared
 *     browser. Such a link is refused with a message, and nothing is changed.
 *  2. The identity itself has to be verifiable: Google has to say the address is verified,
 *     GitHub has to report a verified address. An unverifiable identity never signs in.
 */
export function decideOAuthSignIn(
  account: { provider: string } | null | undefined,
  profile: unknown,
  marker: AutoLink | null,
): OAuthSignInDecision {
  if (!account || !isOAuthProviderId(account.provider)) return true;

  if (marker?.strict && marker.provider === account.provider) {
    if (!autoLinkMatches(marker, account.provider, profile)) {
      return `/login?error=account_mismatch&provider=${account.provider}`;
    }
  }

  return isVerifiedOAuthIdentity(account.provider, profile);
}

/**
 * Whether a provider identity that was just attached may stay attached.
 *
 * A link may only ever attach to the account that asked for it. When the session changed hands
 * while the person was at the provider, the identity is attached to an account nobody asked
 * for it — so it is removed again, and the attempt is recorded.
 *
 * Returns false when the link was undone.
 */
export async function guardProviderLink(
  user: { id?: string | null },
  account: { provider: string; providerAccountId: string },
  marker: AutoLink | null,
): Promise<boolean> {
  if (!marker || !user?.id || marker.userId === user.id) return true;
  await db.account.deleteMany({
    where: {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      userId: user.id,
    },
  });
  return false;
}
