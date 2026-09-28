import { archDraft } from './arch-model/engine';
import { ARCH_MODEL_NAME } from './arch-model/train';
import { buildCodeReviewOutput } from './code/review';
import { parseCodeContextFromPrompt, parseContextFromPrompt } from './prompts';
import { buildThinkerOutput } from './thinker/draft';
import { AiProviderError, estimateTokens, type AiProvider, type GenerateOptions, type GenerateResult } from './provider';

/**
 * ARCH native provider (AI_PROVIDER="arch") — ARCH's own model, no language model and no network.
 * There is no hybrid/fallback path: this engine (or the test mock) is the whole model layer.
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
