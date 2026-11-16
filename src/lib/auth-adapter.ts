import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import { db } from './db';
import { createOAuthUser } from '@/server/services/auth.service';

/**
 * Auth.js persists the provider account id so future logins resolve the same ARCH user, and uses
 * the existing JWT session to link a GitHub account only after the password user signs in first.
 * We don't use GitHub's user API on the user's behalf: do not store access/refresh/id tokens.
 */
const prismaAdapter = PrismaAdapter(db);

export const authAdapter: Adapter = {
  ...prismaAdapter,
  createUser(user) {
    // Whitelist Auth.js identity fields, never accept a caller-supplied local user ID.
    const { email, name, image, emailVerified } = user;
    return createOAuthUser({ email, name, image, emailVerified });
  },
  linkAccount(account) {
    const { userId, provider, providerAccountId, type } = account;
    return prismaAdapter.linkAccount!({ userId, provider, providerAccountId, type });
  },
};
