/**
 * Task planning via raw prompts — ARCH's own chain-of-thought intercept.
 *
 * When a user submits a complex prompt this module intercepts it BEFORE it reaches the model
 * engine and prefixes a custom system prompt that forces chain-of-thought. The model must answer
 * inside `<thinking>…</thinking>` and `<plan><step>…</step></plan>` tags first; the output is
 * then scanned for exactly those tags so the steps can be managed (executed, logged, hidden)
 * before the final answer is presented to the user.
 *
 * No external AI is involved: the prompt and the parser are plain strings in this file, and the
 * engine on the other side of them is ARCH's own native model (see `native.ts`).
 */

/** The custom system prompt that forces the model into the thinking → plan → answer protocol. */
export const PLANNER_SYSTEM_PROMPT = `You are ARCH, the on-premise agent of an incident-management workspace. For every complex request you MUST reason in this exact protocol before answering:

<thinking>
Briefly state what is being asked, what is already known, and what could go wrong. One short paragraph.
</thinking>
<plan>
<step>First concrete step</step>
<step>Next concrete step</step>
</plan>
<answer>
The final, user-facing answer only. This is the only part a human will read.
</answer>

Rules:
- Emit the <thinking> and <plan> tags on every complex request, even if you answer from memory.
- The <answer> must be self-contained: the reader never sees your thinking or plan.
- If a step needs a tool, answer with a single JSON object instead of prose: {"tool": "<name>", "arguments": {...}}.
- If a step needs code, answer with one fenced \`\`\`python block that can be executed as a script.
- Never invent tools, files or outputs. Unknowns are stated as unknowns.
- This runs entirely on the local server: no network, no vendor model.`;

/** Longest plan step and answer we keep, so a runaway generation cannot bloat a message. */
const MAX_ANSWER_CHARS = 8_000;
const MAX_THINKING_CHARS = 4_000;
const MAX_STEPS = 12;
const MAX_STEP_CHARS = 300;

/** Signals that a prompt is multi-step enough to be worth planning (deterministic, testable). */
const COMPLEX_PATTERNS: RegExp[] = [
  /\bstep[- ]by[- ]step\b/i,
  /\bplan\b|\broadmap\b|\bstrategy\b|\bstrategize\b/i,
  /\bmigrat\w*|\barchitect\w*|\bdesign\b|\bend[- ]to[- ]end\b/i,
  /\bcompare\b|\bversus\b|\bvs\.?\b|\btrade[- ]?offs?\b|\bpros and cons\b/i,
  /\bdebug\w*|\btroubleshoot\w*|\broot cause\b/i,
  /\bimplement\w*|\brollout\b|\broll out\b|\bdeploy\w*|\bbuild\b/i,
  /\bthoroughly\b|\bin detail\b|\bfully\b/i,
  /\baur\b.*\b(?:phir|then|kaise)\b/i, // Hinglish multi-part asks: "…aur phir kya karu?"
];

/**
 * True when the prompt should be intercepted by the planner (chain-of-thought prefix + tag scan).
 * Deliberately conservative: a greeting or a one-line status question must skip the loop.
 */
export function needsPlanning(input: string): boolean {
  const text = input.trim();
  if (text.length < 20) return false;
  if (text.length >= 160) return true;
  if (COMPLEX_PATTERNS.some((pattern) => pattern.test(text))) return true;
  // Two or more questions in one prompt.
  if ((text.match(/\?/g) ?? []).length >= 2) return true;
  // One question mark but two asks joined together: "why did this fail and what should I do next?"
  if (text.includes('?') && /\b(?:and|but|aur)\b/i.test(text)) return true;
  // Three or more sentences.
  const sentences = text.split(/[.!?]+[\s"']/).map((part) => part.trim()).filter(Boolean);
  if (sentences.length >= 3) return true;
  // An explicit list (1. … 2. …) with at least two items.
  if ((text.match(/^\s*\d+[.)]\s+\S/gm) ?? []).length >= 2) return true;
  return false;
}

/**
 * Intercept a raw prompt: returns the user text unchanged plus the planner system prefix to use
 * for this turn. `planned` is false for prompts that must take the fast path (no CoT overhead).
 */
export function interceptPrompt(input: string): { prompt: string; planned: boolean; system: string } {
  const planned = needsPlanning(input);
  return { prompt: input, planned, system: planned ? PLANNER_SYSTEM_PROMPT : '' };
}

export type ParsedPlan = {
  /** Private model reasoning. Never presented to the user. */
  thinking: string | null;
  /** Ordered steps from <plan>, managed before the final answer is shown. */
  plan: string[];
  /** The only user-facing text: tags stripped, bounded. Empty when the output was unusable. */
  answer: string;
  hadThinkingTag: boolean;
  hadPlanTag: boolean;
};

/** Remove any residual agent tags from text that will be shown to a human. */
export function stripAgentTags(text: string): string {
  return text.replace(/<\/?(?:thinking|plan|step|answer)\b[^>]*>/gi, ' ');
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > max * 0.8 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

function extractTag(raw: string, tag: 'thinking' | 'plan' | 'answer'): string | null {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(raw);
  return match ? match[1]! : null;
}

function stepsFromPlanBlock(block: string): string[] {
  const stepMatches = [...block.matchAll(/<step\b[^>]*>([\s\S]*?)<\/step>/gi)];
  const rawSteps = stepMatches.length
    ? stepMatches.map((match) => match[1]!)
    : block
        .split('\n')
        .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
        .filter(Boolean);
  return rawSteps
    .map((step) => clip(stripAgentTags(step), MAX_STEP_CHARS))
    .filter(Boolean)
    .slice(0, MAX_STEPS);
}

/**
 * Scan a raw model completion for the custom tags and split it into (private) thinking, the plan
 * of steps, and the final answer. Tolerates prose around the tags and outputs with no tags at
 * all (answer = everything, plan = []) so a plain engine reply still renders.
 */
export function parsePlannedOutput(raw: string): ParsedPlan {
  const source = raw ?? '';
  const thinkingBlock = extractTag(source, 'thinking');
  const planBlock = extractTag(source, 'plan');
  const answerBlock = extractTag(source, 'answer');

  let answer: string;
  if (answerBlock !== null) {
    answer = answerBlock;
  } else if (planBlock !== null) {
    // Everything the model said after the plan closes is the final answer.
    const afterPlan = source.slice(source.toLowerCase().indexOf('</plan>') + '</plan>'.length);
    answer = afterPlan;
  } else if (thinkingBlock !== null) {
    answer = source.slice(source.toLowerCase().indexOf('</thinking>') + '</thinking>'.length);
  } else {
    answer = source;
  }

  return {
    thinking: thinkingBlock !== null ? clip(stripAgentTags(thinkingBlock), MAX_THINKING_CHARS) : null,
    plan: planBlock !== null ? stepsFromPlanBlock(planBlock) : [],
    answer: clip(stripAgentTags(answer), MAX_ANSWER_CHARS),
    hadThinkingTag: thinkingBlock !== null,
    hadPlanTag: planBlock !== null,
  };
}
