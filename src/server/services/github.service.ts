import { randomUUID } from 'node:crypto';
import { Octokit } from '@octokit/rest';
import packageJson from '../../../package.json';
import { env, isPlaceholderSecret } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { applyFilePatch, looksLikeUnifiedDiff, parseUnifiedDiff, type FilePatch } from './github-patch';

/**
 * V4 M4 — GitHub PR creation.
 *
 * Two modes, decided by `GITHUB_MODE` + `GITHUB_TOKEN` (see describeGithubConfig):
 *
 *   mock  — no network at all. Returns a PR record with `mocked: true` and *no* URL, so the audit
 *           log says "PR was not really opened" instead of pretending. Used by tests, CI and
 *           air-gapped demos.
 *   real  — @octokit/rest against api.github.com (or GITHUB_API_BASE_URL for GHES):
 *             1. resolve the base: pinned commit SHA (repo@commit, the M1 guarantee) or base branch
 *             2. read every file the patch touches *at that commit* and apply the hunks ourselves
 *             3. one blob per file → one tree → one commit → `refs/heads/arch/fix-*`
 *             4. open the PR (draft by default) with the evidence bundle in the body
 *
 * Why the patch is applied here instead of `git apply`: GitHub has no "push a diff" endpoint. The
 * Git Data API wants blobs, so a diff has to become file contents. See github-patch.ts — and note
 * that a hunk which does not fit the pinned commit aborts the whole thing with a readable error.
 *
 * Safety invariants:
 *   - Only reachable after a human approved a PASSED verification (verifiedFix.service).
 *   - The model's patch is untrusted input: paths are confined to the repo, sizes capped, and no
 *     file is written that we did not read first.
 *   - A failure never returns a fabricated PR URL. Ever. That was the old behaviour and it poisoned
 *     both the UI and the audit trail.
 *   - The token is never logged; error text is scrubbed of token-shaped strings.
 */

/** Max files one ARCH PR may touch. A model that rewrites 40 files is not a fix, it is a rollback. */
export const MAX_PR_FILES = 12;
/** GitHub's content API caps a file at 100 MB; we stop far earlier — a verified fix is small. */
export const MAX_PR_FILE_BYTES = 512 * 1024;

export type GithubMode = 'real' | 'mock';

export type CreatePrParams = {
  organizationId: string;
  repoOwner: string;
  repoName: string;
  fullName: string;
  baseBranch: string;
  /** Pinned commit the patch was tested against. Wins over `baseBranch` (M1 guarantee). */
  commitSha?: string | null;
  title: string;
  body?: string | null;
  patch: string;
  incidentId: string;
  /** Extra context for the audit trail / PR footer. */
  verificationId?: string | null;
};

export type CreatePrResult = {
  mode: GithubMode;
  /** True when no pull request exists on GitHub (offline mode). */
  mocked: boolean;
  branch: string;
  /** null in mock mode — we refuse to store a URL that leads nowhere. */
  externalUrl: string | null;
  prNumber: number | null;
  title: string;
  body: string;
  /** SHA of the commit ARCH pushed (mock mode: the pinned base, unchanged). */
  commitSha: string | null;
  baseSha: string | null;
  files: string[];
  draft: boolean;
};

// ---------- client plumbing ----------

/**
 * The slice of Octokit this service uses. Declaring it (instead of `any`) keeps the test double
 * honest: it has to provide exactly these calls, and production code cannot quietly reach for a
 * method nobody stubbed.
 */
export type GithubClient = {
  rest: {
    repos: {
      get: (p: { owner: string; repo: string }) => Promise<{ data: GithubRepoInfo }>;
      getContent: (p: { owner: string; repo: string; path: string; ref: string }) => Promise<{ data: unknown }>;
      getCommit: (p: { owner: string; repo: string; ref: string }) => Promise<{ data: { sha: string; commit: { message: string } | null } }>;
      getBranch: (p: { owner: string; repo: string; branch: string }) => Promise<{ data: { commit: { sha: string } } }>;
    };
    git: {
      getCommit: (p: { owner: string; repo: string; commit_sha: string }) => Promise<{ data: { tree: { sha: string } } }>;
      createBlob: (p: { owner: string; repo: string; content: string; encoding: 'utf-8' | 'base64' }) => Promise<{ data: { sha: string } }>;
      createTree: (p: {
        owner: string;
        repo: string;
        base_tree: string;
        tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string | null }>;
      }) => Promise<{ data: { sha: string } }>;
      createCommit: (p: { owner: string; repo: string; message: string; tree: string; parents: string[] }) => Promise<{ data: { sha: string } }>;
      createRef: (p: { owner: string; repo: string; ref: string; sha: string }) => Promise<{ data: { ref: string; object: { sha: string } } }>;
      updateRef: (p: { owner: string; repo: string; ref: string; sha: string; force: boolean }) => Promise<unknown>;
      deleteRef: (p: { owner: string; repo: string; ref: string }) => Promise<unknown>;
    };
    pulls: {
      create: (p: { owner: string; repo: string; title: string; body?: string; head: string; base: string; draft?: boolean }) => Promise<{ data: GithubPullInfo }>;
      get: (p: { owner: string; repo: string; pull_number: number }) => Promise<{ data: GithubPullInfo }>;
    };
    users: { getAuthenticated: () => Promise<{ data: { login: string; type?: string; name?: string | null } }> };
    rateLimit: { get: () => Promise<{ data: GithubRateLimitPayload }> };
  };
};

