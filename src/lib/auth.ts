import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import { compare } from 'bcryptjs';
import { db } from './db';
import { env } from './env';
import { authConfig } from './auth.config';
import { enforceRateLimit } from './rate-limit';
import { loginSchema } from './validation';

/**
 * Auth.js (NextAuth v5) — credentials first, GitHub optional.
 *
 * Sessions are JWTs (no DB round-trip per request). Users are created by /api/auth/register or, for
 * OAuth sign-ins, by the `signIn` callback below — which upserts the local row so RBAC,
 * memberships and audit logs always have a real `users.id` to point at.
 */

const githubEnabled = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        // Brute-force protection: per-email and per-IP limits are applied by the caller of
        // /api/auth/callback/credentials via the same key namespace.
        enforceRateLimit(`auth:credentials:${normalizedEmail}`, { limit: 10, windowMs: 60_000 });

        const user = await db.user.findUnique({ where: { email: normalizedEmail } });
        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined, image: user.image ?? undefined };
      },
    }),
    ...(githubEnabled
      ? [GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET, allowDangerousEmailAccountLinking: true })]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // OAuth users have no local row until we create one. Credentials sign-ins already exist.
      if (account?.provider !== 'credentials' && user.email) {
        await db.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: { name: user.name ?? undefined, image: user.image ?? undefined },
          create: {
            email: user.email.toLowerCase(),
            name: user.name ?? null,
            image: user.image ?? null,
            emailVerified: new Date(),
          },
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) token.sub = user.id;
      // For OAuth, swap the provider id for our own users.id so session.user.id is usable.
      if (account && account.provider !== 'credentials' && user?.email) {
        const local = await db.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true } });
        if (local) token.sub = local.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** The signed-in user as the app uses it, or null. */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? '', name: session.user.name ?? null };
}
