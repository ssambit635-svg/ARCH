/**
 * ARCH's native engine, wearing the agent protocol.
 *
 * The planner prefixes a chain-of-thought system prompt and the loop scans for `<thinking>` /
 * `<plan>` tags, tool JSON and Python blocks — this module is the engine on the other side that
 * emits them. Everything it produces is derived from ARCH's own state: the chat engine's grounded
 * answer, the intent classifier, the native tool registry, and the fixed script templates in
 * `script.ts`. No vendor model, no remote call, no weights file.
 *
 * It understands the three conversation states the loop can be in:
 *   - first turn          → plan tags + (tool JSON | python block | final answer)
 *   - tool result fed back → plan tags + final answer containing the result
 *   - "The code failed…"   → repaired python block (or an honest refusal to fix)
 *   - code ran green      → final answer containing the verified script and its output
 */

import { parsePlannedOutput } from './planner';
import { detectToolRequest, type ToolCall } from './tools';
import { extractPythonCode } from './self-correct';
import { repairScript, type ScriptDraft } from './script';
import type { AgentModel } from './loop';

export type NativeAgentContext = {
  /** The grounded answer from ARCH's chat engine for this turn (citations already extracted). */
  answer: string;
  /** Chat intent classifier output — steers the plan steps and answer style. */
  intent?: string;
  language?: 'en' | 'hinglish';
  /** Real analysis facts for the <thinking> tag (intent, evidence counts). Never invented. */
  notes?: string[];
  /** Pre-computed script draft when the prompt is a bounded computation (see `scriptForTask`). */
  script?: ScriptDraft | null;
};

const FIX_PROMPT_MARKER = 'The code failed with this error:';
const TOOL_MARKER = /Tool result \(([^)]+)\):\n([\s\S]*?)(?:\n\n|$)/;
const CODE_OK_MARKER = /Code execution result \(exit 0\):\n([\s\S]*?)(?:\n\n|$)/;
const CODE_FAIL_MARKER = /Code execution result \(failed after (\d+) attempt\(s\)\):\n([\s\S]*?)(?:\n\n|$)/;

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function firstUserLine(conversation: string): string {
  const match = /User:\n([\s\S]*?)(?:\n\nAssistant:|$)/.exec(conversation);
  return (match ? match[1]! : '').trim();
}

function lastPythonBlock(text: string): string | null {
  const blocks = [...text.matchAll(/```python\s*\n([\s\S]*?)```/g)];
  if (blocks.length) return blocks[blocks.length - 1]![1]!.trim();
  return extractPythonCode(text);
}

function wrap(params: { thinking: string; plan: string[]; body: string }): string {
  const steps = params.plan.map((step) => `<step>${clip(step, 300)}</step>`).join('');
  return `<thinking>${clip(params.thinking, 2_000)}</thinking><plan>${steps}</plan>\n${params.body}`;
}

function planFor(kind: 'answer' | 'tool' | 'script', intent: string | undefined, language: 'en' | 'hinglish'): string[] {
  if (kind === 'tool') {
    return language === 'hinglish'
      ? ['Sawal ko confirm karo', 'Native tool se operation chalao', 'Verified result wapas batao']
      : ['Confirm what is being asked', 'Execute the operation with the native tool', 'Report the verified result'];
  }
  if (kind === 'script') {
    return language === 'hinglish'
      ? ['Calculation request samjho', 'Bounded Python script draft karo', 'Sandboxed subprocess mein chalao', 'Error aaye to fix karke dobara chalao', 'Verified output batao']
      : ['Parse the computation request', 'Draft a bounded Python script', 'Run it in the sandboxed subprocess', 'Fix any error and re-run', 'Present the verified output'];
  }
  if (intent === 'advice') {
    return language === 'hinglish'
      ? ['Symptom aur impact samjho', 'Runbooks aur past incidents check karo', 'Prioritized checks aur safe fixes do', 'Facts aur hypotheses alag rakho']
      : ['Understand the symptom and impact', 'Check runbooks and incident history', 'Give prioritized checks and safe mitigations', 'Separate confirmed facts from hypotheses'];
  }
  if (intent === 'tech_stack_advice') {
    return ['Identify the goal and constraints', 'Compare realistic options and trade-offs', 'Recommend a default with conditions that would change it'];
  }
  return language === 'hinglish'
    ? ['Sawaal ka seedha jawab taiyar karo', 'Zaroori evidence quote karo', 'Uncertainty saaf batao']
    : ['Answer the actual question directly', 'Ground claims in the supplied evidence', 'State uncertainty plainly'];
}

function thinkingFor(notes: string[], decision: string): string {
  const facts = notes.filter(Boolean).slice(0, 6);
  return [facts.length ? `Known: ${facts.join('; ')}.` : 'Known: no extra workspace facts for this turn.', decision].join(' ');
}

/** Parse the exact fix prompt the self-correction loop sends back. */
function parseFixPrompt(conversation: string): { code: string | null; error: string } | null {
  const markerAt = conversation.lastIndexOf(FIX_PROMPT_MARKER);
  if (markerAt === -1) return null;
  const tail = conversation.slice(markerAt);
  const errorMatch = /The code failed with this error: ([\s\S]+?)\. Fix it\./.exec(tail);
  const error = errorMatch ? errorMatch[1]!.trim() : tail.slice(FIX_PROMPT_MARKER.length).trim();
  const beforeFix = conversation.slice(0, markerAt);
  return { code: lastPythonBlock(beforeFix), error };
}