export type GithubRepoInfo = {
  full_name: string;
  default_branch: string;
  private: boolean;
  permissions?: { admin?: boolean; push?: boolean; pull?: boolean };
  archived?: boolean;
};

export type GithubPullInfo = {
  number: number;
  html_url: string;
  state: string;
  draft?: boolean;
  merged?: boolean;
  merged_at?: string | null;
  head?: { sha?: string };
  base?: { sha?: string; ref?: string };
};

export type GithubRateLimitPayload = {
  resources: { core: { limit: number; used: number; remaining: number; reset: number } };
};

type ClientFactory = () => Promise<GithubClient>;

let cachedClient: GithubClient | null = null;
let testFactory: ClientFactory | null = null;

/** GitHub secrets must never appear in a log line or an error message, whatever produced them. */
export function redactGithubSecrets(text: string): string {
  return text
    .replace(/gh[pousr]_[A-Za-z0-9]{16,}/g, '[redacted-token]')
    .replace(/github_pat_[A-Za-z0-9_]{16,}/g, '[redacted-token]')
    .replace(/x-access-token:[^@\s]+@/g, 'x-access-token:[redacted-token]@');
}

/** A blank, whitespace, or `.env.example` placeholder token is "not configured". */
function activeToken(): string | null {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token || isPlaceholderSecret(token)) return null;
  return token;
}

export type GithubTokenKind = 'missing' | 'classic' | 'fine-grained' | 'github-app' | 'oauth' | 'unknown';

/** What kind of credential is this, from the prefix GitHub itself uses. Never logs the secret. */
export function classifyGithubToken(token: string | null | undefined): GithubTokenKind {
  const value = token?.trim();
  if (!value || isPlaceholderSecret(value)) return 'missing';
  if (value.startsWith('github_pat_')) return 'fine-grained';
  if (value.startsWith('ghp_')) return 'classic';
  if (value.startsWith('ghs_') || value.startsWith('ghu_')) return 'github-app';
  if (value.startsWith('gho_')) return 'oauth';
  return 'unknown';
}

function realModeRequested(): boolean {
  if (env.GITHUB_MODE === 'mock') return false;
  return Boolean(activeToken());
}

/** Which mode would a PR creation use right now? Cheap, synchronous, no network. */
export function githubMode(): GithubMode {
  return realModeRequested() ? 'real' : 'mock';
}

export function isGithubConfigured(): boolean {
  return Boolean(activeToken());
}

async function defaultClientFactory(): Promise<GithubClient> {
  if (!activeToken()) {
    throw AppError.unavailable('GITHUB_TOKEN is not set, so ARCH cannot open a pull request. Add it to .env or use GITHUB_MODE="mock".');
  }
  // AbortSignal.timeout keeps a hung GitHub call from parking an approval request forever; Octokit
  // hands `fetch` a signal and respects it.
  const fetchWithTimeout: typeof fetch = (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(env.GITHUB_TIMEOUT_MS) });

  const octokit = new Octokit({
    auth: activeToken() ?? undefined,
    baseUrl: env.GITHUB_API_BASE_URL,
    userAgent: `arch-verified-fix/${packageJson.version}`,
    request: { fetch: fetchWithTimeout },
  });
  return octokit as unknown as GithubClient;
}

export async function getGithubClient(): Promise<GithubClient> {
  if (testFactory) return testFactory();
  if (cachedClient) return cachedClient;
  cachedClient = await defaultClientFactory();
  return cachedClient;
}

/** Drop the memoised client (after rotating the token, or between tests). */
export function resetGithubClient(): void {
  cachedClient = null;
}

// ---------- errors ----------

type HttpishError = { status?: number; message?: string; response?: { headers?: Record<string, unknown> }; errors?: Array<{ resource?: string; field?: string; code?: string; message?: string }> };

/**
 * Turn an Octokit failure into something an operator can act on. The HTTP status alone is not enough:
 * GitHub answers "token has no access to a private repo" with 404, and "fine-grained PAT missing the
 * Contents permission" with 403 plus a body that mentions required access.
 */
