import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
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
  const email = params.email.toLowerCase();

  const existing = await userRepository.findByEmail(email);
  if (existing) throw AppError.conflict('An account with that email already exists.');

  const passwordHash = await hash(params.password, BCRYPT_COST);

  return db.$transaction(async (tx) => {
    const user = await userRepository.create({ email, name: params.name ?? null, passwordHash }, tx);

    const organizationName = params.organizationName?.trim();
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
