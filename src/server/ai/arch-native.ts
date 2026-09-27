import { archDraft } from './arch-model/engine';
import { ARCH_MODEL_NAME } from './arch-model/train';
import { buildCodeReviewOutput } from './code/review';
import { parseCodeContextFromPrompt, parseContextFromPrompt } from './prompts';
import { buildThinkerOutput } from './thinker/draft';
import { AiProviderError, estimateTokens, type AiProvider, type GenerateOptions, type GenerateResult } from './provider';

/**
 * ARCH native provider (AI_PROVIDER="arch") — ARCH's own model, no language model and no network.
 *
 * It reads the same prompt every other provider receives, recovers the structured context from
 * it, and drafts with the ARCH engine using the knowledge the service attached (the
 * organization's trained model: similar past incidents, predicted category and severity).
 */
export function createArchNativeProvider(): AiProvider {
  return {
    name: 'arch',
    model: ARCH_MODEL_NAME,
    async generate(system: string, user: string, options: GenerateOptions): Promise<GenerateResult> {
      if (options.signal.aborted) throw new Error('aborted');
      let output: unknown;
      if (options.task === 'code_review') {
        const input = parseCodeContextFromPrompt(user);
        if (!input) throw new AiProviderError('arch provider: prompt has no code_context block', { retryable: false, status: 400 });
        output = input.mode === 'scaffold' ? buildThinkerOutput(input.code) : buildCodeReviewOutput(input);
      } else {
        const context = parseContextFromPrompt(user);
        if (!context) throw new AiProviderError('arch provider: prompt has no incident_context block', { retryable: false, status: 400 });
        output = archDraft(options.task, context);
      }
      const text = JSON.stringify(output);
      return { text, promptTokens: estimateTokens(system) + estimateTokens(user), completionTokens: estimateTokens(text), model: ARCH_MODEL_NAME };
    },
  };
}

/**
 * arch-hybrid — a local LLM writes the draft, grounded on the ARCH model's knowledge; if the LLM
 * is down, slow, or returns something that fails validation, the native engine answers instead.
 * Copilot therefore never goes dark just because the model server is restarting.
 */
export function createHybridProvider(config: { llm: AiProvider; native?: AiProvider; llmTimeoutMs: number; onFallback?: (reason: string) => void }): AiProvider {
  const native = config.native ?? createArchNativeProvider();
  return {
    name: 'arch-hybrid',
    model: `${config.llm.model} + ${native.model}`,
    async generate(system: string, user: string, options: GenerateOptions): Promise<GenerateResult> {
      let reason = 'invalid_output';
      try {
        const signal = AbortSignal.any([options.signal, AbortSignal.timeout(config.llmTimeoutMs)]);
        const result = await config.llm.generate(system, user, { ...options, signal });
        if (!options.accept || options.accept(result.text)) return result;
      } catch (error) {
        if (options.signal.aborted) throw error; // the overall deadline passed — do not keep going
        reason = error instanceof Error && error.name === 'TimeoutError' ? 'llm_timeout' : 'llm_unavailable';
      }
      config.onFallback?.(reason);
      const fallback = await native.generate(system, user, options);
      return { ...fallback, model: `${native.model} (fallback: ${reason})` };
    },
  };
}
