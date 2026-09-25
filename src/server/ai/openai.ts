import { AiProviderError, type AiProvider, type GenerateOptions, type GenerateResult } from './provider';

/**
 * OpenAI adapter — Chat Completions over plain `fetch` (no SDK dependency).
 * JSON mode is requested so the guardrails can validate the draft against a schema.
 */

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

type ChatCompletionResponse = {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export function createOpenAiProvider(config: { apiKey: string; model: string; fetchImpl?: typeof fetch }): AiProvider {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    name: 'openai',
    model: config.model,
    async generate(system: string, user: string, options: GenerateOptions): Promise<GenerateResult> {
      let response: Response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          signal: options.signal,
          headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            max_completion_tokens: options.maxTokens,
            response_format: { type: 'json_object' },
          }),
        });
      } catch (error) {
        if (options.signal.aborted) throw error;
        throw new AiProviderError('Could not reach OpenAI.', { retryable: true });
      }

      if (!response.ok) {
        // Body is not echoed: it can contain request fragments. Status is enough to diagnose.
        throw new AiProviderError(`OpenAI returned HTTP ${response.status}.`, {
          status: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const text = payload.choices?.[0]?.message?.content ?? '';
      if (!text) throw new AiProviderError('OpenAI returned an empty completion.', { retryable: true });

      return {
        text,
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
        model: payload.model ?? config.model,
      };
    },
  };
}
