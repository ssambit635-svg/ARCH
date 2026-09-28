import { describe, expect, it } from 'vitest';
import { interceptPrompt, needsPlanning, parsePlannedOutput, PLANNER_SYSTEM_PROMPT, stripAgentTags } from '@/server/ai/agent';

/**
 * Task planning via raw prompts: the intercept, the forced chain-of-thought system prompt, and
 * the tag scan that manages <thinking>/<plan> before a final answer is presented.
 */

describe('planner — needsPlanning', () => {
  it('skips greetings, status asks and other one-liners', () => {
    expect(needsPlanning('hello')).toBe(false);
    expect(needsPlanning('what is open right now?')).toBe(false);
    expect(needsPlanning('thanks!')).toBe(false);
    expect(needsPlanning('kya haal hai?')).toBe(false);
  });

  it('intercepts long prompts', () => {
    expect(needsPlanning('Explain the retry design we discussed last week because we are about to ship it')).toBe(true);
    expect(needsPlanning('x'.repeat(200))).toBe(true);
  });

  it('intercepts multi-part prompts: step-by-step, compare, two questions, lists', () => {
    expect(needsPlanning('give me a step by step rollout plan')).toBe(true);
    expect(needsPlanning('compare postgres and mysql for our metrics store')).toBe(true);
    expect(needsPlanning('why did this fail and what should I do next?')).toBe(true);
    expect(needsPlanning('should we migrate?\nwhat will it cost?')).toBe(true);
    expect(needsPlanning('1. drain the node\n2. upgrade kubelet')).toBe(true);
    expect(needsPlanning('migrate kar rahe hain — pura process batao')).toBe(true);
  });
});

describe('planner — interceptPrompt', () => {
  it('prefixes the forced chain-of-thought system prompt only for complex prompts', () => {
    const complex = interceptPrompt('compare our rollout strategies and give a step by step plan for each');
    expect(complex.planned).toBe(true);
    expect(complex.system).toBe(PLANNER_SYSTEM_PROMPT);
    expect(complex.system).toContain('<thinking>');
    expect(complex.system).toContain('<plan>');
    expect(complex.system).toContain('{"tool": "<name>"');

    const simple = interceptPrompt('hello');
    expect(simple.planned).toBe(false);
    expect(simple.system).toBe('');
    expect(simple.prompt).toBe('hello');
  });
});

describe('planner — parsePlannedOutput (the tag scan)', () => {
  it('splits thinking, plan steps and the final answer', () => {
    const raw = [
      '<thinking>The user wants a rollout plan; two steps matter.</thinking>',
      '<plan><step>List the services</step><step>Drain one node at a time</step></plan>',
      '<answer>Start with the stateless services.</answer>',
    ].join('\n');
    const parsed = parsePlannedOutput(raw);
    expect(parsed.hadThinkingTag).toBe(true);
    expect(parsed.hadPlanTag).toBe(true);
    expect(parsed.thinking).toContain('rollout plan');
    expect(parsed.plan).toEqual(['List the services', 'Drain one node at a time']);
    expect(parsed.answer).toBe('Start with the stateless services.');
    expect(parsed.answer).not.toContain('<thinking>');
    expect(parsed.answer).not.toContain('<plan>');
    expect(parsed.answer).not.toContain('<step>');
  });

  it('takes the text after </plan> as the answer when no <answer> tag is present', () => {
    const raw = '<plan><step>calc</step></plan>\nThe result is 100, verified.';
    const parsed = parsePlannedOutput(raw);
    expect(parsed.plan).toEqual(['calc']);
    expect(parsed.answer).toBe('The result is 100, verified.');
  });

  it('accepts list-style steps and messy attribute-bearing tags', () => {
    const raw = '<thinking type="private">hmm</thinking>\n<plan>\n- first do the thing\n- then verify\n</plan>\nFinal answer here.';
    const parsed = parsePlannedOutput(raw);
    expect(parsed.plan).toEqual(['first do the thing', 'then verify']);
    expect(parsed.answer).toBe('Final answer here.');
  });

  it('handles untagged output: everything is the answer, nothing leaks', () => {
    const parsed = parsePlannedOutput('Just a plain engine reply.');
    expect(parsed.thinking).toBeNull();
    expect(parsed.plan).toEqual([]);
    expect(parsed.answer).toBe('Just a plain engine reply.');
    expect(parsed.hadThinkingTag).toBe(false);
  });

  it('clips runaway thinking/steps/answers', () => {
    const raw = `<thinking>${'a'.repeat(10_000)}</thinking><plan>${'<step>' + 's'.repeat(600) + '</step>'.repeat(30)}</plan><answer>${'b'.repeat(50_000)}</answer>`;
    const parsed = parsePlannedOutput(raw);
    expect(parsed.thinking!.length).toBeLessThanOrEqual(4_001);
    expect(parsed.plan.length).toBeLessThanOrEqual(12);
    expect(parsed.plan.every((step) => step.length <= 301)).toBe(true);
    expect(parsed.answer.length).toBeLessThanOrEqual(8_001);
  });

  it('stripAgentTags removes every protocol tag, keeps the prose', () => {
    expect(stripAgentTags('<plan><step>a</step></plan>keep <thinking>this</thinking>')).toContain('keep');
    expect(stripAgentTags('<plan><step>a</step></plan>keep <thinking>this</thinking>')).not.toMatch(/<|>/);
  });
});
