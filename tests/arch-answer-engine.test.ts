import { describe, expect, it } from 'vitest';
import { answerQuestion } from '../src/server/ai/arch-model/answer';
import { detectGaps } from '../src/server/ai/arch-model/hints';
import type { CopilotContext } from '../src/server/ai/context';

const baseContext = (overrides: Partial<CopilotContext> = {}): CopilotContext => ({
  incident: {
    title: 'Checkout latency spike',
    severity: 'HIGH',
    status: 'INVESTIGATING',
    affectedService: 'checkout',
    startedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    resolvedAt: null,
    durationMinutes: 15,
  },
  timeline: [
    { at: new Date(Date.now() - 15 * 60_000).toISOString(), type: 'CREATED', actor: 'integration' },
    { at: new Date(Date.now() - 12 * 60_000).toISOString(), type: 'COMMENT', actor: 'responder', text: 'p99 jumped from 380ms to 4.2s. Investigation in progress.' },
  ],
  omittedTimelineEntries: 0,
  ...overrides,
});

describe('ARCH answer engine (native)', () => {
  it('classifies status questions and returns state', () => {
    const out = answerQuestion("what's the status?", baseContext());
    expect(out.intent).toBe('status');
    expect(out.answer).toMatch(/HIGH/);
    expect(out.confidence).toBe('high');
  });

  it('recognises Hinglish "ab kya karna chahiye" as next-step', () => {
    const out = answerQuestion('ab kya karna chahiye?', baseContext());
    expect(out.intent).toBe('next');
    expect(out.suggestions.length).toBeGreaterThan(0);
  });

  it('answers "why did this happen" as cause', () => {
    const out = answerQuestion('kyun hua?', baseContext());
    expect(out.intent).toBe('cause');
    expect(out.confidence).toBe('low'); // no causal statement in timeline
  });

  it('cites the timeline when root-cause language appears', () => {
    const ctx = baseContext({
      timeline: [
        ...baseContext().timeline,
        { at: new Date().toISOString(), type: 'COMMENT', actor: 'responder', text: 'root cause was a null deref in the payment handler because the upstream returned undefined.' },
      ],
    });
    const out = answerQuestion('why?', ctx);
    expect(out.citations.some((c) => c.source === 'timeline')).toBe(true);
    expect(out.confidence).toBe('high');
  });

  it('returns follow-up suggestions for every question', () => {
    const out = answerQuestion('kitna time lagega?', baseContext());
    expect(Array.isArray(out.suggestions)).toBe(true);
    expect(out.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('gracefully handles unknown intent', () => {
    const out = answerQuestion('banana banana banana', baseContext());
    expect(out.intent).toBe('unknown');
    expect(out.suggestions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ARCH hints (gap detection)', () => {
  it('flags a CRITICAL incident with no assignee', () => {
    const ctx = baseContext({ incident: { ...baseContext().incident, severity: 'CRITICAL' } });
    const hints = detectGaps(ctx);
    expect(hints.some((h) => h.id === 'no-assignee')).toBe(true);
  });

  it('flags a long-stale incident', () => {
    const old = new Date(Date.now() - 45 * 60_000).toISOString();
    const ctx = baseContext({
      incident: { ...baseContext().incident, durationMinutes: 45 },
      timeline: [{ at: old, type: 'CREATED', actor: 'integration' }],
    });
    const hints = detectGaps(ctx, undefined, { staleMinutes: 15 });
    expect(hints.some((h) => h.id === 'stale-incident')).toBe(true);
  });

  it('flags resolution without a recorded cause', () => {
    const ctx = baseContext({
      incident: { ...baseContext().incident, status: 'RESOLVED', resolvedAt: new Date().toISOString(), durationMinutes: 60 },
      timeline: [
        { at: new Date(Date.now() - 60 * 60_000).toISOString(), type: 'CREATED', actor: 'responder' },
        { at: new Date().toISOString(), type: 'STATUS_CHANGED', actor: 'responder', change: 'MONITORING -> RESOLVED' },
      ],
    });
    const hints = detectGaps(ctx);
    expect(hints.some((h) => h.id === 'resolved-without-cause')).toBe(true);
  });

  it('returns empty when nothing is wrong with a new INVESTIGATING LOW incident', () => {
    const ctx = baseContext({
      incident: { ...baseContext().incident, severity: 'LOW', durationMinutes: 2 },
      timeline: [
        { at: new Date(Date.now() - 2 * 60_000).toISOString(), type: 'CREATED', actor: 'responder' },
        { at: new Date(Date.now() - 1 * 60_000).toISOString(), type: 'COMMENT', actor: 'responder', text: 'looking into it — minor css glitch.' },
      ],
    });
    const hints = detectGaps(ctx);
    // "no assignee" should NOT fire for LOW
    expect(hints.find((h) => h.id === 'no-assignee')).toBeUndefined();
  });
});
