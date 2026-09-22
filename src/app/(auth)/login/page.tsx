import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { LoginForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const user = await currentUser();
  if (user) redirect('/dashboard');

  const { callbackUrl } = await searchParams;
  const safeCallback = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/dashboard';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Sign in to ARCH</h1>
        <p className="mt-1 text-sm text-slate-400">Pick up where the last incident left off.</p>
      </div>
      <LoginForm callbackUrl={safeCallback} />
    </div>
  );
}
