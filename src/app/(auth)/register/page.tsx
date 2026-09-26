import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { listOrganizations } from '@/server/services/organization.service';
import { RegisterForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Create your account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const user = await currentUser();
  if (user) redirect((await listOrganizations(user.id)).length ? '/dashboard' : '/onboarding');
  const { callbackUrl } = await searchParams;
  const safeCallback = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/dashboard';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Create your ARCH account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Two minutes to a status page and an on-call trail your auditors will like.
        </p>
      </div>
      <RegisterForm callbackUrl={safeCallback} />
    </div>
  );
}
