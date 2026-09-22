import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js configuration.
 *
 * `src/middleware.ts` runs on the edge runtime and may only import this file: it carries no
 * database client and no password hashing. The Node-only pieces (credentials provider, Prisma
 * lookups) live in `src/lib/auth.ts`, which extends this config.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname, search } = request.nextUrl;
      const isProtected = pathname.startsWith('/dashboard');
      if (isProtected && !isLoggedIn) {
        const url = new URL('/login', request.nextUrl.origin);
        url.searchParams.set('callbackUrl', `${pathname}${search}`);
        return Response.redirect(url);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
