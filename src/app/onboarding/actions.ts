'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ORG_COOKIE, requireUser } from '@/lib/session';
import { isAppError } from '@/lib/errors';
import { organizationCreateSchema } from '@/lib/validation';
import { createOrganization } from '@/server/services/organization.service';
import type { ActionResult } from '@/app/dashboard/actions';

/** A newly signed-in OAuth (or password) user needs an organization before using the dashboard. */
export async function createFirstOrganizationAction(_state: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = organizationCreateSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Enter an organization name.' };

  try {
    const user = await requireUser();
    const organization = await createOrganization({ userId: user.id, name: parsed.data.name });
    const store = await cookies();
    store.set(ORG_COOKIE, organization.id, { httpOnly: true, sameSite: 'lax', path: '/' });
  } catch (error) {
    return { ok: false, error: isAppError(error) ? error.message : 'Could not create your organization.' };
  }
  redirect('/dashboard');
}
