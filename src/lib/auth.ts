import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from './db';
import { env } from './env';
import { authAdapter } from './auth-adapter';
import { githubProvider } from './github-oauth';
import { authConfig } from './auth.config';
import { enforceRateLimit } from './rate-limit';
import { loginSchema } from './validation';

/**
 * Auth.js (NextAuth v5) — credentials first, GitHub optional.
 *
 * Both methods issue a JWT with the local users.id. The Prisma adapter persists only the GitHub
 * account identity (not its OAuth tokens). Auth.js refuses to auto-link a matching email: an
 * existing password user must sign in first and explicitly link GitHub in Settings.
 */

const githubEnabled = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: authAdapter,
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
    ...(githubEnabled ? [githubProvider(env.AUTH_GITHUB_ID!, env.AUTH_GITHUB_SECRET!)] : []),
  ],
  events: {
    // GitHub's /user/emails is checked for verified=true before Auth.js creates the account.
    // Auth.js defaults new OAuth users to emailVerified=null; record the checked identity.
    async createUser({ user }) {
      await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    // With the adapter the OAuth `user` is the persisted user, not a GitHub numeric id.
    // Credentials' `user.id` is also our DB id. No email-based lookup on subsequent requests.
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
  },
});

/** The signed-in user as the app uses it, or null. */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? '', name: session.user.name ?? null };
}
