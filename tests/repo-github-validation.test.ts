import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/lib/env';
import { resetRateLimits } from '@/lib/rate-limit';
import { addMember, createTenant, createTestUser, db, resetDatabase } from './helpers/db';
import { createRepoConnection, pinRepoCommit, updateRepoConnection } from '@/server/services/repo.service';
import { _testing, type GithubClient } from '@/server/services/github.service';
import { setAiProviderForTesting } from '@/server/ai/provider';
import { createMockProvider } from '@/server/ai/mock';

/**
 * V4 M1 hardening — repo connect / commit pin must be validated against GitHub when the token is
 * live, and must stay network-free when it is not.
 *
 * Before this, `pinnedCommitSha: "abcdef1"` was accepted as-is. GitHub's `createRef` only takes a
 * full 40-char SHA, so a short pin passed every check in ARCH and then failed at "Approve & create
 * PR" — after a human had read the diff.
 */

const FULL_SHA = 'e'.repeat(40);
const HEAD_SHA = 'f'.repeat(40);

function fakeGithub(options: { repo?: Record<string, unknown>; failOnGet?: number } = {}) {
  const calls: string[] = [];
  const client: GithubClient = {
    rest: {
      repos: {
        get: async () => {
          calls.push('repos.get');
          if (options.failOnGet) throw { status: options.failOnGet, message: 'Not Found', response: { headers: {} } };
          return {
            data: {
              full_name: 'Acme/API',
              default_branch: 'master',
              private: true,
              archived: false,
              permissions: { admin: false, push: true, pull: true },
              ...options.repo,
            },
          };
        },
        getBranch: async () => {
          calls.push('repos.getBranch');
          return { data: { commit: { sha: HEAD_SHA } } };
        },
        getCommit: async ({ ref }) => {
          calls.push('repos.getCommit');
          return { data: { sha: ref?.length === 40 ? ref : FULL_SHA, commit: { message: 'fix: pin me' } } };
        },
        getContent: async () => {
          calls.push('repos.getContent');
          throw { status: 404, message: 'Not Found', response: { headers: {} } };
        },
      },
      git: {
        getCommit: async () => ({ data: { tree: { sha: 'tree' } } }),
        getTree: async () => ({ data: { truncated: false, tree: [] } }),
        createBlob: async () => ({ data: { sha: 'blob' } }),
        createTree: async () => ({ data: { sha: 'tree' } }),
        createCommit: async () => ({ data: { sha: 'commit' } }),
        createRef: async () => ({ data: { ref: 'refs/heads/x', object: { sha: 'commit' } } }),
        updateRef: async () => ({}),
        deleteRef: async () => ({}),
      },
      pulls: {
        create: async () => ({ data: { number: 1, html_url: 'https://github.com/Acme/API/pull/1', state: 'open', draft: false } }),
        get: async () => ({ data: { number: 1, html_url: 'https://github.com/Acme/API/pull/1', state: 'open', draft: false, merged: false, merged_at: null } }),
      },
      users: { getAuthenticated: async () => ({ data: { login: 'arch-bot', type: 'Bot' } }) },
      rateLimit: {
        get: async () => ({ data: { resources: { core: { limit: 5000, used: 1, remaining: 4999, reset: Math.floor(Date.now() / 1000) + 3600 } } } }),
      },
    },
  };
  return { client, calls };
}

async function setupTenant(name = 'Acme') {
  const tenant = await createTenant(name);
  const admin = await createTestUser(`admin2@${name.toLowerCase()}.test`, 'Asha Admin');
  await addMember(tenant.organization.id, admin.id, 'ADMIN');
  const viewer = await createTestUser(`viewer2@${name.toLowerCase()}.test`, 'Vik Viewer');
  await addMember(tenant.organization.id, viewer.id, 'VIEWER');
  return { ...tenant, admin, viewer };
}

