import { env } from '@/lib/env';
import { isLocalEndpoint, type LocalLlmConfig } from './local-llm';

/**
 * Plain-text chat access to an open-weights model running on the same private infrastructure as
 * ARCH. This is deliberately separate from the JSON-only Copilot adapter: conversational answers
 * should be natural prose, while incident drafts still need their strict schemas.
 */
export type LocalChatOptions = {
  signal: AbortSignal;
  maxTokens: number;
  temperature?: number;
};

export type LocalChatResult = { text: string; model: string };

export interface LocalChatModel {
  readonly model: string;
  generate(system: string, user: string, options: LocalChatOptions): Promise<LocalChatResult>;
}

export type LocalChatConfig = Pick<LocalLlmConfig, 'baseUrl' | 'model' | 'api' | 'numCtx' | 'fetchImpl'>;

type OllamaChatResponse = { model?: string; message?: { content?: string } };
type OpenAiChatResponse = { model?: string; choices?: { message?: { content?: string | null } }[] };

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`;
}

/** Create a small adapter for Ollama or any local OpenAI-compatible inference server. */
export function createLocalChatModel(config: LocalChatConfig): LocalChatModel {
  const fetchImpl = config.fetchImpl ?? fetch;
  return {
    model: config.model,
    async generate(system, user, options) {
      if (options.signal.aborted) throw new Error('Local chat generation was cancelled.');
      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];
      const isOllama = config.api === 'ollama';
      const body = isOllama
        ? {
            model: config.model,
            stream: false,
            messages,
            options: {
              temperature: options.temperature ?? 0.35,
              num_predict: options.maxTokens,
              num_ctx: config.numCtx ?? 8192,
              repeat_penalty: 1.05,
            },
          }
        : {
            model: config.model,
            messages,
            temperature: options.temperature ?? 0.35,
            max_tokens: options.maxTokens,
          };

      let response: Response;
      try {
        response = await fetchImpl(joinUrl(config.baseUrl, isOllama ? '/api/chat' : '/v1/chat/completions'), {
          method: 'POST',
          signal: options.signal,
          redirect: 'error',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (error) {
        if (options.signal.aborted) throw error;
        throw new Error('Could not reach the configured local chat model.');
      }

      if (!response.ok) {
        const hint = response.status === 404 && isOllama ? ` The model may not be pulled: ${config.model}.` : '';
        throw new Error(`The local chat model returned HTTP ${response.status}.${hint}`);
      }

      const payload = (await response.json()) as OllamaChatResponse | OpenAiChatResponse;
      const text = isOllama
        ? (payload as OllamaChatResponse).message?.content ?? ''
        : (payload as OpenAiChatResponse).choices?.[0]?.message?.content ?? '';
      if (!text.trim()) throw new Error('The local chat model returned an empty answer.');
      return { text, model: payload.model ?? config.model };
    },
  };
}

let testOverride: LocalChatModel | null | undefined;

/** Isolated seam for service tests; undefined restores normal environment-based selection. */
export function setLocalChatModelForTesting(model: LocalChatModel | null | undefined): void {
  testOverride = model;
}

/**
 * Free chat generation is opt-in and private-only. Even if a deployment explicitly permits a
 * remote Copilot endpoint, ARCH Chat never forwards workspace or member data to a public service.
 */
export function getLocalChatModel(): LocalChatModel | null {
  if (testOverride !== undefined) return testOverride;
  if (env.AI_PROVIDER !== 'arch-hybrid' || !isLocalEndpoint(env.LOCAL_LLM_URL)) return null;
  return createLocalChatModel({
    baseUrl: env.LOCAL_LLM_URL,
    api: env.LOCAL_LLM_API,
    model: env.LOCAL_CHAT_MODEL?.trim() || env.LOCAL_LLM_MODEL,
    numCtx: env.LOCAL_LLM_CONTEXT,
  });
}