export function mapGithubError(error: unknown, context: { owner?: string; repo?: string; branch?: string } = {}): AppError {
  const err = (error ?? {}) as HttpishError & Error;
  const status = typeof err.status === 'number' ? err.status : undefined;
  const raw = redactGithubSecrets(err.message || String(error));
  const details = { githubStatus: status ?? null, ...(context.owner ? { repository: `${context.owner}/${context.repo ?? '?'}` } : {}), ...(context.branch ? { branch: context.branch } : {}) };
  const lower = raw.toLowerCase();

  const rateLimited = err.response?.headers?.['x-ratelimit-remaining'] === '0' || status === 429 || lower.includes('api rate limit exceeded');
  if (rateLimited) {
    const reset = Number(err.response?.headers?.['x-ratelimit-reset'] ?? 0);
    const retryAfterSeconds = reset > 0 ? Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 1000)) : 60;
    return AppError.rateLimited(`GitHub rate limit reached. Try again in ~${Math.ceil(retryAfterSeconds / 60)} min (or use a higher-rate-limit token).`, {
      ...details,
      retryAfterSeconds,
    });
  }

  if (status === 401) {
    return AppError.unavailable('GitHub rejected GITHUB_TOKEN (401). It is invalid, expired, or was revoked — rotate it and restart ARCH.', { ...details, githubMessage: raw });
  }

  if (status === 403) {
    if (lower.includes('must have admin rights') || lower.includes('resource not accessible by integration')) {
      return AppError.unavailable(
        `GitHub denied this operation (403). The token can see the API but not this resource. Give it Contents: Read and write and Pull requests: Read and write on ${context.owner ?? 'the org'}/${context.repo ?? '*'} (classic PATs need the repo scope).`,
        { ...details, githubMessage: raw },
      );
    }
    return AppError.forbidden(`GitHub token is not allowed to reach ${context.owner ?? ''}${context.repo ? `/${context.repo}` : ''} (403). Check the token's repository access and permissions.`, {
      ...details,
      githubMessage: raw,
    });
  }

  if (status === 404) {
    return AppError.notFound(
      `GitHub has no repository ${context.owner ?? '?'}/${context.repo ?? '?'} for this token (404). Private repos a token cannot see are reported as missing.`,
      { ...details, githubMessage: raw },
    );
  }

  if (status === 422) {
    const fieldErrors = (err.errors ?? []).map((entry) => `${entry.field ?? entry.resource ?? 'field'}: ${entry.code ?? ''} ${entry.message ?? ''}`.trim());
    const hint =
      fieldErrors.some((message) => /already exists/i.test(message)) && context.branch
        ? `Branch ${context.branch} already exists — ARCH reused it when possible; open the PR manually or delete the branch.`
        : fieldErrors.some((message) => /no commits between/i.test(message))
          ? 'The patch produced no difference from the pinned commit, so there is nothing to open a PR against.'
          : undefined;
    return AppError.validation(
      `GitHub rejected the change (422).${hint ? ` ${hint}` : ''}`,
      fieldErrors.length
        ? fieldErrors.map((message) => ({ path: 'github', message }))
        : [{ path: 'github', message: redactGithubSecrets(raw).slice(0, 300) }],
    );
  }

  if (status && status >= 500) {
    return AppError.unavailable(`GitHub returned ${status} — usually transient. ARCH did not open a PR; retry approval.`, { ...details, githubMessage: raw });
  }

  if (/timed out|aborterror|the operation was aborted|fetch failed|enotfound|econnreset/i.test(lower)) {
    return AppError.unavailable(`Could not reach GitHub at ${env.GITHUB_API_BASE_URL} within ${env.GITHUB_TIMEOUT_MS}ms. Nothing was pushed — retry approval.`, details);
  }

  return AppError.unavailable(`GitHub call failed${status ? ` (HTTP ${status})` : ''}: ${raw.slice(0, 200)}`, details);
}

async function githubCall<T>(run: () => Promise<T>, context?: { owner?: string; repo?: string; branch?: string }): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw mapGithubError(error, context);
  }
}

// ---------- config + checks ----------

export type GithubConfigStatus = {
  mode: GithubMode;
  tokenConfigured: boolean;
  /** Masked, e.g. `ghp_…Kx9`. Safe to render. */
  tokenHint: string | null;
  /** Prefix classification. `missing` covers unset and `.env.example` placeholders. */
  tokenKind: GithubTokenKind;
  baseUrl: string;
  timeoutMs: number;
  openAsDraft: boolean;
  maxFiles: number;
  /** Why the mode is what it is — the answer to "why is my PR still mocked?". */
  reason: string;
};

