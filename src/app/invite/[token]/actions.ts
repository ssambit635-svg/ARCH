'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { ORG_COOKIE } from '@/lib/session';
import { isAppError } from '@/lib/errors';
import { acceptInvitation } from '@/server/services/organization.service';

export type AcceptInvitationResult = { ok: true } | { ok: false; error: string };

/** Accepting an invitation: the signed-in email must match the invited email (checked in the service). */
export async function acceptInvitationAction(_state: AcceptInvitationResult | undefined, formData: FormData): Promise<AcceptInvitationResult> {
  const token = String(formData.get('token') ?? '');
  if (!token) return { ok: false, error: 'Missing invitation token.' };

  try {
    const user = await requireUser();
    const result = await acceptInvitation({ token, userId: user.id, userEmail: user.email });
    const store = await cookies();
    store.set(ORG_COOKIE, result.organizationId, { httpOnly: true, sameSite: 'lax', path: '/' });
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    if ((error as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { ok: false, error: 'Could not accept the invitation.' };
  }

  redirect('/dashboard');
}
