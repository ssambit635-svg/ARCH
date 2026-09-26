import type { NextAuthConfig } from 'next-auth';

/**
 * Lightweight Auth.js config shared with the Next.js proxy.
 *
 * `src/proxy.ts` checks JWTs without importing Prisma or password hashing. The Node-only pieces
 * (credentials provider, OAuth adapter and DB lookups) live in `src/lib/auth.ts`.
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
