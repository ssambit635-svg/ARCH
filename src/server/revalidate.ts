import { revalidatePath } from 'next/cache';
import { publishedSlugsForOrganization } from './services/statusPage.service';

/**
 * Public status pages are cached (ISR). Dashboard writes must invalidate the pages they affect,
 * otherwise customers keep reading a stale status.
 *
 * `revalidatePath` only works inside a request (route handler or server action), which is where
 * this helper is called from — never from the worker or a unit test, hence the guard.
 */
export function revalidateStatusPages(slugs: string[]): void {
  for (const slug of slugs) {
    try {
      revalidatePath(`/status/${slug}`);
    } catch {
      // Outside a request context (script, worker, test) there is nothing to revalidate.
    }
  }
  try {
    revalidatePath('/dashboard');
  } catch {
    /* ignore */
  }
}

export async function revalidateOrganizationStatusPages(organizationId: string): Promise<void> {
  const slugs = await publishedSlugsForOrganization(organizationId);
  revalidateStatusPages(slugs);
}
