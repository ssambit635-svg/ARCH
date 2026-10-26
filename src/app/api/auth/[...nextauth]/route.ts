import type { NextRequest } from 'next/server';
import { handlers } from '@/lib/auth';
import {
  autoLinkClearCookie,
  oauthProviderFromCallbackPath,
  pendingLinkClearCookie,
  pendingLinkSetCookie,
  readPendingOAuthLink,
} from '@/lib/oauth-server';

/**
 * The Auth.js endpoints, plus the two things Auth.js cannot do by itself.
 *
 * 1. When a provider sign-in is refused because an ARCH account already owns that email address,
 *    Auth.js sends the visitor to `/login?error=OAuthAccountNotLinked` and forgets which provider
 *    was refused and where the person was headed. The wrapper keeps that context in a signed,
 *    short-lived, httpOnly cookie, so the password form can finish the link in one step instead
 *    of dropping the person at the dashboard with a half-linked account.
 * 2. When a provider hands back an identity ARCH cannot verify — an unverified email, a failed
 *    API call, or a cancelled consent screen — Auth.js falls back to its own bare
 *    `/api/auth/signin` page, which is not part of ARCH's design. The wrapper sends the person
 *    back to `/login` with a message they can act on.
 *
 * Every other outcome clears the pending link again, so a failed sign-in never follows anyone
 * around.
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withProviderContext(await handlers.GET(request), request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return withProviderContext(await handlers.POST(request), request);
}

/** Auth.js' own sign-in page, used as a fallback when a provider hands back no identity. */
function isAuthJsSignInFallback(pathname: string): boolean {
  return /^\/api\/auth\/signin\/?$/.test(pathname);
}

/** Auth.js' own error page, used when a provider cannot be reached at all. */
function isAuthJsErrorPage(pathname: string): boolean {
  return /^\/api\/auth\/error\/?$/.test(pathname);
}

async function withProviderContext(response: Response, request: NextRequest): Promise<Response> {
  const provider = oauthProviderFromCallbackPath(request.url);
  if (!provider) return response;

  const location = response.headers.get('location');
  if (!location) return response;

  let target: URL;
  try {
    target = new URL(location, request.url);
  } catch {
    return response;
  }

  const headers = new Headers(response.headers);

  // The provider round trip is over: whatever account the link was allowed to attach to has
  // been checked. The marker is single use and must not follow the person around.
  headers.append('Set-Cookie', autoLinkClearCookie());

  if (isAuthJsErrorPage(target.pathname)) {
    // The provider could not be reached, or its credentials are wrong. Auth.js would show a
    // bare "Server error" screen; ARCH says what happened and where to go instead.
    const signIn = new URL('/login', target.origin);
    signIn.searchParams.set('error', 'provider_unavailable');
    signIn.searchParams.set('provider', provider);
    headers.set('location', signIn.toString());
    headers.append('Set-Cookie', pendingLinkClearCookie());
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  if (isAuthJsSignInFallback(target.pathname)) {
    // The provider did not give us a usable identity.
    const signIn = new URL('/login', target.origin);
    signIn.searchParams.set('error', 'OAuthProfileError');
    signIn.searchParams.set('provider', provider);
    headers.set('location', signIn.toString());
    headers.append('Set-Cookie', pendingLinkClearCookie());
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const error = target.searchParams.get('error');
  if (error) {
    // Name the provider in the error so the sign-in screen can say what went wrong.
    target.searchParams.set('provider', provider);
    headers.set('location', target.toString());
    if (error === 'OAuthAccountNotLinked') {
      const pending = await readPendingOAuthLink();
      if (pending) {
        headers.append('Set-Cookie', pendingLinkSetCookie({ ...pending, provider, reason: 'existing' }));
      }
    } else {
      headers.append('Set-Cookie', pendingLinkClearCookie());
    }
  } else {
    // The provider accepted the identity: the link is done, forget the reminder.
    headers.append('Set-Cookie', pendingLinkClearCookie());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
