import { describe, expect, it } from 'vitest';
import { createNativeChatAgentModel, createNativeTools, runAgentTurn, scriptForTask, type AgentModel, type AgentResult } from '@/server/ai/agent';

/**
 * The agent loop end to end against scripted "generative" models (tags, tool JSON, python blocks)
 * and against ARCH's own native protocol model. Proves: interception, tag management, tool
 * execution with feedback, the code self-correction path, and the step budget.
 */

const TOOLS = createNativeTools({ workdir: process.cwd(), now: () => new Date('2026-09-28T12:00:00Z') });

function scriptedModel(responses: string[]): { model: AgentModel; calls: string[] } {
  const calls: string[] = [];
  let index = 0;
  return {
    calls,
    model: {
      name: 'scripted',
      generate(_system, conversation) {
        calls.push(conversation);
        const response = responses[Math.min(index, responses.length - 1)]!;
        index += 1;
        return response;
      },
    },
  };
}

const COMPLEX = 'compare our two rollout strategies and give me a step by step plan for each with the risks';

describe('agent loop — planner + tags + answer', () => {
  it('intercepts a complex prompt, records the plan, and presents only the clean answer', async () => {
    const { model, calls } = scriptedModel([
      '<thinking>The user wants a comparison of two rollout strategies.</thinking>' +
        '<plan><step>Identify both strategies</step><step>Compare risks</step><step>Recommend one</step></plan>' +
        '<answer>Use canary first; big-bang only when the blast radius is tiny.</answer>',
    ]);

    const result = await runAgentTurn({ input: COMPLEX, model });
    expect(result.planned).toBe(true);
    expect(result.outcome).toBe('answered');
    expect(result.plan).toEqual(['Identify both strategies', 'Compare risks', 'Recommend one']);
    expect(result.thinking).toContain('comparison');
    expect(result.answer).toBe('Use canary first; big-bang only when the blast radius is tiny.');
    // The system prompt given to the engine forced the protocol.
    expect(calls[0]).toContain('User:\n' + COMPLEX);
  });

  it('runs the system prompt through the planner prefix (the caller passes it; we check bounds here)', async () => {
    const seen: string[] = [];
    const model: AgentModel = {
      generate(system) {
        seen.push(system);
        return '<plan><step>one</step></plan>\nfinal';
      },
    };
    const result = await runAgentTurn({ input: COMPLEX, model, tools: TOOLS });
    expect(seen[0]).toContain('<thinking>');
    expect(seen[0]).toContain('{"tool": "<name>", "arguments": {…}}');
    expect(result.answer).toBe('final');
  });

  it('presents a plain-engine reply when the model uses no tags at all', async () => {
    const { model } = scriptedModel(['No tags, just the answer.']);
    const result = await runAgentTurn({ input: COMPLEX, model });
    expect(result.answer).toBe('No tags, just the answer.');
    expect(result.plan).toEqual([]);
  });
});

describe('agent loop — native tool execution', () => {
  it('parses the tool JSON, executes it, feeds the result back, and takes the final answer', async () => {
    const { model, calls } = scriptedModel([
      '<thinking>Arithmetic is better done exactly.</thinking><plan><step>Confirm the operation</step><step>Run the calculator tool</step><step>Report it</step></plan>\n' +
        '{"tool": "calculator", "arguments": {"expression": "12 * 8 + 4"}}',
      '<thinking>Tool returned 100.</thinking><plan><step>Confirm the operation</step></plan>\n<answer>12 * 8 + 4 = 100.</answer>',
    ]);

    const result = await runAgentTurn({ input: 'Calculate 12 * 8 + 4 and explain what it means for the budget plan', model, tools: TOOLS });

    expect(result.outcome).toBe('answered');
    expect(result.steps.map((step) => step.type)).toEqual(['plan', 'tool']);
    const toolStep = result.steps.find((step) => step.type === 'tool');
    expect(toolStep).toMatchObject({ tool: 'calculator', ok: true, preview: '100' });
    // The result was fed back into the conversation the model saw.
    expect(calls[1]).toContain('Tool result (calculator):\n100');
    expect(result.answer).toBe('12 * 8 + 4 = 100.');
    expect(result.answer).not.toContain('<plan>');
  });

  it('feeds a tool failure back so the model can correct course', async () => {
    const { model, calls } = scriptedModel([
      '{"tool": "shell", "arguments": {}}',
      '<answer>No shell tool exists here — 2+2 is 4.</answer>',
    ]);
    const result = await runAgentTurn({ input: 'Calculate 2 + 2', model, tools: TOOLS });
    expect(result.steps.find((step) => step.type === 'tool')).toMatchObject({ ok: false });
    expect(calls[1]).toContain('Unknown tool "shell"');
    expect(result.answer).toContain('2+2 is 4');
  });
});

