import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { safeAuthCallback } from '@/lib/auth-redirect';
import { listOrganizations } from '@/server/services/organization.service';
import { RegisterForm } from '@/components/auth/forms';
import { registerAction } from '../actions';

export const metadata: Metadata = { title: 'Create your account' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const safeCallback = safeAuthCallback(callbackUrl);
  const user = await currentUser();
  if (user) {
    if (safeCallback !== '/dashboard') redirect(safeCallback);
    redirect((await listOrganizations(user.id)).length ? '/dashboard' : '/onboarding');
  }
  return <RegisterForm callbackUrl={safeCallback} registerAction={registerAction} />;
}