function maskToken(token: string): string {
  if (token.length <= 12) return `${token.slice(0, 3)}…`;
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

function realModeReason(token: string): string {
  const kind = classifyGithubToken(token);
  const kindNote =
    kind === 'unknown'
      ? ' The value does not look like a GitHub token (expected ghp_, github_pat_, gho_, or ghs_) — GitHub will reject it.'
      : kind === 'github-app'
        ? ' This is a GitHub App token. It can open PRs only on repositories the installation can write.'
        : kind === 'fine-grained'
          ? ' Fine-grained PATs do not report classic scopes; Contents and Pull requests must be Read and write on each repo.'
          : '';
  return `GITHUB_TOKEN is set and GITHUB_MODE allows real calls — approving a verified fix pushes a branch and opens a pull request.${kindNote}`;
}

export function describeGithubConfig(): GithubConfigStatus {
  const mode = githubMode();
  const token = activeToken();
  const raw = env.GITHUB_TOKEN?.trim();
  const reason =
    mode === 'real' && token
      ? realModeReason(token)
      : env.GITHUB_MODE === 'mock'
        ? 'GITHUB_MODE="mock" forces offline PRs (tests / air-gapped demo). Set GITHUB_MODE="auto" to go live.'
        : raw && isPlaceholderSecret(raw)
          ? 'GITHUB_TOKEN is still a placeholder from .env.example. Put the real PAT in .env (never in .env.example). PRs stay mocked until then.'
          : 'No GITHUB_TOKEN — PRs are mocked. Approvals are still recorded and audited, but nothing is pushed to GitHub.';
  return {
    mode,
    tokenConfigured: Boolean(token),
    tokenHint: token ? maskToken(token) : null,
    tokenKind: classifyGithubToken(token),
    baseUrl: env.GITHUB_API_BASE_URL,
    timeoutMs: env.GITHUB_TIMEOUT_MS,
    openAsDraft: env.GITHUB_PR_DRAFT,
    maxFiles: MAX_PR_FILES,
    reason,
  };
}

export type GithubTokenCheck = {
  ok: boolean;
  mode: GithubMode;
  actor: string | null;
  actorType: string | null;
  scopes: string[];
  rateLimit: { limit: number; used: number; remaining: number; resetsAt: string | null };
  message: string;
};

/**
 * "Is the token actually usable?" — the check the dashboard button and `ARCH_GITHUB_CHECK=1`
 * scripts need. One cheap authenticated call, plus the identity call that a GitHub App token cannot
 * make. Never throws: a broken token is data, not a 500.
 */
function failedTokenCheck(error: unknown): GithubTokenCheck {
  const mapped = error instanceof AppError ? error : mapGithubError(error);
  return {
    ok: false,
    mode: 'real',
    actor: null,
    actorType: null,
    scopes: [],
    rateLimit: { limit: 0, used: 0, remaining: 0, resetsAt: null },
    message: mapped.message,
  };
}

export async function verifyGithubCredentials(): Promise<GithubTokenCheck> {
  const config = describeGithubConfig();
  if (config.mode === 'mock') {
    return {
      ok: true,
      mode: 'mock',
      actor: null,
      actorType: null,
      scopes: [],
      rateLimit: { limit: 0, used: 0, remaining: 0, resetsAt: null },
      message: config.reason,
    };
  }

  let client: GithubClient;
  try {
    client = await getGithubClient();
  } catch (error) {
    return failedTokenCheck(error);
  }

  // /rate_limit works for classic PATs, fine-grained PATs and GitHub App tokens alike, so it is the
  // "is this credential alive" probe; /user is the nicest-to-read identity but is denied to App tokens.
  // A dead token is data for the dashboard, not an exception — callers used to see a 500 here.
  let rate: { data: GithubRateLimitPayload; headers?: Record<string, unknown> };
  try {
    rate = (await client.rest.rateLimit.get()) as { data: GithubRateLimitPayload; headers?: Record<string, unknown> };
  } catch (error) {
    return failedTokenCheck(error);
  }
  const core = rate.data.resources.core;
  const rateLimit = { limit: core.limit, used: core.used, remaining: core.remaining, resetsAt: new Date(core.reset * 1000).toISOString() };

  let actor: string | null = null;
  let actorType: string | null = null;
  let scopes = readScopes(rate);
  let identityError: string | null = null;
  try {
    const me = await client.rest.users.getAuthenticated();
    actor = me.data.login;
    actorType = me.data.type ?? 'User';
    const identityScopes = readScopes(me as unknown as { headers?: Record<string, string> });
    if (identityScopes.length) scopes = identityScopes;
  } catch (error) {
    const mapped = mapGithubError(error);
    // 401 means the credential itself is rejected. 403 on /user is normal for App tokens.
    if (mapped.status === 401) return failedTokenCheck(mapped);
    identityError = mapped.message;
    actorType = 'Token (identity endpoint not available for this credential type)';
  }

  const kind = classifyGithubToken(activeToken());
  const scopesWarning =
    kind === 'classic' && scopes.length > 0 && !scopes.includes('repo') && !scopes.includes('public_repo')
      ? ' Warning: this classic PAT lacks the `repo` scope, so pushing to private repos will fail.'
      : kind === 'unknown'
        ? ' Warning: the token prefix is not one GitHub documents, so treat a later 401 as "wrong credential", not a GitHub outage.'
        : '';

  return {
    ok: true,
    mode: 'real',
    actor,
    actorType,
    scopes,
    rateLimit,
    message:
      `GitHub token is live${actor ? ` (authenticated as ${actor})` : ''}${kind !== 'missing' ? ` [${kind}]` : ''}. ` +
      `${rateLimit.remaining}/${rateLimit.limit} API calls left this hour.` +
      scopesWarning +
      (identityError ? ' (Identity lookup was refused; that is normal for GitHub App tokens. Use the repo check to confirm push access.)' : ''),
  };
}

function readScopes(response: unknown): string[] {
  const headers = (response as { headers?: Record<string, unknown> })?.headers ?? {};
  const header = headers['x-oauth-scopes'] ?? headers['X-OAuth-Scopes'];
  if (typeof header !== 'string' || !header.trim()) return [];
  return header
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export type RepoCheckResult = {
  ok: true;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  archived: boolean;
  canPush: boolean;
  canPull: boolean;
  /** False when GitHub did not send a `permissions` block — then canPush/canPull mean nothing. */
  permissionsKnown: boolean;
  /** Resolved full SHA of the commit ARCH would branch from. */
  baseSha: string;
  baseRef: string;
  headSha: string;
  commitMessage: string | null;
  message: string;
};

/**
 * Validate a repo (and optionally a commit) against GitHub before we store it. M1 previously accepted
 * any 7-40 hex string, so a typo'd pin surfaced three milestones later as a broken PR.
 */
export async function checkRepoAccess(params: { owner: string; repo: string; commitSha?: string | null; defaultBranch?: string | null }): Promise<RepoCheckResult> {
  const client = await getGithubClient();
  const context = { owner: params.owner, repo: params.repo };

  const repoInfo = await githubCall(() => client.rest.repos.get({ owner: params.owner, repo: params.repo }), context);
  const data = repoInfo.data;
  if (!data || typeof data.full_name !== 'string') {
    throw AppError.unavailable(`GitHub returned an unexpected response for ${params.owner}/${params.repo}.`, context);
  }

  const branch = params.defaultBranch?.trim() || data.default_branch;
  const head = await client.rest
    .repos.getBranch({ owner: params.owner, repo: params.repo, branch })
    .catch((error: unknown) => {
      // The repo exists (we just read it), so a 404 here is about the branch — say that instead.
      if ((error as { status?: number })?.status === 404) {
        throw AppError.notFound(
          `Branch "${branch}" does not exist in ${data.full_name}. Its default branch is "${data.default_branch}".`,
          { branch, defaultBranch: data.default_branch },
        );
      }
      throw mapGithubError(error, context);
    });

  let baseSha = head.data.commit.sha;
  let commitMessage: string | null = null;
  let baseRef = branch;

  const pinned = params.commitSha;
  if (pinned) {
    const commit = await githubCall(() => client.rest.repos.getCommit({ owner: params.owner, repo: params.repo, ref: pinned }), context);
    baseSha = commit.data.sha;
    commitMessage = commit.data.commit?.message?.split('\n')[0] ?? null;
    baseRef = pinned;
  }

  const canPush = Boolean(data.permissions?.push);
  const canPull = Boolean(data.permissions?.pull ?? true);
  const warnings = [
    data.archived ? `Repository ${data.full_name} is archived — GitHub normally refuses pushes.` : null,
    // permissions are omitted for some App tokens. "push: false" only means something when GitHub sent the block.
    data.permissions !== undefined && !canPush
      ? 'The token can read but not write this repository, so PR creation will fail (needs Contents: Read and write).'
      : null,
  ].filter(Boolean) as string[];

  return {
    ok: true,
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    isPrivate: Boolean(data.private),
    archived: Boolean(data.archived),
    canPush,
    canPull,
    permissionsKnown: data.permissions !== undefined,
    baseSha,
    baseRef,
    headSha: head.data.commit.sha,
    commitMessage,
    message:
      `Access to ${data.full_name} confirmed (branch ${branch} @ ${head.data.commit.sha.slice(0, 12)}${params.commitSha ? `, pinned ${baseSha.slice(0, 12)}` : ''}).` +
      (warnings.length ? ` ${warnings.join(' ')}` : ''),
  };
}

/** Resolve a short/long SHA to a full SHA at which a PR would be based. */
export async function resolveCommitSha(params: { owner: string; repo: string; ref: string }): Promise<{ sha: string; message: string | null }> {
  const client = await getGithubClient();
  const commit = await githubCall(
    () => client.rest.repos.getCommit({ owner: params.owner, repo: params.repo, ref: params.ref }),
    { owner: params.owner, repo: params.repo },
  );
  return { sha: commit.data.sha, message: commit.data.commit?.message?.split('\n')[0] ?? null };
}

// ---------- branch + body ----------

function slugify(text: string, maxLen = 40): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
}

/**
 * The PR title is already `Fix: <incident>` (verifiedFix builds it), so a blind `fix(arch): ` prefix
 * produced `fix(arch): Fix: Payment timeout`. Keep one subject line under git's soft 72-char limit.
 */
export function commitSubjectTitle(title: string): string {
  const cleaned = title
    .replace(/^(fix|fix\(arch\)|chore|refactor|hotfix):\s*/i, '')
    .replace(/^Fix:\s*/i, '')
    .trim();
  const subject = `fix(arch): ${cleaned || 'verified fix'}`;
  return subject.length <= 72 ? subject : `${subject.slice(0, 68)}…`;
}

export function buildBranchName(title: string): string {
  const slug = slugify(title, 30) || 'incident';
  return `arch/fix-${slug}-${randomUUID().slice(0, 6)}`;
}

function buildPrBody(params: {
  body?: string | null;
  incidentId: string;
  fullName: string;
  baseRef: string;
  baseSha: string | null;
  commitSha: string | null;
  branch: string;
  files: string[];
  verificationId?: string | null;
  mode: GithubMode;
  patch: string;
}): string {
  const truncatedPatch = params.patch.length > 4000 ? `${params.patch.slice(0, 4000)}\n... (truncated)` : params.patch;
  const pinned = params.baseSha ? `\`${params.baseSha.slice(0, 12)}\`` : 'branch head';
  const header = params.body?.trim() ? `${params.body.trim()}\n\n---\n\n` : '';
  const evidence = params.verificationId ? `\n**Verification:** \`${params.verificationId}\`\n` : '';
  return (
    `${header}## ARCH Verified Fix\n\n` +
    `**Incident:** \`${params.incidentId}\`${evidence}` +
    `**Tested against:** ${params.fullName} @ ${pinned} (branch \`${params.baseRef}\`)\n` +
    `**ARCH branch:** \`${params.branch}\`\n` +
    `**Files touched:** ${params.files.length > 0 ? params.files.map((file) => `\`${file}\``).join(', ') : 'none'}\n\n` +
    `This fix was generated by ARCH, run in an isolated sandbox (no prod credentials), tested against the ` +
    `pinned commit above, and approved by a human before this PR was opened.\n\n` +
    `<details><summary>Patch</summary>\n\n\`\`\`diff\n${truncatedPatch}\n\`\`\`\n</details>\n` +
    (params.mode === 'mock' ? `\n> Offline mode: this PR was **not** created on GitHub.\n` : '')
  );
}

