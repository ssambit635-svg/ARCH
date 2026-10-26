import Google, { type GoogleProfile } from 'next-auth/providers/google';
import { z } from 'zod';

/**
 * Google sign-in.
 *
 * Google is an OpenID Connect provider: the validated ID token carries the email address *and*
 * whether Google verified it (`email_verified`). Auth.js' default Google mapping ignores that
 * flag, so this module supplies its own mapping and the sign-in callback in `src/lib/auth.ts`
 * refuses any identity whose email Google has not verified.
 *
 * As with GitHub, a Google account is never attached to an existing ARCH account just because
 * the email addresses match: the person has to sign in with their password first.
 */

/** Google reports the flag as a JSON boolean; some ID tokens carry it as a string. */
function claimsEmailVerified(value: unknown): boolean {
  return value === true || value === 'true';
}

/**
 * True only when Google itself verified the email address. An unverified Google address must
 * never become an ARCH identity.
 */
export function isVerifiedGoogleProfile(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const claims = profile as Partial<GoogleProfile>;
  if (!claimsEmailVerified(claims.email_verified)) return false;
  return typeof claims.email === 'string' && z.email().safeParse(claims.email.trim()).success;
}

/** The lower-cased, validated email of a verified Google profile, otherwise null. */
export function verifiedGoogleEmail(profile: unknown): string | null {
  if (!isVerifiedGoogleProfile(profile)) return null;
  const email = (profile as Partial<GoogleProfile>).email!.trim().toLowerCase();
  return z.email().safeParse(email).success ? email : null;
}

export function googleProvider(clientId: string, clientSecret: string) {
  return Google({
    clientId,
    clientSecret,
    /**
     * PKCE *and* the `state` parameter.
     *
     * Auth.js only enables PKCE by default. PKCE stops an intercepted authorization code from
     * being replayed, but the `state` parameter is what the OAuth 2.0 security model asks for as
     * well (RFC 6749 §10.12): it ties the callback to the exact request this browser started, so
     * a callback that was not initiated here is refused. Both are cheap; both are used.
     */
    checks: ['pkce', 'state'],
    /**
     * The authorization endpoint is written down instead of being looked up.
     *
     * Left to itself, Auth.js fetches Google's OpenID Connect discovery document every time
     * somebody starts a sign-in — one more network call that can be slow, rate limited, or
     * simply unavailable, and the sign-in fails before it has even started. Google's endpoint
     * is stable and documented, so it is named here.
     *
     * The ID token is still verified against Google's real signing keys (JWKS) on the way
     * back, and the token exchange still happens against Google itself — naming the endpoint
     * changes nothing about what is trusted.
     */
    authorization: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      params: {
        // Only what ARCH actually needs: who the person is, and whether Google verified it.
        scope: 'openid profile email',
        // People often own more than one Google account: let them choose instead of guessing.
        prompt: 'select_account',
      },
    },
    profile(profile) {
      const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
      return {
        id: profile.sub,
        name: profile.name ?? (email ? email.split('@')[0] : null),
        email,
        image: profile.picture ?? null,
      };
    },
  });
}
