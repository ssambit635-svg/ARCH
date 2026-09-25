import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { repoConnectionRepository } from '@/server/repositories/repoConnection.repository';

const COMMIT_SHA_REGEX = /^[a-f0-9]{7,40}$/i;
const OWNER_REGEX = /^[a-zA-Z0-9_.-]+$/;
const REPO_REGEX = /^[a-zA-Z0-9_.-]+$/;

function normalizeFullName(owner: string, repo: string): string {
  return `${owner.trim()}/${repo.trim()}`;
}

function validateCommitSha(sha: string): void {
  if (!COMMIT_SHA_REGEX.test(sha)) {
    throw AppError.badRequest('Commit SHA must be 7-40 hex characters.', { commitSha: 'Invalid format.' });
  }
}

function validateOwnerRepo(owner: string, repo: string): void {
  if (!OWNER_REGEX.test(owner) || !REPO_REGEX.test(repo)) {
    throw AppError.badRequest('Invalid GitHub owner or repo name.');
  }
  if (owner.length > 100 || repo.length > 100) {
    throw AppError.badRequest('Owner or repo name too long.');
  }
}

/**
 * V4 M1 — GitHub repo connect + org permission + commit pinning.
 *
 * RBAC: repo.manage (OWNER/ADMIN) to create/update/pin/deactivate, repo.read (all roles) to list.
 * Commit pinning: exact SHA the fix was tested against (repo@commit checkout).
 * Every mutation writes an audit entry with actor, action, entity, metadata.
 */

export async function listRepoConnections(params: { organizationId: string; userId: string; includeInactive?: boolean }) {
  await requirePermission(params.organizationId, params.userId, 'repo.read');
  return repoConnectionRepository.list(params.organizationId, { includeInactive: params.includeInactive });
}

export async function getRepoConnection(params: { organizationId: string; userId: string; repoConnectionId: string }) {
  await requirePermission(params.organizationId, params.userId, 'repo.read');
  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');
  return connection;
}

export async function createRepoConnection(params: {
  organizationId: string;
  userId: string;
  owner: string;
  repo: string;
  defaultBranch?: string;
  pinnedCommitSha?: string | null;
}) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');

  const owner = params.owner.trim();
  const repo = params.repo.trim();
  validateOwnerRepo(owner, repo);
  const fullName = normalizeFullName(owner, repo);

  if (params.pinnedCommitSha) {
    validateCommitSha(params.pinnedCommitSha);
  }

  // Prevent duplicate connections for same repo in same org
  const existing = await repoConnectionRepository.findByFullName(params.organizationId, fullName);
  if (existing) {
    throw AppError.conflict(`Repository ${fullName} is already connected.`, { fullName });
  }

  const connection = await db.$transaction(async (tx) => {
    const created = await repoConnectionRepository.create(
      {
        organizationId: params.organizationId,
        owner,
        repo,
        fullName,
        defaultBranch: params.defaultBranch?.trim() || 'main',
        pinnedCommitSha: params.pinnedCommitSha ?? null,
        connectedById: params.userId,
      },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.connect',
        entityType: 'repo_connection',
        entityId: created.id,
        metadata: { fullName, owner, repo, defaultBranch: created.defaultBranch, pinnedCommitSha: created.pinnedCommitSha ?? null },
      },
      tx,
    );
    return created;
  });

  return connection;
}

export async function updateRepoConnection(params: {
  organizationId: string;
  userId: string;
  repoConnectionId: string;
  defaultBranch?: string;
  isActive?: boolean;
}) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');

  const updated = await db.$transaction(async (tx) => {
    const result = await repoConnectionRepository.update(
      params.repoConnectionId,
      {
        ...(params.defaultBranch !== undefined ? { defaultBranch: params.defaultBranch } : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      },
      tx,
    );
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.update',
        entityType: 'repo_connection',
        entityId: result.id,
        metadata: { fullName: result.fullName, changes: params },
      },
      tx,
    );
    return result;
  });

  return updated;
}

export async function pinRepoCommit(params: {
  organizationId: string;
  userId: string;
  repoConnectionId: string;
  commitSha: string;
}) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');
  validateCommitSha(params.commitSha);

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');

  const pinned = await db.$transaction(async (tx) => {
    const result = await repoConnectionRepository.pinCommit(params.repoConnectionId, params.commitSha.toLowerCase(), tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.pin_commit',
        entityType: 'repo_connection',
        entityId: result.id,
        metadata: {
          fullName: result.fullName,
          previousSha: connection.pinnedCommitSha,
          newSha: result.pinnedCommitSha,
        },
      },
      tx,
    );
    return result;
  });

  return pinned;
}

export async function deactivateRepoConnection(params: { organizationId: string; userId: string; repoConnectionId: string }) {
  await requirePermission(params.organizationId, params.userId, 'repo.manage');

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');

  const deactivated = await db.$transaction(async (tx) => {
    const result = await repoConnectionRepository.deactivate(params.repoConnectionId, tx);
    await writeAudit(
      {
        organizationId: params.organizationId,
        actorId: params.userId,
        action: 'repo.deactivate',
        entityType: 'repo_connection',
        entityId: result.id,
        metadata: { fullName: result.fullName },
      },
      tx,
    );
    return result;
  });

  return deactivated;
}
