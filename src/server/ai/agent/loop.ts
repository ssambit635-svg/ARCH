/**
 * The agent loop — intercept → plan → act → answer.
 *
 * One turn of raw user input goes through, in order:
 *   1. `interceptPrompt` — complex prompts get the chain-of-thought system prefix.
 *   2. `model.generate`   — ARCH's own engine answers under that protocol.
 *   3. `parsePlannedOutput` — the response is scanned for <thinking>/<plan> tags; the plan is
 *      recorded and the thinking stays private.
 *   4. Tool JSON (`{"tool": …}`) → executed from the native registry, the result is fed back.
 *   5. A ```python block → the self-correction loop runs it (temp .py + subprocess), failures go
 *      back to the engine with their exact error, then the loop continues.
 *   6. A response with neither → the final answer is presented, tags stripped.
 *
 * The loop is model-agnostic: `AgentModel` is one function. The production implementation is
 * `native.ts` (ARCH's own engine); tests inject scripted models to prove the protocol handling.
 */

import { interceptPrompt, parsePlannedOutput, PLANNER_SYSTEM_PROMPT, type ParsedPlan } from './planner';
import { buildToolInstruction, detectToolRequest, executeToolCall, parseToolCall, type ToolDefinition } from './tools';
import { extractPythonCode, withSelfCorrection } from './self-correct';

export type AgentModel = {
  readonly name?: string;
  /** One engine call. `conversation` is the running transcript (user, model, tool/code results). */
  generate(system: string, conversation: string, options?: { signal?: AbortSignal }): Promise<string> | string;
};

export type AgentStep =
  | { type: 'plan'; steps: string[] }
  | { type: 'tool'; tool: string; ok: boolean; preview: string }
  | { type: 'code'; status: 'passed' | 'exhausted'; attempts: number; output: string; error?: string };

export type AgentResult = {
  /** The only text that should be shown to a human: tags stripped, never the thinking. */
  answer: string;
  plan: string[];
  /** Private chain-of-thought captured from the <thinking> tag. For logs/tests, not for display. */
  thinking: string | null;
  steps: AgentStep[];
  /** True when the planner intercepted this prompt. */
  planned: boolean;
  /** Why the loop stopped. */
  outcome: 'answered' | 'budget_exhausted';
};

export type AgentLoopOptions = {
  input: string;
  model: AgentModel;
  tools?: Record<string, ToolDefinition>;
  /** Max engine calls in one turn (plan/tool/code rounds included). */
  maxSteps?: number;
  /** Executions allowed inside the self-correction loop when code appears. */
  maxFixAttempts?: number;
  /** Set false to parse but never execute code (chat's "advice only" mode). */
  runCode?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

const DEFAULT_MAX_STEPS = 6;
const DEFAULT_FIX_ATTEMPTS = 3;
const TOOL_FEEDBACK_PREFIX = 'Tool result';
const CODE_FEEDBACK_PREFIX = 'Code execution result';

function preview(text: string, max = 240): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

/**
 * Run one agent turn. Never throws for model weirdness — a bounded, tag-free answer always comes
 * back (worst case: the raw response with tags stripped, marked `budget_exhausted`).
 */
export async function runAgentTurn(options: AgentLoopOptions): Promise<AgentResult> {
  const { input, model } = options;
  const tools = options.tools ?? {};
  const maxSteps = Math.max(1, options.maxSteps ?? DEFAULT_MAX_STEPS);
  const maxFixAttempts = Math.max(1, options.maxFixAttempts ?? DEFAULT_FIX_ATTEMPTS);
  const runCode = options.runCode ?? true;

  const intercept = interceptPrompt(input);
  const system = [intercept.system, Object.keys(tools).length ? buildToolInstruction(tools) : ''].filter(Boolean).join('\n\n');

  const steps: AgentStep[] = [];
  const transcript: string[] = [`User:\n${input}`];
  let lastParsed: ParsedPlan | null = null;
  // Code executes at most once per turn: after a green run the engine re-embeds the (verified)
  // script in its final answer for presentation — that block must never be executed again.
  let codeExecuted = false;

  for (let step = 1; step <= maxSteps; step += 1) {
    if (options.signal?.aborted) break;
    const conversation = transcript.join('\n\n');
    const raw = await model.generate(system, conversation, { signal: options.signal });
    lastParsed = parsePlannedOutput(raw ?? '');
    const parsed = lastParsed;

    if (step === 1 && parsed.plan.length) {
      steps.push({ type: 'plan', steps: parsed.plan });
    }
    transcript.push(`Assistant:\n${raw}`);

    // --- (a) tool call → execute → feed back -------------------------------------------------
    const toolCall = parseToolCall(raw);
    if (toolCall && Object.keys(tools).length) {
      const result = await executeToolCall(toolCall, tools);
      steps.push({ type: 'tool', tool: toolCall.tool, ok: result.ok, preview: preview(result.result) });
      transcript.push(`${TOOL_FEEDBACK_PREFIX} (${toolCall.tool}):\n${result.result}`);
      continue;
    }

    // --- (b) code → self-correction loop → feed back ------------------------------------------
    const code = extractPythonCode(parsed.answer) ?? extractPythonCode(raw);
    if (code && runCode && !codeExecuted) {
      const outcome = await withSelfCorrection({
        generate: async (prompt) => model.generate(system, `${conversation}\n\n${prompt}`, { signal: options.signal }),
        task: input,
        // Built by concatenation: a template literal cannot contain a bare ``` fence.
        firstDraft: '```python\n' + code + '\n```',
        maxAttempts: maxFixAttempts,
        timeoutMs: options.timeoutMs,
        signal: options.signal,
      });

      if (outcome.status === 'passed') {
        codeExecuted = true;
        steps.push({ type: 'code', status: 'passed', attempts: outcome.attempts.length, output: preview(outcome.output || '(no output)', 400) });
        transcript.push(`${CODE_FEEDBACK_PREFIX} (exit 0):\n${outcome.output || '(script ran with no output)'}`);
        continue;
      }
      if (outcome.status === 'exhausted') {
        codeExecuted = true;
        steps.push({
          type: 'code',
          status: 'exhausted',
          attempts: outcome.attempts.length,
          output: '',
          error: preview(outcome.lastError, 400),
        });
        transcript.push(`${CODE_FEEDBACK_PREFIX} (failed after ${outcome.attempts.length} attempt(s)):\n${outcome.lastError}`);
        continue;
      }
      // status === 'no_code': fall through to the answer below.
    }

    // --- (c) neither → this is the final answer -----------------------------------------------
    if (parsed.answer.trim()) {
      return {
        answer: parsed.answer,
        plan: parsed.plan,
        thinking: parsed.thinking,
        steps,
        planned: intercept.planned,
        outcome: 'answered',
      };
    }
  }

  // Budget exhausted (or empty outputs): present whatever the last response said, safely stripped.
  const fallback = parsedFallback(lastParsed, input);
  return { answer: fallback, plan: lastParsed?.plan ?? [], thinking: lastParsed?.thinking ?? null, steps, planned: intercept.planned, outcome: 'budget_exhausted' };
}

function parsedFallback(parsed: ParsedPlan | null, input: string): string {
  if (parsed?.answer.trim()) return parsed.answer;
  if (parsed?.thinking?.trim()) return parsed.thinking;
  return `ARCH ran the agent loop for this request but could not produce a final answer. Try rephrasing it more simply. (Your prompt: ${preview(input, 160)})`;
}

/** Re-exported so callers can pre-check a prompt without running the loop. */
export { detectToolRequest, PLANNER_SYSTEM_PROMPT };