export function createNativeChatAgentModel(context: NativeAgentContext): AgentModel {
  const language = context.language ?? 'en';
  const notes = context.notes ?? [];
  const intent = context.intent;

  return {
    name: 'arch-agent-native',
    generate(_system: string, conversation: string): string {
      const question = firstUserLine(conversation);

      // --- state 3: the self-correction loop sent a failure back --------------------------------
      const fix = parseFixPrompt(conversation);
      if (fix) {
        if (!fix.code) {
          return wrap({
            thinking: 'The previous response had no code block to repair, so there is nothing to re-run.',
            plan: planFor('answer', intent, language),
            body: `<answer>ARCH could not repair the previous script because no code block was found. The error was: ${clip(fix.error, 500)}</answer>`,
          });
        }
        const repaired = repairScript(fix.code, fix.error);
        if (repaired) {
          return wrap({
            thinking: `A fixable failure: ${clip(fix.error, 300)}. Applying a static repair and returning the corrected script.`,
            plan: planFor('script', intent, language),
            body: `\`\`\`python\n${repaired}\n\`\`\``,
          });
        }
        return wrap({
          thinking: `The failure is outside the deterministic repairer: ${clip(fix.error, 300)}. No fabricated fix is offered.`,
          plan: planFor('answer', intent, language),
          body: `<answer>ARCH could not repair that script automatically after the error: ${clip(fix.error, 600)}. Nothing was executed beyond the attempts above — take this to Code Assist (or fix the error shown) rather than guessing.</answer>`,
        });
      }

      // --- state 4: code ran (green or red) → present the verified result ------------------------
      const codeFail = CODE_FAIL_MARKER.exec(conversation);
      if (codeFail) {
        const code = lastPythonBlock(conversation.slice(0, conversation.indexOf('Code execution result'))) ?? '';
        return wrap({
          thinking: `The self-correction loop exhausted its attempts (${codeFail[1]}) without a green run. Report the failure honestly.`,
          plan: planFor('script', intent, language),
          body: `<answer>The script did not pass verification after ${codeFail[1]} attempt(s). Last error:\n${clip(codeFail[2]!.trim(), 800)}\n\n${code ? 'Last attempt:\n```python\n' + clip(code, 2_000) + '\n```' : ''}</answer>`,
        });
      }
      const codeOk = CODE_OK_MARKER.exec(conversation);
      if (codeOk) {
        const code = lastPythonBlock(conversation.slice(0, conversation.indexOf('Code execution result'))) ?? '';
        const output = codeOk[1]!.trim();
        const title = context.script?.title ?? 'Script';
        return wrap({
          thinking: 'The script executed with exit 0 in the sandboxed subprocess. Present the code and its real output as the answer.',
          plan: planFor('script', intent, language),
          body: `<answer>${title} — written by ARCH's native engine and verified by running it on this server.

\`\`\`python
${clip(code, 4_000)}
\`\`\`

Output (exit 0, sandboxed subprocess):
${output || '(the script ran successfully with no output)'}

Verified locally: failures during the run were fed back to the engine with their exact error and fixed before this answer was presented. For production/feature code (not a one-off computation), use Code Assist.</answer>`,
        });
      }

      // --- state 2: a tool result was fed back → the answer contains it --------------------------
      const toolResult = TOOL_MARKER.exec(conversation);
      if (toolResult) {
        const toolName = toolResult[1]!;
        const result = toolResult[2]!.trim();
        // The engine's reply to an internal "Tool result" line is classified from the whole
        // transcript and drifts into workspace/status answers ("no incidents yet…") that have
        // nothing to do with the operation — the tool result *is* the complete answer, so that
        // draft is deliberately dropped here.
        return wrap({
          thinking: thinkingFor(notes, `The native ${toolName} tool returned a result; present it exactly, without inventing anything else.`),
          plan: planFor('tool', intent, language),
          body: `<answer>${clip(`Result from ${toolName}: ${result}`, 6_000)}</answer>`,
        });
      }

      // --- state 1: first turn --------------------------------------------------------------------
      const toolRequest = detectToolRequest(question);
      if (toolRequest) {
        const call: ToolCall = toolRequest;
        return wrap({
          thinking: thinkingFor(notes, `The prompt asks for an operation that a native tool can execute exactly (${call.tool}); calling it instead of approximating in prose.`),
          plan: planFor('tool', intent, language),
          body: JSON.stringify({ tool: call.tool, arguments: call.arguments }),
        });
      }

      if (context.script) {
        return wrap({
          thinking: thinkingFor(notes, 'The prompt is a bounded computation, so the answer is a runnable script that the loop will execute and verify.'),
          plan: planFor('script', intent, language),
          body: `\`\`\`python\n${context.script.code}\`\`\``,
        });
      }

      return wrap({
        thinking: thinkingFor(notes, 'No tool call and no script are needed; answering with the engine result.'),
        plan: planFor('answer', intent, language),
        body: `<answer>${clip(context.answer, 6_000)}</answer>`,
      });
    },
  };
}

/** Exported for tests: what the model would decide for a given first-turn prompt. */
export { detectToolRequest };

/** Re-exported so callers can strip tags defensively before rendering. */
export { parsePlannedOutput };
