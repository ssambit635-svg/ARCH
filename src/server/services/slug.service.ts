import { randomToken } from '@/lib/crypto';
import { slugify } from '@/lib/format';
import { db, type DbClient } from '@/lib/db';

/**
 * Human-readable identifiers. Slugs are unique per scope (org slugs globally, project slugs per
 * organization, service slugs per project) and we resolve collisions by appending a suffix rather
 * than failing the user's action.
 */

const MAX_ATTEMPTS = 20;

export async function uniqueOrganizationSlug(base: string, client: DbClient = db): Promise<string> {
  const root = slugify(base) || 'org';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const taken = await client.organization.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${randomToken(4).toLowerCase()}`;
}

export async function uniqueProjectSlug(organizationId: string, base: string, client: DbClient = db): Promise<string> {
  const root = slugify(base) || 'project';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const taken = await client.project.findFirst({ where: { organizationId, slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${randomToken(4).toLowerCase()}`;
}

export async function uniqueServiceSlug(projectId: string, base: string, client: DbClient = db): Promise<string> {
  const root = slugify(base) || 'service';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const taken = await client.service.findFirst({ where: { projectId, slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${randomToken(4).toLowerCase()}`;
}

export async function uniqueStatusPageSlug(base: string, client: DbClient = db): Promise<string> {
  const root = slugify(base) || 'status';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const taken = await client.statusPage.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${randomToken(4).toLowerCase()}`;
}

/** Public, non-guessable identifier embedded in generated webhook URLs. */
export function newExternalId(): string {
  return randomToken(16);
}
