import { env } from '@/lib/env';
import { createAnthropicProvider } from './anthropic';
import { createMockProvider } from './mock';
import { createOpenAiProvider } from './openai';

/**
 * ARCH Copilot — provider adapter (AGENTS-V2.md "Copilot architecture").
 *
 * Every model vendor hides behind the same tiny interface so the rest of ARCH never knows which
 * one is in use. The adapter only moves text: redaction, size limits, timeouts, retries and output
 * validation live in `guardrails.ts`, and prompt wording lives in `prompts.ts` — nowhere else.
 */

/** What the draft is for. Lets the mock provider return a matching canned shape. */
export type CopilotTask = 'summary' | 'triage' | 'status_update' | 'postmortem';

export type GenerateOptions = {
  task: CopilotTask;
  maxTokens: number;
  /** Aborted by the guardrails when the per-attempt timeout elapses. */
  signal: AbortSignal;
};

export type GenerateResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

export interface AiProvider {
  readonly name: 'mock' | 'openai' | 'anthropic' | (string & {});
  readonly model: string;
  generate(system: string, user: string, options: GenerateOptions): Promise<GenerateResult>;
}

/** Raised by adapters. Never carries the API key or the prompt. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export const DEFAULT_MODELS = {
  mock: 'mock-copilot-1',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
} as const;

export type CopilotConfig = {
  enabled: boolean;
  provider: string;
  model: string;
  /** Human-readable reason when `enabled` is false. */
  reason?: string;
};

let override: AiProvider | null = null;

/** Tests swap in slow/failing/spying providers. Pass `null` to restore the env-configured one. */
export function setAiProviderForTesting(provider: AiProvider | null): void {
  override = provider;
}

export function copilotConfig(): CopilotConfig {
  if (override) return { enabled: true, provider: override.name, model: override.model };
  const provider = env.AI_PROVIDER;
  // The mock ignores AI_MODEL so switching AI_PROVIDER back to "mock" never shows a vendor model name.
  const model = provider === 'mock' ? DEFAULT_MODELS.mock : env.AI_MODEL?.trim() || DEFAULT_MODELS[provider];
  if (provider !== 'mock' && !env.AI_API_KEY?.trim()) {
    return { enabled: false, provider, model, reason: `AI_PROVIDER is "${provider}" but AI_API_KEY is empty.` };
  }
  return { enabled: true, provider, model };
}

export function getAiProvider(): AiProvider {
  if (override) return override;
  const config = copilotConfig();
  if (!config.enabled) {
    throw new AiProviderError(config.reason ?? 'ARCH Copilot is not configured.', { retryable: false });
  }
  const apiKey = env.AI_API_KEY ?? '';
  switch (env.AI_PROVIDER) {
    case 'openai':
      return createOpenAiProvider({ apiKey, model: config.model });
    case 'anthropic':
      return createAnthropicProvider({ apiKey, model: config.model });
    case 'mock':
    default:
      return createMockProvider();
  }
}

/** Rough token estimate for providers that do not report usage (the mock). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