// ---------- content helpers ----------

function decodeContent(payload: unknown): string | null {
  const file = payload as { content?: string; encoding?: string; type?: string; size?: number } | null;
  if (!file || typeof file.content !== 'string') return null;
  return Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

function isNotFound(error: unknown): boolean {
  return (error as { status?: number })?.status === 404;
}

function fileAlreadyExists(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status !== 409 && status !== 422) return false;
  return /already exists/i.test(String((error as { message?: string })?.message ?? ''));
}

/** createRef 422 is only retryable when GitHub is saying the branch name is taken. */
function refAlreadyExists(error: unknown): boolean {
  if (!(error instanceof AppError) || error.status !== 422) return false;
  const detail = `${error.message} ${(error.issues ?? []).map((issue) => issue.message).join(' ')}`;
  return /already exists/i.test(detail);
}

type PreparedFile = { path: string; changeType: FileChangeTypeish; content: string; patch: FilePatch; originalBytes: number };
type FileChangeTypeish = 'create' | 'update' | 'delete';

/**
 * Read every file the patch touches at `baseSha` and apply it. Returns the full new contents, which is
 * what the blob API wants. Throws AppError when a hunk does not fit — no PR is opened in that case.
 */
async function buildFileChanges(client: GithubClient, params: { owner: string; repo: string; baseSha: string; patches: FilePatch[] }): Promise<PreparedFile[]> {
  if (params.patches.length === 0) return [];
  if (params.patches.length > MAX_PR_FILES) {
    throw AppError.badRequest(
      `Patch touches ${params.patches.length} files; ARCH opens PRs for at most ${MAX_PR_FILES}. Split the fix or open the PR by hand.`,
      { files: params.patches.slice(0, 25).map((patch) => patch.path) },
    );
  }

  const prepared: PreparedFile[] = [];
  for (const patch of params.patches) {
    let original = '';
    let exists = false;
    try {
      const response = await githubCall(
        () => client.rest.repos.getContent({ owner: params.owner, repo: params.repo, path: patch.path, ref: params.baseSha }),
        { owner: params.owner, repo: params.repo },
      );
      original = decodeContent(response.data) ?? '';
      exists = true;
    } catch (error) {
      if (!isNotFound(error) && !fileAlreadyExists(error)) throw mapGithubError(error, { owner: params.owner, repo: params.repo });
    }

    if (patch.changeType === 'create' && exists) {
      throw AppError.conflict(
        `Patch says "${patch.path}" is a new file but it already exists at ${params.baseSha.slice(0, 12)} — the pin drifted. Regenerate the fix.`,
        { path: patch.path },
      );
    }
    if (patch.changeType === 'delete' && !exists) {
      throw AppError.conflict(`Patch deletes "${patch.path}" but that file does not exist at ${params.baseSha.slice(0, 12)}.`, { path: patch.path });
    }
    if (patch.changeType !== 'delete' && exists && Buffer.byteLength(original, 'utf8') > MAX_PR_FILE_BYTES) {
      throw AppError.badRequest(`"${patch.path}" is too large for ARCH to rewrite (${Buffer.byteLength(original)} bytes, max ${MAX_PR_FILE_BYTES}).`, { path: patch.path });
    }

    const applied = applyFilePatch(original, patch);
    if (!applied.ok) {
      throw AppError.conflict(
        `Patch does not apply cleanly to ${params.repo} @ ${params.baseSha.slice(0, 12)} — ${applied.reason}. Nothing was pushed; re-run the fix so it is regenerated against the current commit.`,
        { path: patch.path, verificationHint: 'The pinned commit is probably older than the patch. Pin again or update the base branch.' },
      );
    }
    if (patch.changeType !== 'delete' && Buffer.byteLength(applied.content, 'utf8') > MAX_PR_FILE_BYTES) {
      throw AppError.badRequest(`Resulting file "${patch.path}" is too large (${Buffer.byteLength(applied.content)} bytes, max ${MAX_PR_FILE_BYTES}).`, { path: patch.path });
    }

    prepared.push({ path: patch.path, changeType: patch.changeType, content: applied.content, patch, originalBytes: Buffer.byteLength(original, 'utf8') });
  }
  return prepared;
}

