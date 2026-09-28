import { env } from '@/lib/env';
import { createArchNativeProvider } from './arch-native';
import { createMockProvider } from './mock';

/**
 * ARCH Copilot — provider adapter (AGENTS-V2.md "Copilot architecture").
 *
 * ARCH ships exactly two engines and nothing else:
 *   - `arch`   ARCH's own native model — deterministic, CPU-only, no network, no vendor.
 *   - `mock`   canned drafts for tests and CI (never a real model call).
 *
 * There is no OpenAI/Anthropic adapter, no Ollama/local-LLM client and no hybrid mode: the
 * product is end-to-end self-contained (own engine, own license, own prompts). The adapter only
 * moves text — redaction, size limits, timeouts, retries and output validation live in
 * `guardrails.ts`, and prompt wording lives in `prompts.ts` — nowhere else.
 */

/** What the draft is for. Lets the mock / native providers return a matching shape. */
export type CopilotTask = 'summary' | 'triage' | 'status_update' | 'postmortem' | 'code_fix' | 'verified_fix' | 'code_review';

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
  readonly name: 'arch' | 'mock' | (string & {});
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
  arch: 'arch-native-1',
  mock: 'mock-copilot-1',
} as const;

/** Providers that never send data off the server ARCH runs on — today, all of them. */
const ON_PREMISE = new Set(['arch', 'mock']);

export type CopilotConfig = {
  enabled: boolean;
  provider: string;
  model: string;
  /** True when incident data never leaves infrastructure you control. */
  onPremise: boolean;
  /** Human-readable reason when `enabled` is false. */
  reason?: string;
};

let override: AiProvider | null = null;

/** Tests swap in slow/failing/spying providers. Pass `null` to restore the env-configured one. */
export function setAiProviderForTesting(provider: AiProvider | null): void {
  override = provider;
}

export function copilotConfig(): CopilotConfig {
  if (override) return { enabled: true, provider: override.name, model: override.model, onPremise: ON_PREMISE.has(override.name) };
  // AI_PROVIDER only accepts "arch" / "mock" (validated in lib/env), so this can never resolve to
  // an external vendor — there is no vendor code path left in the binary.
  if (env.AI_PROVIDER === 'mock') return { enabled: true, provider: 'mock', model: DEFAULT_MODELS.mock, onPremise: true };
  return { enabled: true, provider: 'arch', model: DEFAULT_MODELS.arch, onPremise: true };
}

export function getAiProvider(): AiProvider {
  if (override) return override;
  return copilotConfig().provider === 'mock' ? createMockProvider() : createArchNativeProvider();
}

/** Per-attempt deadline for one generation attempt. */
export function copilotTimeoutMs(): number {
  return env.AI_TIMEOUT_MS;
}

/** Rough token estimate for providers that do not report usage (the mock). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
