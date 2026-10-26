import { headers } from 'next/headers';

/**
 * Facts about the request that is asking to sign in.
 *
 * The IP is used for rate limiting and for the security trail; the user agent is only stored so
 * an administrator can recognise their own sign-ins. Neither is ever used to decide *who* a
 * person is — the provider's verified email does that.
 */

export type RequestFingerprint = { ip: string | null; userAgent: string | null };

/**
 * The caller's IP address.
 *
 * `x-forwarded-for` may hold a chain (`client, proxy1, proxy2`); the first entry is the original
 * client. Behind a proxy the header can be spoofed, so it is a hint for rate limiting and the
 * audit trail, never an identity.
 */
export async function requestIp(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwarded || requestHeaders.get('x-real-ip')?.trim();
    return ip || null;
  } catch {
    return null;
  }
}

export async function requestUserAgent(): Promise<string | null> {
  try {
    const agent = (await headers()).get('user-agent');
    return agent ? agent.slice(0, 200) : null;
  } catch {
    return null;
  }
}

/** Both at once, for the security trail. Never throws: no request scope, no trail. */
export async function requestFingerprint(): Promise<RequestFingerprint> {
  const [ip, userAgent] = await Promise.all([requestIp(), requestUserAgent()]);
  return { ip, userAgent };
}