describe('agent loop — python self-correction inside the loop', () => {
  const modelWithScript = (script: string): AgentModel => ({
    name: 'scripted-coder',
    generate(_system, conversation) {
      if (conversation.includes('Code execution result (exit 0):')) {
        const output = /Code execution result \(exit 0\):\n([\s\S]*?)(?:\n\n|$)/.exec(conversation)![1]!.trim();
        return `<thinking>Verified.</thinking><plan><step>Run</step><step>Show</step></plan>\n<answer>Script output: ${output}</answer>`;
      }
      return `<thinking>Needs a script.</thinking><plan><step>Draft</step><step>Run</step></plan>\n\`\`\`python\n${script}\n\`\`\``;
    },
  });

  it('extracts the code, runs it, and presents the verified output as the final answer', async () => {
    const result = await runAgentTurn({
      input: 'write a python script that prints the answer',
      model: modelWithScript('print(6 * 7)'),
      tools: TOOLS,
    });
    expect(result.outcome).toBe('answered');
    expect(result.steps.find((step) => step.type === 'code')).toMatchObject({ type: 'code', status: 'passed', attempts: 1 });
    expect(result.answer).toBe('Script output: 42');
    expect(result.answer).not.toContain('```');
  });

  it('gives up honestly when every attempt fails, and the model reports it', async () => {
    const failing: AgentModel = {
      generate(_system, conversation) {
        if (conversation.includes('Code execution result (failed')) {
          return '<plan><step>Report</step></plan>\n<answer>The script kept failing; here is the last error.</answer>';
        }
        if (conversation.includes('The code failed with this error:')) {
          // The "model" stubbornly returns the same broken code.
          return '<plan><step>Fix</step></plan>\n```python\nraise RuntimeError("nope")\n```';
        }
        return '<plan><step>Draft</step></plan>\n```python\nraise RuntimeError("nope")\n```';
      },
    };
    const result = await runAgentTurn({ input: 'write a python script to demo failure', model: failing, tools: TOOLS, maxFixAttempts: 2 });
    const codeStep = result.steps.find((step) => step.type === 'code');
    expect(codeStep).toMatchObject({ status: 'exhausted', attempts: 2 });
    expect(codeStep && codeStep.type === 'code' ? codeStep.error : '').toContain('nope');
    expect(result.answer).toContain('kept failing');
  });

  it('never executes code when runCode is false', async () => {
    const { model } = scriptedModel(['<plan><step>Draft</step></plan>\n```python\nprint("must not run")\n```']);
    const result = await runAgentTurn({ input: 'write a python script to print', model, tools: TOOLS, runCode: false });
    // With code untouched, the fenced block is presented as the answer (chat would not do this —
    // the point is only that no subprocess ran: no code step appears).
    expect(result.steps.some((step) => step.type === 'code')).toBe(false);
    expect(result.answer).toContain('print("must not run")');
  });
});

describe('agent loop — bounded on the step budget', () => {
  it('stops after maxSteps and still returns a safe, tag-free answer', async () => {
    const loopForever: AgentModel = { generate: () => '{"tool": "calculator", "arguments": {"expression": "1+1"}}' };
    const result = await runAgentTurn({ input: 'calculate 1 + 1 and then keep talking about it forever', model: loopForever, tools: TOOLS, maxSteps: 3 });
    expect(result.outcome).toBe('budget_exhausted');
    expect(result.steps.filter((step) => step.type === 'tool')).toHaveLength(3);
    expect(result.answer).not.toContain('<thinking>');
    expect(result.answer.length).toBeGreaterThan(0);
  });
});

