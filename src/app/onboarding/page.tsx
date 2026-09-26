import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { listOrganizations } from '@/server/services/organization.service';
import { ActionForm } from '@/components/dashboard/action-form';
import { Field, Input } from '@/components/ui/form';
import { createFirstOrganizationAction } from './actions';

export const metadata: Metadata = { title: 'Create your organization' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect('/login?callbackUrl=/onboarding');
  if ((await listOrganizations(user.id)).length) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-semibold text-white">Welcome to ARCH</h1>
        <p className="mt-2 text-sm text-slate-300">
          You are signed in as {user.email}. Create your organization to start using the dashboard,
          or open your invitation link if someone invited you to an existing one.
        </p>
        <ActionForm action={createFirstOrganizationAction} submitLabel="Create organization" className="mt-6 space-y-3">
          <Field label="Organization name" htmlFor="organization-name">
            <Input id="organization-name" name="name" placeholder="Your team" minLength={2} maxLength={80} required />
          </Field>
        </ActionForm>
        <Link href="/" className="mt-5 inline-block text-xs text-slate-400 hover:text-white">← Home</Link>
      </div>
    </main>
  );
}
