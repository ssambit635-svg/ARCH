import { AiProviderError, type AiProvider, type GenerateOptions, type GenerateResult } from './provider';

/**
 * Local LLM adapter — an open-weights model running on YOUR infrastructure.
 *
 * Supported servers (all free, all CPU-capable):
 *   - Ollama               LOCAL_LLM_API="ollama"  (default)  POST {url}/api/chat
 *   - llama.cpp server,    LOCAL_LLM_API="openai"             POST {url}/v1/chat/completions
 *     LM Studio, vLLM, LocalAI — anything OpenAI-compatible
 *
 * The URL must point at a private address (see `isLocalEndpoint`) unless ARCH_OFFLINE_ONLY is
 * explicitly turned off, so a typo cannot silently ship incident data to a public host.
 */

export type LocalLlmApi = 'ollama' | 'openai';

export type LocalLlmConfig = {
  baseUrl: string;
  model: string;
  api: LocalLlmApi;
  /** Context window requested from Ollama. 8k fits the largest Copilot prompt comfortably. */
  numCtx?: number;
  fetchImpl?: typeof fetch;
};

const PRIVATE_SUFFIXES = ['.local', '.internal', '.lan', '.localdomain', '.home.arpa', '.svc', '.cluster.local'];

/**
 * True for loopback, RFC 1918 / unique-local ranges, single-label hosts (docker-compose service
 * names such as "ollama") and private DNS suffixes. Link-local 169.254/16 is rejected on purpose:
 * that is where cloud metadata services live.
 */
export function isLocalEndpoint(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '::1' || host === 'host.docker.internal') return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (host.includes(':')) return /^f[cd][0-9a-f]{2}:/.test(host); // IPv6 unique-local fc00::/7
  if (!host.includes('.')) return true;
  return PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

type OllamaChatResponse = { model?: string; message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
type OpenAiChatResponse = { model?: string; choices?: { message?: { content?: string | null } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`;
}

export function createLocalLlmProvider(config: LocalLlmConfig): AiProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const label = config.api === 'ollama' ? 'Ollama' : 'the local LLM server';

  return {
    name: 'local-llm',
    model: config.model,
    async generate(system: string, user: string, options: GenerateOptions): Promise<GenerateResult> {
      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];
      const body =
        config.api === 'ollama'
          ? {
              model: config.model,
              stream: false,
              format: 'json',
              messages,
              options: { temperature: 0.2, num_predict: options.maxTokens, num_ctx: config.numCtx ?? 8192 },
            }
          : { model: config.model, messages, temperature: 0.2, max_tokens: options.maxTokens, response_format: { type: 'json_object' } };

      let response: Response;
      try {
        response = await fetchImpl(joinUrl(config.baseUrl, config.api === 'ollama' ? '/api/chat' : '/v1/chat/completions'), {
          method: 'POST',
          signal: options.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (error) {
        if (options.signal.aborted) throw error;
        throw new AiProviderError(`Could not reach ${label} at ${config.baseUrl}.`, { retryable: true });
      }

      if (!response.ok) {
        const hint = response.status === 404 && config.api === 'ollama' ? ` Is the model pulled? Run: ollama pull ${config.model}` : '';
        throw new AiProviderError(`${label} returned HTTP ${response.status}.${hint}`, { status: response.status, retryable: response.status >= 500 });
      }

      if (config.api === 'ollama') {
        const payload = (await response.json()) as OllamaChatResponse;
        const text = payload.message?.content ?? '';
        if (!text.trim()) throw new AiProviderError('Local LLM returned an empty message.', { retryable: true });
        return { text, promptTokens: payload.prompt_eval_count ?? 0, completionTokens: payload.eval_count ?? 0, model: payload.model ?? config.model };
      }
      const payload = (await response.json()) as OpenAiChatResponse;
      const text = payload.choices?.[0]?.message?.content ?? '';
      if (!text.trim()) throw new AiProviderError('Local LLM returned an empty message.', { retryable: true });
      return { text, promptTokens: payload.usage?.prompt_tokens ?? 0, completionTokens: payload.usage?.completion_tokens ?? 0, model: payload.model ?? config.model };
    },
  };
}

export type LocalLlmHealth = { reachable: boolean; modelAvailable: boolean; models: string[]; error?: string };

/** Quick reachability check for the model page. Never throws. */
export async function checkLocalLlm(config: LocalLlmConfig, timeoutMs = 2_000): Promise<LocalLlmHealth> {
  const fetchImpl = config.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(joinUrl(config.baseUrl, config.api === 'ollama' ? '/api/tags' : '/v1/models'), { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { reachable: true, modelAvailable: false, models: [], error: `HTTP ${response.status}` };
    const payload = (await response.json()) as { models?: { name?: string; model?: string }[]; data?: { id?: string }[] };
    const models = (payload.models?.map((m) => m.name ?? m.model ?? '') ?? payload.data?.map((m) => m.id ?? '') ?? []).filter(Boolean);
    const wanted = config.model.includes(':') ? config.model : `${config.model}:latest`;
    return { reachable: true, modelAvailable: models.some((name) => name === config.model || name === wanted), models: models.slice(0, 20) };
  } catch (error) {
    return { reachable: false, modelAvailable: false, models: [], error: error instanceof Error ? error.message : String(error) };
  }
}
