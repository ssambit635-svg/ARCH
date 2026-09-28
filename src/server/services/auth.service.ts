import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { isUniqueViolationOn } from '@/lib/db-errors';
import { AppError } from '@/lib/errors';
import { userRepository } from '../repositories/user.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { uniqueOrganizationSlug } from './slug.service';
import { writeAudit } from '@/lib/audit';

/**
 * Account creation.
 *
 * Registering is the only place a password is stored: bcrypt (cost 10), never the plaintext.
 * When an organization name is supplied the creator becomes its OWNER, in one transaction, so a
 * user can never end up without a tenant to work in.
 */

const BCRYPT_COST = 10;

export async function registerUser(params: {
  email: string;
  password: string;
  name?: string | null;
  organizationName?: string | null;
}) {
  const email = params.email.trim().toLowerCase();

  const existing = await userRepository.findByEmail(email);
  if (existing) throw AppError.conflict('An account with that email already exists. Sign in instead.');

  const passwordHash = await hash(params.password, BCRYPT_COST);
  const organizationName = params.organizationName?.trim() || null;

  // The organization slug is picked by "look, then insert", so two signups for the same name can
  // pick the same slug. The unique index catches that; retry with a freshly computed slug.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await createAccount({ email, name: params.name ?? null, passwordHash, organizationName });
    } catch (error) {
      // The preflight lookup gives a friendly duplicate message in the usual case; the unique
      // index remains the source of truth if two signup requests arrive at the same time.
      // (Prisma 7's driver adapter reports the constraint name, not `meta.target`.)
      if (isUniqueViolationOn(error, 'users_email_key', 'email')) {
        throw AppError.conflict('An account with that email already exists. Sign in instead.');
      }
      if (organizationName && attempt < SLUG_RACE_ATTEMPTS && isUniqueViolationOn(error, 'organizations_slug_key', 'slug')) continue;
      throw error;
    }
  }
}

const SLUG_RACE_ATTEMPTS = 3;

async function createAccount(params: { email: string; name: string | null; passwordHash: string; organizationName: string | null }) {
  const { email, name, passwordHash, organizationName } = params;
  return db.$transaction(async (tx) => {
    const user = await userRepository.create({ email, name, passwordHash }, tx);
    if (!organizationName) return { user, organization: null };

    const slug = await uniqueOrganizationSlug(organizationName, tx);
    const organization = await organizationRepository.createWithOwner({ name: organizationName, slug, ownerId: user.id }, tx);

    await writeAudit(
      {
        organizationId: organization.id,
        actorId: user.id,
        action: 'organization.create',
        entityType: 'organization',
        entityId: organization.id,
        metadata: { name: organization.name, slug: organization.slug, via: 'register' },
      },
      tx,
    );

    return { user, organization };
  });
}

export async function userExists(email: string) {
  return Boolean(await userRepository.findByEmail(email));
}
