import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { env } from '@/lib/env';
import { LoginForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Sign in' };

/** Auth.js sends provider failures back here as ?error=… — turn them into one human sentence. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  github: "GitHub sign-in didn't complete — try again, or sign in with your email and password.",
  AccessDenied: 'That GitHub account was not allowed to sign in. Check that it has a verified email.',
  OAuthAccountNotLinked: 'An ARCH account already uses that email. Sign in with your password first, then link GitHub in Settings.',
  Configuration: 'GitHub sign-in is misconfigured. Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET on the server.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const user = await currentUser();
  if (user && !error) redirect('/dashboard');

  const safeCallback = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/dashboard';
  // The button exists only when the provider is configured — blank AUTH_GITHUB_ID/SECRET means
  // the login page looks exactly as it did before OAuth support.
  const githubEnabled = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
  const oauthError = error
    ? (OAUTH_ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again or use your email and password.')
    : undefined;

  if (user) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">GitHub connection failed</h1>
        <p className="text-sm text-rose-300" role="alert">{oauthError}</p>
        <Link href="/dashboard/settings" className="text-sm text-indigo-400 hover:text-indigo-300">Return to Settings</Link>
      </div>
    );
  }

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