// ---------- PR creation ----------

/**
 * Open the PR for an approved, sandbox-verified patch.
 * Mock mode never touches the network; real mode throws rather than pretending.
 */
export async function createPullRequest(params: CreatePrParams): Promise<CreatePrResult> {
  const branch = buildBranchName(params.title);

  if (githubMode() === 'mock') {
    const body = buildPrBody({
      body: params.body,
      incidentId: params.incidentId,
      fullName: params.fullName,
      baseRef: params.commitSha ? params.commitSha.slice(0, 12) : params.baseBranch,
      baseSha: params.commitSha ?? null,
      commitSha: params.commitSha ?? null,
      branch,
      files: parseUnifiedDiff(params.patch).map((patch) => patch.path),
      verificationId: params.verificationId,
      mode: 'mock',
      patch: params.patch,
    });
    console.info(`[ARCH] GitHub mock mode — PR not created for ${params.fullName}@${params.commitSha ?? params.baseBranch} (branch would be ${branch})`);
    return {
      mode: 'mock',
      mocked: true,
      branch,
      externalUrl: null,
      prNumber: null,
      title: params.title,
      body,
      commitSha: params.commitSha ?? null,
      baseSha: params.commitSha ?? null,
      files: parseUnifiedDiff(params.patch).map((patch) => patch.path),
      draft: false,
    };
  }

  const client = await getGithubClient();
  const context = { owner: params.repoOwner, repo: params.repoName, branch };
  const patches = parseUnifiedDiff(params.patch);
  if (patches.length === 0) {
    throw AppError.badRequest(
      looksLikeUnifiedDiff(params.patch)
        ? 'The patch could not be parsed into file changes (no recognizable diff headers). Nothing was pushed to GitHub.'
        : 'The verified fix is not a unified diff, so ARCH cannot turn it into file changes. Nothing was pushed to GitHub.',
      { patchPreview: params.patch.slice(0, 200) },
    );
  }

  // 1. base — pinned commit wins (that is what the sandbox actually tested), else the branch head.
  const pinnedSha = params.commitSha;
  const baseRef = pinnedSha || params.baseBranch;
  const baseSha = pinnedSha
    ? (await githubCall(() => client.rest.repos.getCommit({ owner: params.repoOwner, repo: params.repoName, ref: pinnedSha }), context)).data.sha
    : (await githubCall(() => client.rest.repos.getBranch({ owner: params.repoOwner, repo: params.repoName, branch: params.baseBranch }), context)).data.commit.sha;

  // 2. read + apply
  const files = await buildFileChanges(client, { owner: params.repoOwner, repo: params.repoName, baseSha, patches });

  // 3. blobs → tree → commit
  const { data: baseCommit } = await githubCall(() => client.rest.git.getCommit({ owner: params.repoOwner, repo: params.repoName, commit_sha: baseSha }), context);
  const entries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string | null }> = [];
  for (const file of files) {
    if (file.changeType === 'delete') {
      entries.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
      continue;
    }
    const blob = await githubCall(
      () => client.rest.git.createBlob({ owner: params.repoOwner, repo: params.repoName, content: file.content, encoding: 'utf-8' }),
      context,
    );
    entries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.data.sha });
  }

  const tree = await githubCall(
    () => client.rest.git.createTree({ owner: params.repoOwner, repo: params.repoName, base_tree: baseCommit.tree.sha, tree: entries }),
    context,
  );

  const commitBody =
    `Verified in isolated sandbox against ${params.fullName}@${baseSha.slice(0, 12)}.\n` +
    `Incident: ${params.incidentId}\n` +
    `Branch: ${branch}\n\n` +
    `Co-authored-by: ARCH <arch@localhost>`;

  // commitSubjectTitle already applies the single `fix(arch):` prefix. Adding it again produced
  // `fix(arch): fix(arch): …` on every real commit.
  const message = `${commitSubjectTitle(params.title)}\n\n${commitBody}`;
  const commit = await githubCall(
    () => client.rest.git.createCommit({ owner: params.repoOwner, repo: params.repoName, message, tree: tree.data.sha, parents: [baseSha] }),
    context,
  );
  const headSha = commit.data.sha;

  // 4. branch — a leftover arch/fix-* from a failed attempt is reused, never silently orphaned.
  try {
    await githubCall(() => client.rest.git.createRef({ owner: params.repoOwner, repo: params.repoName, ref: `refs/heads/${branch}`, sha: headSha }), context);
  } catch (error) {
    // Only a leftover ref is retried. Other 422s (bad SHA, empty commit) must not force-update a branch.
    if (!refAlreadyExists(error)) throw error;
    await githubCall(() => client.rest.git.updateRef({ owner: params.repoOwner, repo: params.repoName, ref: `refs/heads/${branch}`, sha: headSha, force: true }), context);
  }

  // 5. PR
  const body = buildPrBody({
    body: params.body,
    incidentId: params.incidentId,
    fullName: params.fullName,
    baseRef,
    baseSha,
    commitSha: headSha,
    branch,
    files: files.map((file) => file.path),
    verificationId: params.verificationId,
    mode: 'real',
    patch: params.patch,
  });

  const pr = await githubCall(
    () =>
      client.rest.pulls.create({
        owner: params.repoOwner,
        repo: params.repoName,
        title: params.title.slice(0, 256),
        body,
        head: branch,
        base: params.baseBranch,
        draft: env.GITHUB_PR_DRAFT,
      }),
    context,
  );

  console.info(`[ARCH] GitHub PR #${pr.data.number} opened on ${params.fullName} (${branch} → ${params.baseBranch}, base ${baseSha.slice(0, 12)})`);

  return {
    mode: 'real',
    mocked: false,
    branch,
    externalUrl: pr.data.html_url,
    prNumber: pr.data.number,
    title: params.title,
    body,
    commitSha: headSha,
    baseSha,
    files: files.map((file) => file.path),
    draft: Boolean(pr.data.draft),
  };
}

