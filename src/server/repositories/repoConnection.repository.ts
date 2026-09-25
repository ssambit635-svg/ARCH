import { db, type DbClient } from '@/lib/db';

export const repoConnectionRepository = {
  create(
    data: {
      organizationId: string;
      owner: string;
      repo: string;
      fullName: string;
      defaultBranch: string;
      pinnedCommitSha?: string | null;
      connectedById?: string | null;
    },
    client: DbClient = db,
  ) {
    return client.repoConnection.create({ data });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.repoConnection.findFirst({ where: { id, organizationId } });
  },

  findByFullName(organizationId: string, fullName: string, client: DbClient = db) {
    return client.repoConnection.findFirst({ where: { organizationId, fullName } });
  },

  list(organizationId: string, options: { includeInactive?: boolean } = {}, client: DbClient = db) {
    return client.repoConnection.findMany({
      where: {
        organizationId,
        ...(options.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  update(
    id: string,
    data: {
      defaultBranch?: string;
      pinnedCommitSha?: string | null;
      isActive?: boolean;
    },
    client: DbClient = db,
  ) {
    return client.repoConnection.update({ where: { id }, data });
  },

  pinCommit(id: string, commitSha: string, client: DbClient = db) {
    return client.repoConnection.update({ where: { id }, data: { pinnedCommitSha: commitSha } });
  },

  deactivate(id: string, client: DbClient = db) {
    return client.repoConnection.update({ where: { id }, data: { isActive: false } });
  },

  countActive(organizationId: string, client: DbClient = db) {
    return client.repoConnection.count({ where: { organizationId, isActive: true } });
  },
};
