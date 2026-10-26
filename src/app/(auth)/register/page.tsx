import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { safeAuthCallback } from '@/lib/auth-redirect';
import { listOrganizations } from '@/server/services/organization.service';
import { RegisterForm } from '@/components/auth/forms';
import { oauthProviderAvailability } from '@/lib/oauth-server';
import { oauthErrorMessage } from '@/lib/oauth-messages';
import { isOAuthProviderId } from '@/lib/oauth';
import { oauthSignInAction, registerAction } from '../actions';

export const metadata: Metadata = { title: 'Create your account' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[]; provider?: string | string[] }>;
}) {
  const { callbackUrl, error, provider } = await searchParams;
  const safeCallback = safeAuthCallback(callbackUrl);
  const user = await currentUser();
  if (user) {
    if (safeCallback !== '/dashboard') redirect(safeCallback);
    redirect((await listOrganizations(user.id)).length ? '/dashboard' : '/onboarding');
  }
  // Every provider ARCH knows is offered, configured or not — an unconfigured one explains
  // itself when it is pressed.
  const oauthProviders = oauthProviderAvailability();
  const errorCode = typeof error === 'string' && error ? error : undefined;
  const providerParam = Array.isArray(provider) ? provider[0] : provider;
  const providerCode = isOAuthProviderId(providerParam) ? providerParam : undefined;
  return (
    <RegisterForm
      callbackUrl={safeCallback}
      registerAction={registerAction}
      oauthAction={oauthSignInAction}
      oauthProviders={oauthProviders}
      oauthError={oauthErrorMessage(errorCode, providerCode)}
    />
  );
}
