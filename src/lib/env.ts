import { z } from 'zod';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ override: true });
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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see .env.example)'),

  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  AUTH_SECRET_WEBHOOK: z.string().min(16, 'AUTH_SECRET_WEBHOOK must be at least 16 characters'),
  APP_URL: z.string().default('http://localhost:3000'),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),

  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('ARCH <notifications@localhost>'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ERROR_TRACKING_DSN: z.string().optional(),

  // ---- ARCH Copilot (V2, see AGENTS-V2.md) + ARCH Model (V3, see docs/engineering/ARCH-MODEL.md) ----
  // "arch"        ARCH's own model, trained on your incidents. CPU only, no network. (default)
  // "arch-hybrid" a local open-weights LLM (Ollama / llama.cpp) grounded by the ARCH model, with
  //               the ARCH model as automatic fallback. Still no external API.
  // "mock"        canned drafts for tests. "openai" / "anthropic" are external vendors and are
  //               refused while ARCH_OFFLINE_ONLY is true.
  AI_PROVIDER: z.enum(['arch', 'arch-hybrid', 'mock', 'openai', 'anthropic']).default('arch'),
  // Privacy lock: refuse external AI vendors and non-private LLM URLs. Keep this on.
  ARCH_OFFLINE_ONLY: booleanish.default(true),
  LOCAL_LLM_URL: z.string().url().default('http://127.0.0.1:11434'),
  LOCAL_LLM_API: z.enum(['ollama', 'openai']).default('ollama'),
  LOCAL_LLM_MODEL: z.string().min(1).default('qwen2.5-coder:7b'),
  // CPU inference is slow; the ARCH model answers instead if the LLM misses this deadline.
  LOCAL_LLM_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(90_000),
  LOCAL_LLM_CONTEXT: z.coerce.number().int().min(2048).max(131_072).default(8192),
  // Where `npm run model:fetch-public` stores downloaded public postmortems (git-ignored).
  ARCH_MODEL_DATA_DIR: z.string().default('model-data'),
  // The worker retrains an organization's model when it has new resolved incidents. 0 = never.
  ARCH_MODEL_RETRAIN_MINUTES: z.coerce.number().int().min(0).max(10_080).default(60),
  AI_API_KEY: z.string().optional(),
  // Ignored by "mock". Empty = provider default (gpt-4o-mini for OpenAI, claude-haiku-4-5 for Anthropic).
  AI_MODEL: z.string().optional(),
  AI_MAX_TOKENS: z.coerce.number().int().min(64).max(8000).default(1000),
  AI_TIMEOUT_MS: z.coerce.number().int().min(50).max(120_000).default(15_000),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(20),

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
    if (value.AUTH_SECRET.startsWith('replace-with')) {
      throw new Error('Refusing to start in production with placeholder secrets.');
    }
    // A placeholder PAT would make every "Approve" fail mid-flight, after the human already clicked.
    if (value.GITHUB_TOKEN?.startsWith('replace-with')) {
      throw new Error('Refusing to start in production with a placeholder GITHUB_TOKEN.');
    }
    if (!value.GITHUB_API_BASE_URL.startsWith('https://')) {
      throw new Error('GITHUB_API_BASE_URL must be https:// in production (a PAT over plain http leaks the token).');
    }
  }

  // "real" is a promise that PRs are actually opened; fail at boot instead of at approval time.
  if (value.GITHUB_MODE === 'real' && !value.GITHUB_TOKEN) {
    throw new Error('GITHUB_MODE="real" needs GITHUB_TOKEN. Set a GitHub PAT or use GITHUB_MODE="auto"/"mock".');
  }

  return value;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';
