import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../src/server/ai/arch-model/knowledge';
import { baseArchModel, loadArchModel } from '../src/server/ai/arch-model/runtime';
import { trainArchModel, type TrainingDoc } from '../src/server/ai/arch-model/train';
import { GOLDEN, SEVERITY_GOLDEN, evaluate, goldenCoversEveryCategory } from '../scripts/arch-model/golden-set';

/**
 * V6 eval harness — the golden set, as a regression alarm.
 *
 * A model is only "accurate" against something you can point at, and CI is where that matters: the
 * set lives in `scripts/arch-model/golden-set.ts` so `npm run model:eval` and this test score the
 * exact same items. Two properties are asserted:
 *
 *   1. the built-in base model is good enough to be trusted (≥75% of the golden set);
 *   2. training on a workspace's own incidents reaches 100% — learning works, and the eval would
 *      notice if it stopped.
 *
 * The set is small and deterministic on purpose: it catches regressions, it is not a benchmark.
 */
describe('arch model eval harness (golden set)', () => {
  it('covers every failure family ARCH knows about', () => {
    expect(goldenCoversEveryCategory()).toBe(true);
    expect(GOLDEN.length).toBeGreaterThanOrEqual(CATEGORY_IDS.length * 1.5);
    for (const item of GOLDEN) expect(CATEGORY_IDS).toContain(item.category);
  });

  it('the built-in base model classifies the golden set above 75%', () => {
    const result = evaluate(baseArchModel());
    expect(result.accuracy).toBeGreaterThanOrEqual(0.75);
    expect(result.total).toBe(GOLDEN.length);
  });

  it('is deterministic — the same input always produces the same verdict', () => {
    const first = evaluate(baseArchModel());
    const second = evaluate(baseArchModel());
    expect(second.accuracy).toBe(first.accuracy);
    expect(second.misses).toEqual(first.misses);
  });

  it('gets the operationally important families right, not just on average', () => {
    const model = baseArchModel();
    // These are the ones a responder acts on immediately; an average can hide a regression here.
    expect(model.classifyCategory('Checkout returning 502 errors right after the api deploy').category).toBe('deploy');
    expect(model.classifyCategory('Worker containers were killed for using too much memory, heap kept growing').category).toBe('memory');
    expect(model.classifyCategory('The TLS certificate on the public API endpoint expired').category).toBe('certificate');
    expect(model.classifyCategory('Pods stuck in CrashLoopBackOff after the helm upgrade').category).toBe('kubernetes');
    expect(model.classifyCategory('Users cannot login, SSO callback failing').category).toBe('auth');
  });

  it('orders severity the way a responder would', () => {
    const model = baseArchModel();
    for (const item of SEVERITY_GOLDEN) {
      expect(model.classifySeverity(item.text).severity, item.text).toBe(item.severity);
    }
  });

  it('training on the workspace’s own incidents fixes the remaining misses', () => {
    // Active learning, evaluated: the golden items become the workspace's resolved incidents and the
    // model must now get every one of them right. If this falls back to the base score, learning is
    // broken even though the base model still looks fine.
    const docs: TrainingDoc[] = GOLDEN.map((item, index) => ({
      id: `team:${index}`,
      source: 'team' as const,
      title: item.text.slice(0, 60),
      text: item.text,
      category: item.category,
    }));
    const artifact = trainArchModel(docs, { now: new Date(0) });
    const result = evaluate(loadArchModel(artifact)!);
    expect(result.misses.join('\n')).toBe('');
    expect(result.accuracy).toBe(1);
    expect(artifact.metrics.documents.team).toBe(docs.length);
  });

  it('a model that has seen nothing still answers, from the built-in pattern library', () => {
    // A small workspace must never get an empty answer: with no team incidents the base model's
    // pattern library still classifies, and severity still resolves.
    const model = loadArchModel(trainArchModel([], { now: new Date(0) }))!;
    expect(model.classifyCategory('The TLS certificate on the public API endpoint expired').category).toBeTruthy();
    expect(model.classifySeverity('Total outage: every request fails').severity).toBe('CRITICAL');
  });
});
