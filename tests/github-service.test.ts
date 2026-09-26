import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import {
  _testing,
  buildBranchName,
  checkRepoAccess,
  createPullRequest,
  describeGithubConfig,
  fetchPullRequestState,
  githubMode,
  mapGithubError,
  prNumberFromUrl,
  redactGithubSecrets,
  verifyGithubCredentials,
  type GithubClient,
  type GithubRateLimitPayload,
  type GithubRepoInfo,
} from '@/server/services/github.service';
import { applyFilePatch, looksLikeUnifiedDiff, parseUnifiedDiff, safeRepoPath } from '@/server/services/github-patch';

/**
 * V4 M4 — GitHub PR creation, both modes.
 *
 * The fake client below is the whole point of this file: real mode is exercised end to end (base
 * resolution → read files → blobs → tree → commit → ref → PR) without a network or a token, so a
 * regression in the *order* of those calls fails here rather than on a customer's repository.
 */

const FULL_SHA_A = 'a'.repeat(40);
const FULL_SHA_B = 'b'.repeat(40);
const NEW_COMMIT_SHA = 'c'.repeat(40);

const ORIGINAL_FILE = 'line1\nline2\nline3\nline4\nline5\n';

const SIMPLE_PATCH = [
  'diff --git a/src/payments/service.ts b/src/payments/service.ts',
  'index 1234567..89abcde 100644',
  '--- a/src/payments/service.ts',
  '+++ b/src/payments/service.ts',
  '@@ -2,3 +2,3 @@',
  ' line2',
  '-line3',
  '+line3-fixed',
  ' line4',
].join('\n');

type FakeOptions = {
  repo?: Partial<GithubRepoInfo>;
  files?: Record<string, string | Error>;
  headSha?: string;
  resolveSha?: string;
  failOn?: Record<string, { status: number; message: string; headers?: Record<string, string>; errors?: unknown[] }>;
};

/** Records every call so tests can assert the exact sequence, and fails the ones `failOn` names. */
function createFakeGithub(options: FakeOptions = {}) {
  const calls: string[] = [];
  const created: { blobs: Array<{ path: string; content: string }>; tree: unknown | null; commit: unknown | null; ref: unknown | null; pr: unknown | null } = {
    blobs: [],
    tree: null,
    commit: null,
    ref: null,
    pr: null,
  };

  const step = <T>(name: string, run: () => T): T => {
    calls.push(name);
    const failure = options.failOn?.[name];
    if (failure) {
      throw {
        status: failure.status,
        message: failure.message,
        response: { headers: failure.headers ?? {} },
        ...(failure.errors ? { errors: failure.errors } : {}),
      };
    }
    return run();
  };

  const repoInfo: GithubRepoInfo = {
    full_name: 'acme/api',
    default_branch: 'main',
    private: true,
    archived: false,
    permissions: { admin: false, push: true, pull: true },
    ...options.repo,
  };

  const client: GithubClient = {
    rest: {
      repos: {
        get: async () => step('repos.get', () => ({ data: repoInfo })),
        getBranch: async () =>
          step('repos.getBranch', () => ({ data: { commit: { sha: options.headSha ?? FULL_SHA_A } } })),
        getCommit: async ({ ref }) =>
          step('repos.getCommit', () => ({
            data: { sha: ref && ref.length === 40 ? ref : (options.resolveSha ?? FULL_SHA_A), commit: { message: 'fix: previous work\n\nbody' } },
          })),
        getContent: async ({ path }) =>
          step('repos.getContent', () => {
            const file = options.files?.[path];
            if (file instanceof Error) throw file;
            if (file === undefined) throw { status: 404, message: 'Not Found', response: { headers: {} } };
            return { data: { content: Buffer.from(file, 'utf8').toString('base64'), encoding: 'base64' } };
          }),
      },
      git: {
        getCommit: async () => step('git.getCommit', () => ({ data: { tree: { sha: 'tree-base' } } })),
        createBlob: async ({ content }) =>
          step('git.createBlob', () => {
            const sha = `${'d'.repeat(36)}${created.blobs.length}`;
            created.blobs.push({ path: `blob-${created.blobs.length}`, content: String(content) });
            return { data: { sha } };
          }),
        createTree: async (params) =>
          step('git.createTree', () => {
            created.tree = params;
            return { data: { sha: 'tree-new' } };
          }),
        createCommit: async (params) =>
          step('git.createCommit', () => {
            created.commit = params;
            return { data: { sha: NEW_COMMIT_SHA } };
          }),
        createRef: async (params) =>
          step('git.createRef', () => {
            created.ref = params;
            return { data: { ref: params.ref, object: { sha: params.sha } } };
          }),
        updateRef: async (params) => step('git.updateRef', () => ({ data: { object: { sha: params.sha } } })),
        deleteRef: async () => step('git.deleteRef', () => ({})),
      },
      pulls: {
        create: async (params) =>
          step('pulls.create', () => {
            created.pr = params;
            return {
              data: {
                number: 101,
                html_url: `https://github.com/acme/api/pull/101`,
                state: 'open',
                draft: Boolean(params.draft),
                merged: false,
                merged_at: null,
                head: { sha: NEW_COMMIT_SHA },
                base: { sha: options.headSha ?? FULL_SHA_A, ref: params.base },
              },
            };
          }),
        get: async ({ pull_number }) =>
          step('pulls.get', () => ({
            data: {
              number: pull_number,
              html_url: `https://github.com/acme/api/pull/${pull_number}`,
              state: 'closed',
              draft: false,
              merged: true,
              merged_at: '2026-09-25T10:00:00Z',
              head: { sha: NEW_COMMIT_SHA },
              base: { sha: FULL_SHA_A, ref: 'main' },
            },
          })),
      },
      users: {
        getAuthenticated: async () =>
          step('users.getAuthenticated', () => ({
            data: { login: 'arch-bot', type: 'Bot', name: 'ARCH' },
            headers: { 'x-oauth-scopes': 'repo, read:org' },
          })) as unknown as { data: { login: string; type?: string; name?: string | null } },
      },
      rateLimit: {
        get: async () =>
          step('rateLimit.get', () => ({
            data: { resources: { core: { limit: 5000, used: 12, remaining: 4988, reset: Math.floor(Date.now() / 1000) + 3600 } } },
          })) as unknown as { data: GithubRateLimitPayload },
      },
    },
  };

  return { client, calls, created };
}

