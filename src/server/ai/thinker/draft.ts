import type { CodeReviewOutput } from '../schemas';
import { classifyThinkerRequest } from './intent';
import { draftFor } from './templates';

/**
 * Native Thinker answer, same JSON contract as Code Assist (`codeReviewRawSchema`).
 *
 * `improvedCode` is the first (usually only) snippet. `findings` are the risks.
 * `explanation` is where the code goes, what will hurt, and what the human still owns.
 */
export function buildThinkerOutput(prompt: string): CodeReviewOutput {
  const request = classifyThinkerRequest(prompt);
  const draft = draftFor(request.intent, request.slots);
  const files = draft.files
    .map((file) => `// ${file.path}\n${file.body.trimEnd()}`)
    .join('\n\n');
  const explanation = [
    `${draft.title}. Intent: ${request.intent} (${Math.round(request.confidence * 100)}% keyword confidence).`,
    ...request.notes,
    '',
    'Where this belongs:',
    ...draft.place.map((line) => `- ${line}`),
    '',
    'What will go wrong if you paste blindly:',
    ...draft.risks.map((risk) => `- (${risk.severity}) ${risk.message} → ${risk.suggestion}`),
    '',
    'Still yours (Thinker will not do this):',
    ...draft.stillYours.map((line) => `- ${line}`),
    '',
    'This is a support snippet for a coding agent / human, not vibe-coding a product.',
  ].join('\n');

  return {
    summary: draft.title,
    findings: draft.risks.map((risk) => ({
      line: null,
      severity: risk.severity,
      message: risk.message,
      suggestion: risk.suggestion,
    })),
    improvedCode: files.slice(0, 40_000),
    explanation: explanation.slice(0, 6000),
  };
}