describe('V4 M1 — GitHub validation on connect/pin', () => {
  const saved = { mode: env.GITHUB_MODE, token: env.GITHUB_TOKEN };

  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    setAiProviderForTesting(createMockProvider());
  });

  afterEach(() => {
    env.GITHUB_MODE = saved.mode;
    env.GITHUB_TOKEN = saved.token;
    _testing.reset();
  });

  it('offline mode never calls GitHub and still stores what the user typed', async () => {
    env.GITHUB_MODE = 'mock';
    env.GITHUB_TOKEN = undefined;
    const { client, calls } = fakeGithub();
    _testing.setClientFactory(async () => client);

    const acme = await setupTenant();
    const connection = await createRepoConnection({
      organizationId: acme.organization.id,
      userId: acme.owner.id,
      owner: 'acme',
      repo: 'api',
      pinnedCommitSha: 'abcdef1',
    });

    expect(calls).toEqual([]);
    expect(connection.pinnedCommitSha).toBe('abcdef1');
    expect(connection.defaultBranch).toBe('main');
  });

  it('real mode stores GitHub canonical names, its default branch, and the full SHA', async () => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    const { client, calls } = fakeGithub();
    _testing.setClientFactory(async () => client);

    const acme = await setupTenant();
    const connection = await createRepoConnection({
      organizationId: acme.organization.id,
      userId: acme.owner.id,
      owner: 'acme',
      repo: 'api',
      pinnedCommitSha: 'abcdef1',
    });

    expect(calls).toEqual(['repos.get', 'repos.getBranch', 'repos.getCommit']);
    expect(connection.fullName).toBe('Acme/API'); // canonical casing from GitHub
    expect(connection.defaultBranch).toBe('master'); // not the blind 'main' default
    expect(connection.pinnedCommitSha).toBe(FULL_SHA); // short pin expanded

    const audit = await db.auditLog.findFirst({ where: { organizationId: acme.organization.id, action: 'repo.connect' } });
    expect((audit?.metadata as { githubVerified?: boolean }).githubVerified).toBe(true);
    expect((audit?.metadata as { headShaAtConnect?: string }).headShaAtConnect).toBe(HEAD_SHA);
  });

  it('real mode refuses a repo the token cannot see — before storing a broken connection', async () => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    const { client } = fakeGithub({ failOnGet: 404 });
    _testing.setClientFactory(async () => client);

    const acme = await setupTenant();
    await expect(
      createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'acme', repo: 'ghost' }),
    ).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/has no repository acme\/ghost/) });

    expect(await db.repoConnection.count({ where: { organizationId: acme.organization.id } })).toBe(0);
  });

  it('a read-only token survives connect (with a loud audit note), an archived repo does not', async () => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    const readOnly = fakeGithub({ repo: { permissions: { admin: false, push: false, pull: true } } });
    _testing.setClientFactory(async () => readOnly.client);

    const acme = await setupTenant();
    // Some credentials report push:false while being able to write — so ARCH connects and warns
    // instead of locking the user out. The push itself remains the definitive test.
    const connection = await createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'acme', repo: 'api' });
    expect(connection.fullName).toBe('Acme/API');

    const audit = await db.auditLog.findFirst({ where: { organizationId: acme.organization.id, action: 'repo.connect' } });
    const notes = (audit?.metadata as { notes?: string[] }).notes ?? [];
    expect(notes.some((note) => note.includes('cannot write Acme/API'))).toBe(true);

    _testing.setClientFactory(async () => fakeGithub({ repo: { archived: true } }).client);
    await expect(
      createRepoConnection({ organizationId: acme.organization.id, userId: acme.admin.id, owner: 'acme', repo: 'old' }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/archived/) });
    expect(await db.repoConnection.count({ where: { organizationId: acme.organization.id, isActive: true } })).toBe(1);
  });

  it('a branch GitHub has never heard of is named, not mistaken for a missing repo', async () => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    const fake = fakeGithub();
    fake.client.rest.repos.getBranch = async ({ branch }: { owner: string; repo: string; branch: string }) => {
      throw { status: 404, message: `Branch ${branch} missing`, response: { headers: {} } };
    };
    _testing.setClientFactory(async () => fake.client);

    const acme = await setupTenant();
    await expect(
      createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'acme', repo: 'api', defaultBranch: 'not-a-branch' }),
    ).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/Branch "not-a-branch" does not exist in Acme\/API/) });
    expect(await db.repoConnection.count({ where: { organizationId: acme.organization.id } })).toBe(0);
  });

  it('pin resolves through GitHub and records both SHAs in the audit log', async () => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    const { client, calls } = fakeGithub();
    _testing.setClientFactory(async () => client);

    const acme = await setupTenant();
    const connection = await createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'acme', repo: 'api' });
    calls.length = 0;

    const pinned = await pinRepoCommit({
      organizationId: acme.organization.id,
      userId: acme.owner.id,
      repoConnectionId: connection.id,
      commitSha: 'deadbee',
    });
    expect(calls).toEqual(['repos.getCommit']); // pin needs one lookup, not a repo tour
    expect(pinned.pinnedCommitSha).toBe(FULL_SHA);

    const audit = await db.auditLog.findFirst({ where: { organizationId: acme.organization.id, action: 'repo.pin_commit' } });
    const metadata = audit?.metadata as { requestedSha?: string; newSha?: string; resolvedFromGithub?: boolean; commitMessage?: string };
    expect(metadata.requestedSha).toBe('deadbee');
    expect(metadata.newSha).toBe(FULL_SHA);
    expect(metadata.resolvedFromGithub).toBe(true);
    expect(metadata.commitMessage).toBe('fix: pin me');
  });

  it('an unknown commit SHA is rejected at pin time', async () => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    const { client } = fakeGithub();
    client.rest.repos.getCommit = async () => {
      throw { status: 404, message: 'Not Found', response: { headers: {} } };
    };
    _testing.setClientFactory(async () => client);

    const acme = await setupTenant();
    const connection = await createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'acme', repo: 'api' });

    await expect(
      pinRepoCommit({ organizationId: acme.organization.id, userId: acme.owner.id, repoConnectionId: connection.id, commitSha: '1234567' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('updating the base branch checks it exists on GitHub', async () => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    const { client, calls } = fakeGithub();
    _testing.setClientFactory(async () => client);

    const acme = await setupTenant();
    const connection = await createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'acme', repo: 'api' });
    calls.length = 0;

    await updateRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, repoConnectionId: connection.id, defaultBranch: 'release/2026' });
    expect(calls).toContain('repos.getBranch');

    client.rest.repos.getBranch = async () => {
      throw { status: 404, message: 'Branch not found', response: { headers: {} } };
    };
    await expect(
      updateRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, repoConnectionId: connection.id, defaultBranch: 'nope' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('same repo in different letter case is still a duplicate (GitHub names are case-insensitive)', async () => {
    env.GITHUB_MODE = 'mock';
    env.GITHUB_TOKEN = undefined;
    const acme = await setupTenant();

    await createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'Acme', repo: 'Api' });
    await expect(
      createRepoConnection({ organizationId: acme.organization.id, userId: acme.owner.id, owner: 'acme', repo: 'api' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('V4 M4 — PR sync', () => {
  it('offline mode says so instead of reporting a stale state as fresh', async () => {
    env.GITHUB_MODE = 'mock';
    env.GITHUB_TOKEN = undefined;
    _testing.setClientFactory(async () => fakeGithub().client);

    const acme = await setupTenant('Globex');
    const { syncPullRequests } = await import('@/server/services/verifiedFix.service');
    await expect(
      syncPullRequests({ organizationId: acme.organization.id, userId: acme.owner.id, incidentId: 'inc_missing' }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/needs a live GITHUB_TOKEN/) });
  });

  it('still needs pr.read before it will say anything at all', async () => {
    const outsider = await createTestUser('outsider@nowhere.test', 'No Role');
    const acme = await setupTenant('Initech');
    const { syncPullRequests } = await import('@/server/services/verifiedFix.service');
    await expect(
      syncPullRequests({ organizationId: acme.organization.id, userId: outsider.id, incidentId: 'inc_missing' }),
    ).rejects.toMatchObject({ status: 404 }); // not a member of that org at all
  });
});