function baseParams(overrides: Partial<Parameters<typeof createPullRequest>[0]> = {}) {
  return {
    organizationId: 'org_1',
    repoOwner: 'acme',
    repoName: 'api',
    fullName: 'acme/api',
    baseBranch: 'main',
    commitSha: FULL_SHA_A,
    title: 'Fix: payment timeout',
    body: null,
    patch: SIMPLE_PATCH,
    incidentId: 'inc_1',
    verificationId: 'ver_1',
    ...overrides,
  };
}

describe('github.service — mode selection', () => {
  const saved = { mode: env.GITHUB_MODE, token: env.GITHUB_TOKEN };

  afterEach(() => {
    env.GITHUB_MODE = saved.mode;
    env.GITHUB_TOKEN = saved.token;
    _testing.reset();
  });

  it('offline (no token) stays in mock mode', () => {
    env.GITHUB_MODE = 'auto';
    env.GITHUB_TOKEN = undefined;
    expect(githubMode()).toBe('mock');
    const config = describeGithubConfig();
    expect(config.mode).toBe('mock');
    expect(config.tokenConfigured).toBe(false);
    expect(config.tokenHint).toBeNull();
    expect(config.reason).toMatch(/No GITHUB_TOKEN/);
  });

  it('token + GITHUB_MODE=auto goes live — the AI privacy lock no longer blocks PRs', () => {
    env.GITHUB_MODE = 'auto';
    env.GITHUB_TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';
    expect(githubMode()).toBe('real');
    const config = describeGithubConfig();
    expect(config.mode).toBe('real');
    expect(config.tokenHint).toBe('ghp_ab…6789'); // masked, never the secret
    expect(config.tokenHint).not.toContain('cdefghijklmnop');
  });

  it('GITHUB_MODE=mock wins over a configured token (CI can pin the offline path)', () => {
    env.GITHUB_MODE = 'mock';
    env.GITHUB_TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';
    expect(githubMode()).toBe('mock');
  });

  it('an empty-string token means unset, not "configured"', () => {
    env.GITHUB_MODE = 'auto';
    env.GITHUB_TOKEN = '   ' as never;
    expect(githubMode()).toBe('mock');
  });

  it('mock mode does a single thing: record, no network, no fake URL', async () => {
    env.GITHUB_MODE = 'mock';
    env.GITHUB_TOKEN = undefined;
    let touched = false;
    _testing.setClientFactory(async () => {
      touched = true;
      throw new Error('mock mode must not build a client');
    });

    const result = await createPullRequest(baseParams());
    expect(touched).toBe(false);
    expect(result.mode).toBe('mock');
    expect(result.mocked).toBe(true);
    expect(result.externalUrl).toBeNull();
    expect(result.prNumber).toBeNull();
    expect(result.branch).toMatch(/^arch\/fix-fix-payment-timeout-[0-9a-f]{6}$/);
    expect(result.files).toEqual(['src/payments/service.ts']);
    expect(result.body).toContain(result.branch); // was a random placeholder branch before
    expect(result.body).toContain('not** created on GitHub');
  });
});

