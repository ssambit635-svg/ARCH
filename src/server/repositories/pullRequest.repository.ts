import { db, type DbClient } from '@/lib/db';

export const pullRequestRepository = {
  create(
    data: {
      organizationId: string;
      incidentId: string;
      suggestionId?: string | null;
      verificationId?: string | null;
      repoConnectionId: string;
      title: string;
      body?: string | null;
      branch: string;
      baseBranch?: string;
      commitSha?: string | null;
      patch?: string | null;
      externalUrl?: string | null;
      createdById?: string | null;
      status?: string;
    },
    client: DbClient = db,
  ) {
    return client.pullRequest.create({
      data: {
        organizationId: data.organizationId,
        incidentId: data.incidentId,
        suggestionId: data.suggestionId ?? null,
        verificationId: data.verificationId ?? null,
        repoConnectionId: data.repoConnectionId,
        title: data.title,
        body: data.body ?? null,
        branch: data.branch,
        baseBranch: data.baseBranch ?? 'main',
        commitSha: data.commitSha ?? null,
        patch: data.patch ?? null,
        externalUrl: data.externalUrl ?? null,
        createdById: data.createdById ?? null,
        status: data.status ?? 'OPEN',
      },
      include: { repoConnection: true, verification: true },
    });
  },

  findById(organizationId: string, id: string, client: DbClient = db) {
    return client.pullRequest.findFirst({
      where: { id, organizationId },
      include: { repoConnection: true, verification: true },
    });
  },

  findByVerification(organizationId: string, verificationId: string, client: DbClient = db) {
    return client.pullRequest.findFirst({
      where: { organizationId, verificationId },
      include: { repoConnection: true },
    });
  },

  listForIncident(organizationId: string, incidentId: string, client: DbClient = db) {
    return client.pullRequest.findMany({
      where: { organizationId, incidentId },
      orderBy: { createdAt: 'desc' },
      include: { repoConnection: true },
    });
  },

  /** Used by the PR sync: GitHub is the source of truth for OPEN/MERGED/CLOSED. */
  updateStatus(
    id: string,
    data: { status: string; externalUrl?: string | null; commitSha?: string | null },
    client: DbClient = db,
  ) {
    return client.pullRequest.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.externalUrl !== undefined ? { externalUrl: data.externalUrl } : {}),
        ...(data.commitSha !== undefined ? { commitSha: data.commitSha } : {}),
      },
    });
  },

  listForOrg(organizationId: string, client: DbClient = db) {
    return client.pullRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { repoConnection: true, incident: { select: { id: true, title: true } } },
      take: 100,
    });
  },
};