describe('native protocol model', () => {
  const native = (overrides: Partial<Parameters<typeof createNativeChatAgentModel>[0]> = {}) =>
    createNativeChatAgentModel({ answer: 'Grounded engine answer with evidence.', intent: 'advice', language: 'en', ...overrides });

  it('first turn: thinking + plan + the engine answer in <answer>', () => {
    const raw = native({ notes: ['intent=advice', '2 citation(s) for this answer'] }).generate('', 'User:\nredis is slow, kya karu?') as string;
    expect(raw).toContain('<thinking>');
    expect(raw).toContain('intent=advice');
    expect(raw).toContain('<plan>');
    expect(raw).toContain('<step>');
    expect(raw).toContain('<answer>Grounded engine answer with evidence.</answer>');
  });

  it('first turn with arithmetic: emits the tool JSON structure, not prose', () => {
    const raw = native().generate('', 'User:\nCalculate 12 * 8 + 4 and explain what it means for the budget plan') as string;
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    expect(parsed).toEqual({ tool: 'calculator', arguments: { expression: '12*8+4' } });
  });

  it('tool-result turn: final answer contains the exact result', () => {
    const conversation = [
      'User:\nCalculate 12 * 8 + 4 and explain what it means for the budget plan',
      'Assistant:\n{"tool": "calculator", "arguments": {"expression": "12*8+4"}}',
      'Tool result (calculator):\n100',
    ].join('\n\n');
    const raw = native({ intent: 'unknown' }).generate('', conversation) as string;
    expect(raw).toContain('Result from calculator: 100');
    expect(raw).toContain('<answer>');
  });

  it('script turn: hands a python block to the loop instead of an answer', () => {
    const script = scriptForTask('write a python script for the p95 of 10, 20, 30, 40, 100, 110, 120');
    expect(script).not.toBeNull();
    const raw = native({ script }).generate('', 'User:\nwrite a python script for the p95 of 10, 20, 30, 40, 100, 110, 120') as string;
    expect(raw).toContain('```python');
    expect(raw).not.toContain('<answer>');
    expect(raw).toContain('p95=');
  });

  it('fix turn: repairs a recognisable failure and refuses to invent an unfixed one', () => {
    const conversation = [
      'User:\nwrite a python script that uses math',
      'Assistant:\n```python\nprint(sqrt(16))\n```',
      'The code failed with this error: NameError: name \'sqrt\' is not defined. Fix it.',
    ].join('\n\n');
    const raw = native().generate('', conversation) as string;
    expect(raw).toContain('from math import sqrt');
    expect(raw).toContain('```python');

    const hopeless = [
      'User:\ndo the thing',
      'Assistant:\n```python\nx = $$$\n```',
      'The code failed with this error: totally unrecognised failure mode xyz. Fix it.',
    ].join('\n\n');
    const refusal = native().generate('', hopeless) as string;
    expect(refusal).toContain('could not repair');
    expect(refusal).toContain('unrecognised failure mode');
  });

  it('code-verified turn: presents the script with its real output', () => {
    const conversation = [
      'User:\nwrite a python script to compute the average of 2 and 4',
      'Assistant:\n```python\nprint((2 + 4) / 2)\n```',
      'Code execution result (exit 0):\n3.0',
    ].join('\n\n');
    const raw = native({ script: { title: 'Summary statistics', code: 'print((2 + 4) / 2)' } }).generate('', conversation) as string;
    expect(raw).toContain('Output (exit 0, sandboxed subprocess):');
    expect(raw).toContain('3.0');
    expect(raw).toContain('verified by running it on this server');
  });
});

describe('scriptForTask — what the engine will and will not write', () => {
  it('accepts bounded computations', () => {
    expect(scriptForTask('write a python script for the p95 of 1, 2, 3, 4, 5, 6, 7, 8, 9, 10')).not.toBeNull();
    expect(scriptForTask('python script to compute the error rate: 12 out of 300')).not.toBeNull();
    expect(scriptForTask('script for factorial of 10')).not.toBeNull();
    expect(scriptForTask('python fibonacci of 15')).not.toBeNull();
    expect(scriptForTask('average of 4, 8, 15, 16, 23, 42 in a script')).not.toBeNull();
  });

  it('refuses feature/production code — that is Code Assist territory', () => {
    expect(scriptForTask('write a function to retry requests')).toBeNull();
    expect(scriptForTask('script for a new api endpoint')).toBeNull();
    expect(scriptForTask('no script needed, just answer')).toBeNull();
    expect(scriptForTask('explain the incident')).toBeNull();
  });
});

// Keep the type import used (regression if AgentResult shape changes).
const _typeCheck: AgentResult | null = null;
void _typeCheck;