describe('github.service — real mode via fake client', () => {
  const saved = { mode: env.GITHUB_MODE, token: env.GITHUB_TOKEN, draft: env.GITHUB_PR_DRAFT };

  beforeEach(() => {
    env.GITHUB_MODE = 'real';
    env.GITHUB_TOKEN = 'ghp_testtoken0000000000000000000000000000000000';
    env.GITHUB_PR_DRAFT = true;
  });

  afterEach(() => {
    env.GITHUB_MODE = saved.mode;
    env.GITHUB_TOKEN = saved.token;
    env.GITHUB_PR_DRAFT = saved.draft;
    _testing.reset();
  });

  it('pushes one commit and opens a draft PR off the pinned commit', async () => {
    const fake = createFakeGithub({ files: { 'src/payments/service.ts': ORIGINAL_FILE } });
    _testing.setClientFactory(async () => fake.client);

    const result = await createPullRequest(baseParams());

    expect(fake.calls).toEqual([
      'repos.getCommit', // base = pinned SHA, not the branch head (M1 guarantee)
      'repos.getContent', // read the file as it exists at that commit
      'git.getCommit', // base tree
      'git.createBlob',
      'git.createTree',
      'git.createCommit',
      'git.createRef',
      'pulls.create',
    ]);

    expect(result.mode).toBe('real');
    expect(result.mocked).toBe(false);
    expect(result.externalUrl).toBe('https://github.com/acme/api/pull/101');
    expect(result.prNumber).toBe(101);
    expect(result.baseSha).toBe(FULL_SHA_A);
    expect(result.commitSha).toBe(NEW_COMMIT_SHA);
    expect(result.draft).toBe(true);

    // the pushed content is the patch applied to the real file, not the patch text
    expect(fake.created.blobs[0]?.content).toBe('line1\nline2\nline3-fixed\nline4\nline5\n');
    const tree = fake.created.tree as { base_tree: string; tree: Array<{ path: string; mode: string; type: string; sha: string | null }> };
    expect(tree.base_tree).toBe('tree-base');
    expect(tree.tree[0]).toMatchObject({ path: 'src/payments/service.ts', mode: '100644', type: 'blob' });
    expect(tree.tree[0]?.sha).not.toBeNull();

    const pr = fake.created.pr as { head: string; base: string; title: string; draft: boolean; body: string };
    expect(pr.base).toBe('main');
    expect(pr.head).toBe(result.branch);
    expect(pr.draft).toBe(true);
    expect(pr.title).toBe('Fix: payment timeout');
    expect(pr.body).toContain('acme/api');
    expect(pr.body).toContain(FULL_SHA_A.slice(0, 12));
    expect(pr.body).toContain('`src/payments/service.ts`');
    expect(pr.body).not.toContain('placeholder');
  });

  it('falls back to the branch head when nothing is pinned', async () => {
    const fake = createFakeGithub({ files: { 'src/payments/service.ts': ORIGINAL_FILE } });
    _testing.setClientFactory(async () => fake.client);

    await createPullRequest(baseParams({ commitSha: null }));
    expect(fake.calls[0]).toBe('repos.getBranch');
  });

  it('creates a new file, deletes one, and marks the delete with a null sha', async () => {
    const patch = [
      'diff --git a/src/new.ts b/src/new.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/src/new.ts',
      '@@ -0,0 +1,2 @@',
      '+export const a = 1;',
      '+export const b = 2;',
      'diff --git a/src/gone.ts b/src/gone.ts',
      'deleted file mode 100644',
      '--- a/src/gone.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-old1',
      '-old2',
    ].join('\n');

    const fake = createFakeGithub({ files: { 'src/gone.ts': 'old1\nold2\n' } });
    _testing.setClientFactory(async () => fake.client);

    const result = await createPullRequest(baseParams({ patch }));
    expect(result.files.sort()).toEqual(['src/gone.ts', 'src/new.ts']);
    const tree = fake.created.tree as { tree: Array<{ path: string; sha: string | null }> };
    expect(tree.tree.find((entry) => entry.path === 'src/gone.ts')?.sha).toBeNull();
    const newFile = fake.created.blobs[0]?.content;
    expect(newFile).toBe('export const a = 1;\nexport const b = 2;\n');
  });

  it('refuses to open a PR when a hunk does not fit the pinned commit', async () => {
    const drifted = SIMPLE_PATCH.replace('-line3\n+line3-fixed\n', '-something-else\n+x\n');
    const fake = createFakeGithub({ files: { 'src/payments/service.ts': ORIGINAL_FILE } });
    _testing.setClientFactory(async () => fake.client);

    await expect(createPullRequest(baseParams({ patch: drifted }))).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/does not match src\/payments\/service\.ts at the pinned commit/),
    });
    // Nothing was pushed: the failure happens before any write call.
    expect(fake.calls).toEqual(['repos.getCommit', 'repos.getContent']);
  });

  it('refuses a patch that is not a diff, instead of fabricating a PR', async () => {
    const fake = createFakeGithub();
    _testing.setClientFactory(async () => fake.client);

    await expect(createPullRequest(baseParams({ patch: 'just wrap the call in try/catch, that should fix it' }))).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/not a unified diff/),
    });
    expect(fake.calls).toEqual([]);
  });

  it('rejects a creation for a path that already exists (pin drift)', async () => {
    const patch = ['--- /dev/null', '+++ b/src/payments/service.ts', '@@ -0,0 +1,1 @@', '+boom'].join('\n');
    const fake = createFakeGithub({ files: { 'src/payments/service.ts': ORIGINAL_FILE } });
    _testing.setClientFactory(async () => fake.client);

    await expect(createPullRequest(baseParams({ patch }))).rejects.toMatchObject({ status: 409 });
    expect(fake.calls).toContain('repos.getContent');
    expect(fake.calls).not.toContain('pulls.create');
  });

  it('refuses a patch touching too many files', async () => {
    const patch = Array.from({ length: 20 }, (_, index) =>
      ['diff --git a/f' + index + '.ts b/f' + index + '.ts', '--- a/f' + index + '.ts', '+++ b/f' + index + '.ts', '@@ -1,1 +1,1 @@', '-x', '+y'].join('\n'),
    ).join('\n');
    const files = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`f${index}.ts`, 'x\n']));
    const fake = createFakeGithub({ files });
    _testing.setClientFactory(async () => fake.client);

    await expect(createPullRequest(baseParams({ patch }))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/at most 12/) });
    expect(fake.calls).toEqual(['repos.getCommit']);
  });

  it('reuses the branch when GitHub says the ref already exists (retry after a failed run)', async () => {
    const fake = createFakeGithub({
      files: { 'src/payments/service.ts': ORIGINAL_FILE },
      failOn: { 'git.createRef': { status: 422, message: 'Reference already exists' } },
    });
    _testing.setClientFactory(async () => fake.client);

    const result = await createPullRequest(baseParams());
    expect(fake.calls).toContain('git.updateRef');
    expect(fake.calls).toContain('pulls.create');
    expect(result.externalUrl).toBe('https://github.com/acme/api/pull/101');
  });

  it('opens a ready PR when GITHUB_PR_DRAFT=false', async () => {
    env.GITHUB_PR_DRAFT = false;
    const fake = createFakeGithub({ files: { 'src/payments/service.ts': ORIGINAL_FILE } });
    _testing.setClientFactory(async () => fake.client);

    const result = await createPullRequest(baseParams());
    expect((fake.created.pr as { draft: boolean }).draft).toBe(false);
    expect(result.draft).toBe(false);
  });

  it('maps token, permission, rate-limit and 5xx failures to actionable errors', async () => {
    const cases: Array<[string, { status: number; message: string; headers?: Record<string, string> }, number, RegExp]> = [
      ['repos.getCommit', { status: 401, message: 'Bad credentials' }, 503, /rejected GITHUB_TOKEN/],
      ['repos.getCommit', { status: 404, message: 'Not Found' }, 404, /has no repository acme\/api/],
      ['repos.getCommit', { status: 403, message: 'Resource not accessible by integration' }, 503, /cannot open PRs for users; use a PAT with Contents/],
      ['repos.getCommit', { status: 403, message: 'Resource forbidden' }, 403, /not allowed to reach acme\/api/],
      ['repos.getCommit', { status: 403, message: 'missing permission', headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600) } }, 429, /rate limit reached/],
      ['repos.getCommit', { status: 502, message: 'Bad gateway' }, 503, /GitHub returned 502/],
    ];

    for (const [method, failure, status, message] of cases) {
      const fake = createFakeGithub({ files: { 'src/payments/service.ts': ORIGINAL_FILE }, failOn: { [method]: failure } });
      _testing.setClientFactory(async () => fake.client);
      const error = await createPullRequest(baseParams()).catch((caught: unknown) => caught);
      expect((error as AppError).status, `${method} → ${status}`).toBe(status);
      expect((error as AppError).message).toMatch(message);
      expect(fake.calls).not.toContain('pulls.create');
    }
  });

  it('never echoes the token back in an error', async () => {
    const token = env.GITHUB_TOKEN as string;
    const fake = createFakeGithub({
      files: {},
      failOn: { 'repos.getCommit': { status: 500, message: `upstream rejected Authorization: token ${token}` } },
    });
    _testing.setClientFactory(async () => fake.client);

    const error = (await createPullRequest(baseParams()).catch((caught: unknown) => caught)) as AppError;
    expect(error.message).not.toContain(token);
    expect(JSON.stringify(error.details ?? {})).not.toContain(token);
  });

  it('verifyGithubCredentials reports actor, scopes and remaining quota', async () => {
    const fake = createFakeGithub();
    _testing.setClientFactory(async () => fake.client);

    const result = await verifyGithubCredentials();
    expect(fake.calls).toEqual(['rateLimit.get', 'users.getAuthenticated']);
    expect(result.ok).toBe(true);
    expect(result.actor).toBe('arch-bot');
    expect(result.scopes).toEqual(['repo', 'read:org']);
    expect(result.rateLimit.remaining).toBe(4988);
    expect(result.message).toMatch(/authenticated as arch-bot/);
  });

  it('verifyGithubCredentials survives a token that cannot read /user (GitHub App style)', async () => {
    const fake = createFakeGithub();
    fake.client.rest.users.getAuthenticated = async () => {
      throw { status: 403, message: 'Resource not accessible by integration', response: { headers: {} } };
    };
    _testing.setClientFactory(async () => fake.client);

    const result = await verifyGithubCredentials();
    expect(result.ok).toBe(true);
    expect(result.actor).toBeNull();
    expect(result.rateLimit.remaining).toBeGreaterThan(0);
  });

  it('checkRepoAccess resolves a short pin to a full SHA and reports push rights', async () => {
    const fake = createFakeGithub({ headSha: FULL_SHA_B });
    _testing.setClientFactory(async () => fake.client);

    const result = await checkRepoAccess({ owner: 'acme', repo: 'api', commitSha: 'abcdef1' });
    expect(result.canPush).toBe(true);
    expect(result.permissionsKnown).toBe(true);
    expect(result.baseSha).toBe(FULL_SHA_A); // the fake expands the short sha
    expect(result.headSha).toBe(FULL_SHA_B);
    expect(result.defaultBranch).toBe('main');
    expect(result.commitMessage).toBe('fix: previous work');
    expect(result.message).toMatch(/Access to acme\/api confirmed/);
  });

  it('checkRepoAccess flags a read-only token instead of letting approve fail later', async () => {
    const fake = createFakeGithub({ repo: { permissions: { admin: false, push: false, pull: true } } });
    _testing.setClientFactory(async () => fake.client);

    const result = await checkRepoAccess({ owner: 'acme', repo: 'api' });
    expect(result.canPush).toBe(false);
    expect(result.message).toMatch(/Contents: Read and write/);
  });

  it('fetchPullRequestState folds GitHub state into MERGED/CLOSED/OPEN and reads the number back out of a URL', async () => {
    const fake = createFakeGithub();
    _testing.setClientFactory(async () => fake.client);

    const state = await fetchPullRequestState({ owner: 'acme', repo: 'api', prNumber: 101 });
    expect(state).toMatchObject({ number: 101, state: 'MERGED', draft: false });
    expect(state.mergedAt).toBe('2026-09-25T10:00:00Z');

    expect(prNumberFromUrl('https://github.com/acme/api/pull/101')).toBe(101);
    expect(prNumberFromUrl('https://github.com/acme/api/pull/101 (mock — offline mode)')).toBe(101);
    expect(prNumberFromUrl(null)).toBeNull();
  });
});

