import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

/**
 * Route protection at the proxy: /dashboard requires a session.
 *
 * This is a first gate only — it says "there is a session", never "this user may do this thing".
 * Authorization for a specific organization/action always happens server-side in the service
 * layer (`requirePermission`), because that is the only place that sees the real state.
 */
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  matcher: ['/dashboard/:path*'],
};
