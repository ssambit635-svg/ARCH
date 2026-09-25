import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { repoConnectionRepository } from '@/server/repositories/repoConnection.repository';
import { enforceRateLimit } from '@/lib/rate-limit';

const COMMIT_SHA_REGEX = /^[a-f0-9]{7,40}$/i;
const OWNER_REGEX = /^[a-zA-Z0-9_.-]+$/;
const REPO_REGEX = /^[a-zA-Z0-9_.-]+$/;
const MAX_REPOS_PER_ORG = 20;
const REPO_RATE_LIMIT = { limit: 20, windowMs: 60_000 };

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
    throw AppError.badRequest('Invalid GitHub owner or repo name. Use letters, numbers, dash, dot, underscore.');
  }
  if (owner.length > 100 || repo.length > 100) {
    throw AppError.badRequest('Owner or repo name too long (max 100).');
  }
  // Prevent reserved names
  if (['.', '..'].includes(owner) || ['.', '..'].includes(repo)) {
    throw AppError.badRequest('Owner/repo cannot be . or ..');
  }
}

/**
 * V4 M1 — GitHub repo connect + org permission + commit pinning.
 *
 * Architecture:
 *   - Organization owns many RepoConnections (GitHub)
 *   - Each connection has pinnedCommitSha = exact commit fix was tested against (repo@commit)
 *   - RBAC: repo.manage (OWNER/ADMIN) to mutate, repo.read (all) to list
 *   - Rate limited + max per org to prevent abuse
 *   - Every mutation audited with actor, action, entity, metadata
 *   - Cross-tenant isolation: findById always filters by organizationId → 404 if not in org
 *
 * Why commit pinning matters:
 *   Without pinning, a patch generated against main today may not apply tomorrow.
 *   With pinning, evidence bundle says "tested against acme/api @ abc123", so human reviewer
 *   knows exact base, and PR can be created from that SHA.
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
  enforceRateLimit(`repo-connect:${params.organizationId}`, REPO_RATE_LIMIT);

  const owner = params.owner.trim();
  const repo = params.repo.trim();
  validateOwnerRepo(owner, repo);
  const fullName = normalizeFullName(owner, repo);

  if (params.pinnedCommitSha) {
    validateCommitSha(params.pinnedCommitSha);
  }

  const count = await repoConnectionRepository.countActive(params.organizationId);
  if (count >= MAX_REPOS_PER_ORG) {
    throw AppError.badRequest(`Too many connected repos (max ${MAX_REPOS_PER_ORG}). Deactivate unused ones first.`);
  }

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
        pinnedCommitSha: params.pinnedCommitSha ? params.pinnedCommitSha.toLowerCase() : null,
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
        metadata: {
          fullName,
          owner,
          repo,
          defaultBranch: created.defaultBranch,
          pinnedCommitSha: created.pinnedCommitSha ?? null,
          provider: 'github',
        },
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
  enforceRateLimit(`repo-connect:${params.organizationId}`, REPO_RATE_LIMIT);

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection) throw AppError.notFound('Repository connection not found.');

  if (params.defaultBranch !== undefined) {
    const branch = params.defaultBranch.trim();
    if (branch.length === 0 || branch.length > 100) throw AppError.badRequest('Invalid branch name.');
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await repoConnectionRepository.update(
      params.repoConnectionId,
      {
        ...(params.defaultBranch !== undefined ? { defaultBranch: params.defaultBranch.trim() } : {}),
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
        metadata: { fullName: result.fullName, changes: { defaultBranch: params.defaultBranch, isActive: params.isActive } },
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
  enforceRateLimit(`repo-connect:${params.organizationId}`, REPO_RATE_LIMIT);
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
          pinnedAt: new Date().toISOString(),
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
        metadata: { fullName: result.fullName, deactivatedAt: new Date().toISOString() },
      },
      tx,
    );
    return result;
  });

  return deactivated;
}