describe('github.service — helpers', () => {
  it('branch names stay valid refs and unique per fix', () => {
    const a = buildBranchName('Fix: Payment service timeout!!');
    const b = buildBranchName('Fix: Payment service timeout!!');
    expect(a).toMatch(/^arch\/fix-fix-payment-service-timeout-[0-9a-f]{6}$/);
    expect(a.length).toBeLessThanOrEqual(255);
    // git check-ref-format forbids ~ ^ : ? * [ \ , "..", a trailing "/" and spaces — none can appear here.
    expect(a).toMatch(/^[A-Za-z0-9._/-]+$/);
    expect(a).not.toContain('..');
    expect(a.endsWith('/')).toBe(false);
    expect(a).not.toBe(b);
    expect(buildBranchName('///')).toMatch(/^arch\/fix-incident-/);
  });

  it('redactGithubSecrets scrubs every token shape', () => {
    expect(redactGithubSecrets('ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe('[redacted-token]');
    expect(redactGithubSecrets('github_pat_11ABCDEFGH_0123456789abcdefghijklmnopqrstuvwx')).toBe('[redacted-token]');
    expect(redactGithubSecrets('https://x-access-token:ghs_AAAAAAAAAAAAAAAAAAAAAA@github.com')).toBe('https://x-access-token:[redacted-token]@github.com');
  });

  it('mapGithubError turns a timeout into a retryable 503', () => {
    const error = mapGithubError(new Error('The operation was aborted due to timeout'), { owner: 'acme', repo: 'api' });
    expect(error.status).toBe(503);
    expect(error.message).toMatch(/within/);
  });
});

describe('github-patch — the diff reader real mode depends on', () => {
  it('applies a hunk whose declared offset drifted', () => {
    const patch = ['--- a/a.ts', '+++ b/a.ts', '@@ -1,1 +1,1 @@', '-line4', '+lineFOUR'].join('\n');
    const [file] = parseUnifiedDiff(patch);
    expect(file).toBeDefined();
    const result = applyFilePatch(ORIGINAL_FILE, file!);
    expect(result.ok).toBe(true);
    expect(result.ok && result.content).toBe('line1\nline2\nline3\nlineFOUR\nline5\n');
  });

  it('keeps a patch wrapped in prose and code fences usable', () => {
    const wrapped = `Sure — here is the fix:\n\n\`\`\`diff\n${SIMPLE_PATCH}\n\`\`\`\n\nLet me know if you want tests.`;
    const files = parseUnifiedDiff(wrapped);
    expect(files).toHaveLength(1);
    const result = applyFilePatch(ORIGINAL_FILE, files[0]!);
    expect(result.ok && result.content).toBe('line1\nline2\nline3-fixed\nline4\nline5\n');
  });

  it('honours "\ No newline at end of file"', () => {
    const patch = ['--- a/a.ts', '+++ b/a.ts', '@@ -1,1 +1,1 @@', '-line1', '+line1-new', '\\ No newline at end of file'].join('\n');
    const result = applyFilePatch('line1\n', parseUnifiedDiff(patch)[0]!);
    expect(result.ok && result.content).toBe('line1-new');
  });

  it('treats an empty line as a blank context line, not as end-of-hunk', () => {
    const original = 'first\n\nlast\n';
    const patch = ['--- a/a.ts', '+++ b/a.ts', '@@ -1,3 +1,3 @@', ' first', '', '-last', '+LAST'].join('\n');
    const result = applyFilePatch(original, parseUnifiedDiff(patch)[0]!);
    expect(result.ok && result.content).toBe('first\n\nLAST\n');
  });

  it('rejects paths outside the repository', () => {
    expect(safeRepoPath('../../etc/passwd')).toBeNull();
    expect(safeRepoPath('.git/config')).toBeNull();
    expect(safeRepoPath('/etc/passwd')).toBeNull();
    expect(safeRepoPath('C:/Windows/system32')).toBeNull();
    expect(safeRepoPath('./src//a/b.ts')).toBe('src/a/b.ts');
    expect(safeRepoPath('src/a/../b.ts')).toBeNull(); // rejected, not silently normalised
    expect(parseUnifiedDiff(['--- a/../../etc/passwd', '+++ b/../../etc/passwd', '@@ -1,1 +1,1 @@', '-x', '+y'].join('\n'))).toEqual([]);
  });

  it('detects non-diffs so the caller can say so plainly', () => {
    expect(looksLikeUnifiedDiff('try/catch around the fetch')).toBe(false);
    expect(looksLikeUnifiedDiff('@@ -1,2 +1,2 @@\n a\n-b')).toBe(true);
  });
});
