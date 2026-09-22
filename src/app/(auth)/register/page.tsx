import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { RegisterForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Create your account' };

export default async function RegisterPage() {
  const user = await currentUser();
  if (user) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Create your ARCH account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Two minutes to a status page and an on-call trail your auditors will like.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
