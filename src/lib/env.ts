import { z } from 'zod';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  // Hosting/CI secret-manager variables win over a local .env, never the other way around.
  dotenv.config();
}

/**
 * Environment contract. Everything the server reads at runtime is validated here once, so a
 * misconfigured deployment fails immediately with a readable message instead of a random 500.
 */

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : !['false', '0', 'no', ''].includes(value.toLowerCase())));

/** "" and unset must mean the same thing, otherwise a blank line in .env silently "configures" a secret. */
function optionalTrimmed() {
  return z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined);
}

/**
 * Values people copy from `.env.example` and forget to replace. A placeholder must never count as
 * a configured credential — that used to flip GitHub into "real" mode and fail at approve time.
 */
export function isPlaceholderSecret(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return /replace-with|change-?me|placeholder|xxxx+|\{\{|\$\{/i.test(trimmed);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see .env.example)'),

  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  AUTH_SECRET_WEBHOOK: z.string().min(16, 'AUTH_SECRET_WEBHOOK must be at least 16 characters'),
  APP_URL: z.url().default('http://localhost:3000'),
  AUTH_GITHUB_ID: optionalTrimmed(),
  AUTH_GITHUB_SECRET: optionalTrimmed(),

  WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),

  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('ARCH <notifications@localhost>'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ERROR_TRACKING_DSN: z.string().optional(),

  // ---- ARCH Copilot (V2, see AGENTS-V2.md) + ARCH Model (V3, see docs/engineering/ARCH-MODEL.md) ----
  // "arch"  ARCH's own model, trained on your incidents. CPU only, no network. (default)
  // "mock"  canned drafts for tests/CI. Anything else (openai, anthropic, ollama, arch-hybrid)
  //         fails at boot: ARCH has no external AI adapter and no second model to fall back to.
  AI_PROVIDER: z.enum(['arch', 'mock']).default('arch'),
  // Privacy lock: when on (default), public URL fetching for knowledge ingestion is disabled.
  // External AI vendors no longer exist in ARCH at all — this flag guards the remaining
  // outbound surface (fetching a document from the public internet to index it).
  ARCH_OFFLINE_ONLY: booleanish.default(true),
  // Where `npm run model:fetch-public` stores downloaded public postmortems (git-ignored).
  ARCH_MODEL_DATA_DIR: z.string().default('model-data'),
  // The worker retrains an organization's model when it has new resolved incidents. 0 = never.
  ARCH_MODEL_RETRAIN_MINUTES: z.coerce.number().int().min(0).max(10_080).default(60),
  // No AI_API_KEY / AI_MODEL: ARCH never talks to a vendor, so there is no key and no remote
  // model name to configure. The model is this repository's own engine (see docs/engineering/ARCH-MODEL.md).
  AI_MAX_TOKENS: z.coerce.number().int().min(64).max(8000).default(1000),
  AI_TIMEOUT_MS: z.coerce.number().int().min(50).max(120_000).default(15_000),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(20),

  // ---- ARCH Agent (src/server/ai/agent): planner + native tools + Python self-correction ----
  // Directory the agent's list/read tools are confined to. Must never contain secrets.
  ARCH_AGENT_WORKDIR: z.string().min(1).default('model-data'),
  // Self-correction loop: how often a failed .py script is sent back with its exact error.
  ARCH_AGENT_MAX_FIX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),

  FEATURE_STATUS_PAGES: booleanish.default(true),
  FEATURE_SLACK_NOTIFICATIONS: booleanish.default(false),

  // ---- V4 Verified Fix Loop (M1-M5) ----
  // GitHub PAT used to push ARCH branches and open pull requests. Empty string counts as unset.
  GITHUB_TOKEN: optionalTrimmed(),
  // "auto"  real PRs when GITHUB_TOKEN is set, mocked PRs when it is not (default).
  // "mock"  always offline — no network at all (tests, CI, air-gapped demos).
  // "real"  always call GitHub and fail loudly if the token is missing or broken.
  // Deliberately independent of ARCH_OFFLINE_ONLY: that flag is the *AI* privacy lock (which model
  // may see incident data). Opening a PR is an explicit, human-approved action, so it does not
  // require letting an external LLM vendor read your incidents.
  GITHUB_MODE: z.enum(['auto', 'real', 'mock']).default('auto'),
  // GitHub Enterprise Server: point at https://ghe.example.com/api/v3. Never plain http in production.
  GITHUB_API_BASE_URL: z.string().url().default('https://api.github.com'),
  // Per-request deadline for every GitHub API call (branches, blobs, PR creation).
  GITHUB_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(20_000),
  // ARCH PRs start as drafts: a human has to mark them ready before a reviewer is pinged.
  GITHUB_PR_DRAFT: booleanish.default(true),
  SANDBOX_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300_000).default(30_000),
  SANDBOX_MAX_OUTPUT_CHARS: z.coerce.number().int().min(1000).max(200_000).default(20_000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${details.join('\n')}\n\nCopy .env.example to .env and fill it in.`);
  }

  const value = parsed.data;

  if (value.NODE_ENV === 'production') {
    if (value.AUTH_SECRET === value.AUTH_SECRET_WEBHOOK) {
      throw new Error('AUTH_SECRET and AUTH_SECRET_WEBHOOK must be different secrets.');
    }
    if (isPlaceholderSecret(value.AUTH_SECRET) || isPlaceholderSecret(value.AUTH_SECRET_WEBHOOK)) {
      throw new Error('Refusing to start in production with placeholder secrets.');
    }
    if (Boolean(value.AUTH_GITHUB_ID) !== Boolean(value.AUTH_GITHUB_SECRET)) {
      throw new Error('GitHub sign-in needs both AUTH_GITHUB_ID and AUTH_GITHUB_SECRET in production.');
    }
    // A placeholder PAT would make every "Approve" fail mid-flight, after the human already clicked.
    if (isPlaceholderSecret(value.GITHUB_TOKEN)) {
      throw new Error('Refusing to start in production with a placeholder GITHUB_TOKEN.');
    }
    if (!value.GITHUB_API_BASE_URL.startsWith('https://')) {
      throw new Error('GITHUB_API_BASE_URL must be https:// in production (a PAT over plain http leaks the token).');
    }
  }

  if (isPlaceholderSecret(value.AUTH_GITHUB_ID) || isPlaceholderSecret(value.AUTH_GITHUB_SECRET)) {
    throw new Error('GitHub OAuth credentials must not be placeholders. Leave both blank to disable sign-in.');
  }

  // "real" is a promise that PRs are actually opened; fail at boot instead of at approval time.
  if (value.GITHUB_MODE === 'real' && (!value.GITHUB_TOKEN || isPlaceholderSecret(value.GITHUB_TOKEN))) {
    throw new Error('GITHUB_MODE="real" needs a real GITHUB_TOKEN, not a placeholder. Set a GitHub PAT or use GITHUB_MODE="auto"/"mock".');
  }

  return value;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';