/**
 * Read + apply only: resolves the base, reads each touched file at that commit and applies the hunks,
 * then reports what would be pushed — without creating a ref, a commit or a PR. This is what
 * `npm run github:check -- --preview-patch fix.patch` uses, and it is the safest way to find out that
 * a patch no longer fits the pinned commit before a human sits down to approve it.
 */
export async function previewPullRequest(params: {
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  commitSha?: string | null;
  patch: string;
}): Promise<{
  baseSha: string;
  baseRef: string;
  files: Array<{ path: string; changeType: FileChangeTypeish; bytes: number; oldBytes: number; preview: string }>;
}> {
  if (githubMode() !== 'real') {
    throw AppError.badRequest('Previewing needs a live GITHUB_TOKEN (GITHUB_MODE is offline), because the file contents come from GitHub.');
  }
  const client = await getGithubClient();
  const patches = parseUnifiedDiff(params.patch);
  if (patches.length === 0) throw AppError.badRequest('No unified diff found in the patch.', { patchPreview: params.patch.slice(0, 200) });

  const pinnedSha = params.commitSha;
  const baseRef = pinnedSha || params.baseBranch;
  const baseSha = pinnedSha
    ? (await githubCall(() => client.rest.repos.getCommit({ owner: params.repoOwner, repo: params.repoName, ref: pinnedSha }), { owner: params.repoOwner, repo: params.repoName })).data.sha
    : (await githubCall(() => client.rest.repos.getBranch({ owner: params.repoOwner, repo: params.repoName, branch: params.baseBranch }), { owner: params.repoOwner, repo: params.repoName })).data.commit.sha;

  const prepared = await buildFileChanges(client, { owner: params.repoOwner, repo: params.repoName, baseSha, patches });
  return {
    baseSha,
    baseRef,
    files: prepared.map((file) => ({
      path: file.path,
      changeType: file.changeType,
      bytes: Buffer.byteLength(file.content, 'utf8'),
      oldBytes: file.originalBytes,
      preview: file.content.split('\n').slice(0, 12).join('\n'),
    })),
  };
}

