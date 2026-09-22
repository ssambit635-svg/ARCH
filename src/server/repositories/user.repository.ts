import { db, type DbClient } from '@/lib/db';

export const userRepository = {
  findByEmail(email: string, client: DbClient = db) {
    return client.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id: string, client: DbClient = db) {
    return client.user.findUnique({ where: { id } });
  },

  create(data: { email: string; name?: string | null; passwordHash?: string | null }, client: DbClient = db) {
    return client.user.create({ data: { ...data, email: data.email.toLowerCase() } });
  },

  count(client: DbClient = db) {
    return client.user.count();
  },
};
