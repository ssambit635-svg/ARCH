import { describe, expect, it } from 'vitest';
import { createLocalChatModel } from '../src/server/ai/local-chat';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('free local chat adapter', () => {
  it('uses Ollama plain-text chat mode (not JSON-only Copilot mode)', async () => {
    let requestUrl = '';
    let requestBody: Record<string, unknown> = {};
    let redirect: RequestInit['redirect'];
    const model = createLocalChatModel({
      baseUrl: 'http://ollama:11434/',
      model: 'qwen2.5:7b',
      api: 'ollama',
      fetchImpl: async (input, init) => {
        requestUrl = String(input);
        redirect = init?.redirect;
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return response({ model: 'qwen2.5:7b', message: { content: 'A natural local answer.' } });
      },
    });

    const result = await model.generate('Be helpful.', 'What is a queue?', { signal: new AbortController().signal, maxTokens: 300 });
    expect(requestUrl).toBe('http://ollama:11434/api/chat');
    expect(redirect).toBe('error');
    expect(requestBody).not.toHaveProperty('format');
    expect(requestBody).toMatchObject({ model: 'qwen2.5:7b', stream: false });
    expect(result).toEqual({ text: 'A natural local answer.', model: 'qwen2.5:7b' });
  });

  it('supports private OpenAI-compatible servers and reports HTTP errors without response bodies', async () => {
    let requestUrl = '';
    const model = createLocalChatModel({
      baseUrl: 'http://localhost:8080',
      model: 'local-instruct',
      api: 'openai',
      fetchImpl: async (input) => {
        requestUrl = String(input);
        return response({ model: 'local-instruct', choices: [{ message: { content: 'OpenAI-compatible local output.' } }] });
      },
    });
    await expect(model.generate('system', 'question', { signal: new AbortController().signal, maxTokens: 100 })).resolves.toEqual({
      text: 'OpenAI-compatible local output.',
      model: 'local-instruct',
    });
    expect(requestUrl).toBe('http://localhost:8080/v1/chat/completions');

    const failing = createLocalChatModel({
      baseUrl: 'http://localhost:8080',
      model: 'local-instruct',
      api: 'openai',
      fetchImpl: async () => response({ secret: 'must not be logged' }, 502),
    });
    await expect(failing.generate('system', 'question', { signal: new AbortController().signal, maxTokens: 100 }))
      .rejects.toThrow('The local chat model returned HTTP 502.');
  });
});
