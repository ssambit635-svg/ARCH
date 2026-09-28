import { env } from '@/lib/env';
import { createAnthropicProvider } from './anthropic';
import { createArchNativeProvider, createHybridProvider } from './arch-native';
import { createLocalLlmProvider, isLocalEndpoint, type LocalLlmConfig } from './local-llm';
import { createMockProvider } from './mock';
import { createOpenAiProvider } from './openai';

/**
 * ARCH Copilot — provider adapter (AGENTS-V2.md "Copilot architecture").
 *
 * Every model vendor hides behind the same tiny interface so the rest of ARCH never knows which
 * one is in use. The adapter only moves text: redaction, size limits, timeouts, retries and output
 * validation live in `guardrails.ts`, and prompt wording lives in `prompts.ts` — nowhere else.
 */

/** What the draft is for. Lets the mock / native providers return a matching shape. */
export type CopilotTask = 'summary' | 'triage' | 'status_update' | 'postmortem' | 'code_fix' | 'verified_fix' | 'code_review';

export type GenerateOptions = {
  task: CopilotTask;
  maxTokens: number;
  /** Aborted by the guardrails when the per-attempt timeout elapses. */
  signal: AbortSignal;
  /** True when a completion would pass validation (set by the guardrails; used by arch-hybrid). */
  accept?: (text: string) => boolean;
};

export type GenerateResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

export interface AiProvider {
  readonly name: 'arch' | 'arch-hybrid' | 'local-llm' | 'mock' | 'openai' | 'anthropic' | (string & {});
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
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
} as const;

/** Providers that never send data off the server ARCH runs on. */
const ON_PREMISE = new Set(['arch', 'arch-hybrid', 'mock', 'local-llm']);

export type CopilotConfig = {
  enabled: boolean;
  provider: string;
  model: string;
  /** True when incident data never leaves infrastructure you control. */
  onPremise: boolean;
  /** Human-readable reason when `enabled` is false. */
  reason?: string;
};

export function localLlmConfig(): LocalLlmConfig {
  return { baseUrl: env.LOCAL_LLM_URL, model: env.LOCAL_LLM_MODEL, api: env.LOCAL_LLM_API, numCtx: env.LOCAL_LLM_CONTEXT };
}

let override: AiProvider | null = null;

/** Tests swap in slow/failing/spying providers. Pass `null` to restore the env-configured one. */
export function setAiProviderForTesting(provider: AiProvider | null): void {
  override = provider;
}

export function copilotConfig(): CopilotConfig {
  if (override) return { enabled: true, provider: override.name, model: override.model, onPremise: ON_PREMISE.has(override.name) };
  const provider = env.AI_PROVIDER;

  if (provider === 'arch') return { enabled: true, provider, model: DEFAULT_MODELS.arch, onPremise: true };
  // The mock ignores AI_MODEL so switching AI_PROVIDER back to "mock" never shows a vendor model name.
  if (provider === 'mock') return { enabled: true, provider, model: DEFAULT_MODELS.mock, onPremise: true };

  if (provider === 'arch-hybrid') {
    const chatModel = env.LOCAL_CHAT_MODEL?.trim();
    const chatLabel = chatModel && chatModel !== env.LOCAL_LLM_MODEL ? ` (chat: ${chatModel})` : '';
    const model = `${env.LOCAL_LLM_MODEL}${chatLabel} + ${DEFAULT_MODELS.arch}`;
    const local = isLocalEndpoint(env.LOCAL_LLM_URL);
    if (!local && env.ARCH_OFFLINE_ONLY) {
      return {
        enabled: false,
        provider,
        model,
        onPremise: false,
        reason: `LOCAL_LLM_URL (${new URL(env.LOCAL_LLM_URL).host}) is not a private address and ARCH_OFFLINE_ONLY is on.`,
      };
    }
    return { enabled: true, provider, model, onPremise: local };
  }

  const model = env.AI_MODEL?.trim() || DEFAULT_MODELS[provider];
  if (env.ARCH_OFFLINE_ONLY) {
    return {
      enabled: false,
      provider,
      model,
      onPremise: false,
      reason: `AI_PROVIDER="${provider}" sends incident data to an external vendor, which ARCH_OFFLINE_ONLY blocks. Use AI_PROVIDER="arch" or "arch-hybrid".`,
    };
  }
  if (!env.AI_API_KEY?.trim()) {
    return { enabled: false, provider, model, onPremise: false, reason: `AI_PROVIDER is "${provider}" but AI_API_KEY is empty.` };
  }
  return { enabled: true, provider, model, onPremise: false };
}

export function getAiProvider(): AiProvider {
  if (override) return override;
  const config = copilotConfig();
  if (!config.enabled) {
    throw new AiProviderError(config.reason ?? 'ARCH Copilot is not configured.', { retryable: false });
  }
  const apiKey = env.AI_API_KEY ?? '';
  switch (env.AI_PROVIDER) {
    case 'arch':
      return createArchNativeProvider();
    case 'arch-hybrid':
      return createHybridProvider({
        llm: createLocalLlmProvider(localLlmConfig()),
        llmTimeoutMs: env.LOCAL_LLM_TIMEOUT_MS,
        onFallback: (reason) => console.warn(`[copilot] local LLM unavailable (${reason}) — answered with the ARCH model`),
      });
    case 'openai':
      return createOpenAiProvider({ apiKey, model: config.model });
    case 'anthropic':
      return createAnthropicProvider({ apiKey, model: config.model });
    case 'mock':
    default:
      return createMockProvider();
  }
}

/**
 * Per-attempt deadline. In hybrid mode the LLM gets LOCAL_LLM_TIMEOUT_MS and the ARCH model needs
 * a moment after that to answer, so the outer deadline is widened accordingly.
 */
export function copilotTimeoutMs(): number {
  if (!override && env.AI_PROVIDER === 'arch-hybrid') return Math.max(env.AI_TIMEOUT_MS, env.LOCAL_LLM_TIMEOUT_MS + 5_000);
  return env.AI_TIMEOUT_MS;
}

/** Hybrid mode uses one attempt: the fallback inside the provider already is the "retry". */
export function copilotAttempts(): number | undefined {
  return !override && env.AI_PROVIDER === 'arch-hybrid' ? 1 : undefined;
}

/** Rough token estimate for providers that do not report usage (the mock). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
