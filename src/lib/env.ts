import { z } from 'zod';

/**
 * Environment contract. Everything the server reads at runtime is validated here once, so a
 * misconfigured deployment fails immediately with a readable message instead of a random 500.
 */

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : !['false', '0', 'no', ''].includes(value.toLowerCase())));

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

  // ---- ARCH Copilot (V2, see AGENTS-V2.md) ----
  // "mock" returns canned, context-derived drafts so dev and tests never need a real key.
  AI_PROVIDER: z.enum(['mock', 'openai', 'anthropic']).default('mock'),
  AI_API_KEY: z.string().optional(),
  // Ignored by "mock". Empty = provider default (gpt-4o-mini for OpenAI, claude-haiku-4-5 for Anthropic).
  AI_MODEL: z.string().optional(),
  AI_MAX_TOKENS: z.coerce.number().int().min(64).max(8000).default(1000),
  AI_TIMEOUT_MS: z.coerce.number().int().min(50).max(120_000).default(15_000),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(20),

  FEATURE_STATUS_PAGES: booleanish.default(true),
  FEATURE_SLACK_NOTIFICATIONS: booleanish.default(false),
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
  }

  return value;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';
