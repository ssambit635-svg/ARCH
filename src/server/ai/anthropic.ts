import { AiProviderError, type AiProvider, type GenerateOptions, type GenerateResult } from './provider';

/**
 * Anthropic adapter — Messages API over plain `fetch` (no SDK dependency).
 */

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type MessagesResponse = {
  model?: string;
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

export function createAnthropicProvider(config: { apiKey: string; model: string; fetchImpl?: typeof fetch }): AiProvider {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    name: 'anthropic',
    model: config.model,
    async generate(system: string, user: string, options: GenerateOptions): Promise<GenerateResult> {
      let response: Response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          signal: options.signal,
          headers: {
            'content-type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': API_VERSION,
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: options.maxTokens,
            system,
            messages: [{ role: 'user', content: user }],
          }),
        });
      } catch (error) {
        if (options.signal.aborted) throw error;
        throw new AiProviderError('Could not reach Anthropic.', { retryable: true });
      }

      if (!response.ok) {
        throw new AiProviderError(`Anthropic returned HTTP ${response.status}.`, {
          status: response.status,
          retryable: response.status === 429 || response.status === 529 || response.status >= 500,
        });
      }

      const payload = (await response.json()) as MessagesResponse;
      const text = (payload.content ?? [])
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('');
      if (!text) throw new AiProviderError('Anthropic returned an empty message.', { retryable: true });

      return {
        text,
        promptTokens: payload.usage?.input_tokens ?? 0,
        completionTokens: payload.usage?.output_tokens ?? 0,
        model: payload.model ?? config.model,
      };
    },
  };
}