export type PullRequestState = {
  number: number;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  draft: boolean;
  url: string;
  headSha: string | null;
  mergedAt: string | null;
};

/** Re-read a PR ARCH opened, so the dashboard stops claiming it is open after it was merged. */
export async function fetchPullRequestState(params: { owner: string; repo: string; prNumber: number }): Promise<PullRequestState> {
  const client = await getGithubClient();
  const response = await githubCall(
    () => client.rest.pulls.get({ owner: params.owner, repo: params.repo, pull_number: params.prNumber }),
    { owner: params.owner, repo: params.repo },
  );
  const data = response.data;
  const state: PullRequestState['state'] = data.merged || data.merged_at ? 'MERGED' : data.state === 'closed' ? 'CLOSED' : 'OPEN';
  return {
    number: data.number,
    state,
    draft: Boolean(data.draft),
    url: data.html_url,
    headSha: data.head?.sha ?? null,
    mergedAt: data.merged_at ?? null,
  };
}

/** Pull the PR number out of a stored external URL (no schema column for it — the URL is the source). */
export function prNumberFromUrl(externalUrl: string | null | undefined): number | null {
  if (!externalUrl) return null;
  const match = /\/pull\/(\d+)/.exec(externalUrl);
  return match ? Number(match[1]) : null;
}

export const _testing = {
  setClientFactory(factory: ClientFactory | null): void {
    testFactory = factory;
    cachedClient = null;
  },
  reset(): void {
    testFactory = null;
    cachedClient = null;
  },
  buildPrBody,
};
