import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { env } from '@/lib/env';
import { LoginForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Sign in' };

/** Auth.js sends provider failures back here as ?error=… — turn them into one human sentence. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  github: "GitHub sign-in didn't complete — try again, or sign in with your email and password.",
  AccessDenied: 'That GitHub account was not allowed to sign in.',
  Configuration: 'GitHub sign-in is misconfigured. Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET in .env.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const user = await currentUser();
  if (user) redirect('/dashboard');

  const { callbackUrl, error } = await searchParams;
  const safeCallback = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/dashboard';
  // The button exists only when the provider is configured — blank AUTH_GITHUB_ID/SECRET means
  // the login page looks exactly as it did before OAuth support.
  const githubEnabled = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
  const oauthError = error
    ? (OAUTH_ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again or use your email and password.')
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Sign in to ARCH</h1>
        <p className="mt-1 text-sm text-slate-400">Pick up where the last incident left off.</p>
      </div>
      <LoginForm callbackUrl={safeCallback} githubEnabled={githubEnabled} oauthError={oauthError} />
    </div>
  );
}
