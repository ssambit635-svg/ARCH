import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from './db';
import { env } from './env';
import { authAdapter } from './auth-adapter';
import { authConfig } from './auth.config';
import { enforceRateLimit } from './rate-limit';
import { loginSchema } from './validation';
import {
  createOAuthProviders,
  clearAutoLink,
  clearPendingOAuthLink,
  readAutoLink,
} from './oauth-server';
import { decideOAuthSignIn, guardProviderLink } from './auth-callbacks';
import { isOAuthProviderId } from './oauth';
import { requestFingerprint } from './auth-request';
import { recordAuthEvent } from '@/server/services/auth-event.service';

/**
 * Auth.js (NextAuth v5) — credentials first, Google and GitHub optional.
 *
 * All three methods issue a JWT with the local users.id. The Prisma adapter persists only the
 * provider's account identity (never its OAuth tokens). Auth.js refuses to auto-link a matching
 * email: an existing password user must sign in first and explicitly link the provider in
 * Settings — or finish the link right after signing in with their password.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: authAdapter,
  secret: env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        // Brute-force protection also covers direct Auth.js callback requests (not just the
        // sign-in form action). Email and IP buckets are independent so changing either one
        // cannot bypass the other.
        enforceRateLimit(`auth:credentials:${normalizedEmail}`, { limit: 10, windowMs: 60_000 });
        const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const ip = forwardedIp || request.headers.get('x-real-ip')?.trim();
        if (ip) enforceRateLimit(`auth:credentials:ip:${ip}`, { limit: 30, windowMs: 60_000 });

        const user = await db.user.findUnique({ where: { email: normalizedEmail } });
        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined, image: user.image ?? undefined };
      },
    }),
    // Only providers this instance has credentials for. A provider without credentials is not
    // registered at all: its button never appears and its callback cannot be reached.
    ...createOAuthProviders(),
  ],
  events: {
    // Google reports whether the email is verified, GitHub's /user/emails is checked for
    // verified=true. Auth.js defaults new OAuth users to emailVerified=null; record the
    // checked identity.
    async createUser({ user }) {
      await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    },
    async signIn({ user, account }) {
      // Credentials sign-ins are not OAuth events and must not consume a pending link.
      if (!account || !isOAuthProviderId(account.provider)) return;
      await forgetPendingLink();
      const fingerprint = await requestFingerprint();
      await recordAuthEvent({
        userId: user.id,
        provider: account.provider,
        event: 'oauth_sign_in',
        ...fingerprint,
      });
    },
    async linkAccount({ user, account }) {
      await forgetPendingLink();
      const fingerprint = await requestFingerprint();
      const marker = await readAutoLink();
      const kept = await guardProviderLink(user, account, marker);
      await recordAuthEvent({
        userId: user.id,
        provider: account.provider,
        event: kept ? 'oauth_link' : 'oauth_denied',
        ...fingerprint,
      });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    /**
     * The single gate every OAuth identity passes.
     *
     * Refusing here (rather than throwing inside the provider) means Auth.js answers with
     * `AccessDenied` and sends the person back to `/login?error=AccessDenied` with a message
     * they can act on, instead of its own bare sign-in page.
     *
     * A link that continues automatically after a password sign-in carries the account it is
     * allowed to attach to. The provider's own address has to be that account's address:
     * otherwise a provider identity could be attached to whichever account happened to sign
     * in on a shared browser.
     */
    async signIn({ account, profile }) {
      if (!account || !isOAuthProviderId(account.provider)) {
        // Not a provider sign-in: drop a leftover marker so it cannot fire later.
        await clearAutoLink();
        return true;
      }
      return decideOAuthSignIn(account, profile, await readAutoLink());
    },
    // With the adapter the OAuth `user` is the persisted user, not a provider numeric id.
    // Credentials' `user.id` is also our DB id. No email-based lookup on subsequent requests.
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
  },
});

/**
 * Drop the "finish linking this provider" reminder.
 *
 * Best effort by design: the cookie is a convenience for the next step, never a condition for
 * completing a sign-in. If it cannot be written (an unusual request scope), the sign-in still
 * succeeds.
 */
async function forgetPendingLink(): Promise<void> {
  try {
    await clearPendingOAuthLink();
  } catch {
    // ignore — the pending link simply expires on its own
  }
}

/** The signed-in user as the app uses it, or null. */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? '', name: session.user.name ?? null };
}
