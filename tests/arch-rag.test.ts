import { describe, expect, it } from 'vitest';
import {
  buildEmbeddingSpace,
  cosine,
  embedTokens,
  quantize,
  randomIndexVector,
  spaceIdf,
} from '@/server/ai/arch-model/embeddings';
import { chunkText, estimateTokens } from '@/server/ai/rag/chunking';
import { isCitable, rankChunks } from '@/server/ai/rag/retrieve';
import { changeFeatures, scoreChangeRisk, trainChangeRisk } from '@/server/ai/arch-model/risk';
import { generateReproductionTest } from '@/server/ai/code/reproduction';
import { fitTemperature, predictNaiveBayes, trainArchModel, trainNaiveBayes, type TrainingDoc } from '@/server/ai/arch-model/train';
import { ArchModelRuntime } from '@/server/ai/arch-model/runtime';
import { words } from '@/server/ai/arch-model/text';

/**
 * V6 — the pure pieces: embeddings, chunking, hybrid retrieval, change risk, calibration and
 * reproduction-test generation. No database, no network, no clock — all deterministic.
 */

/**
 * A corpus with a clear co-occurrence structure: the OOM words always appear together, the
 * certificate words always appear together, and the two families never mix. Random indexing has to
 * recover that from context alone.
 */
const OOM_LINE = 'container killed by kernel after hitting cgroup memory limit; raising the limit fixed it';
const CERT_LINE = 'tls certificate on the public endpoint expired and every handshake failed';
const DB_LINE = 'database connection pool exhausted under load; queries timed out until pool size raised';
const OOM_DOCS = Array.from({ length: 12 }, (_, index) => ({
  id: `oom-${index}`,
  tokens: words(`${OOM_LINE}. ${index % 2 ? 'payments api restarted overnight' : 'worker pods restarted'}`),
})).concat(
  Array.from({ length: 6 }, (_, index) => ({ id: `cert-${index}`, tokens: words(CERT_LINE) })),
  Array.from({ length: 6 }, (_, index) => ({ id: `db-${index}`, tokens: words(DB_LINE) })),
);

describe('embeddings', () => {
  it('is deterministic: the same term always gets the same random index vector', () => {
    expect(randomIndexVector('oom')).toEqual(randomIndexVector('oom'));
    expect(randomIndexVector('oom')).not.toEqual(randomIndexVector('memory'));
  });

  it('puts terms that share a context close together', () => {
    const space = buildEmbeddingSpace(OOM_DOCS, { minDocumentFrequency: 1 });
    // "pool" and "connection" only ever appear in the database documents; "pool" and "tls" never do.
    expect(space.terms['pool']).toBeDefined();
    expect(space.terms['tls']).toBeDefined();
    expect(cosine(space.terms['pool']!, space.terms['connection']!)).toBeGreaterThan(cosine(space.terms['pool']!, space.terms['tls']!));
  });

  it('embeds text with no known terms as null so callers can fall back', () => {
    const space = buildEmbeddingSpace(OOM_DOCS, { minDocumentFrequency: 1 });
    expect(embedTokens(space, words('zzzz qqqq'))).toBeNull();
    expect(embedTokens(space, words('container killed'))).not.toBeNull();
  });

  it('weights terms by inverse document frequency', () => {
    const space = buildEmbeddingSpace(OOM_DOCS, { minDocumentFrequency: 1 });
    const idf = spaceIdf(space);
    // "certificate" appears in one document, "the" style words are stopwords, so idf is >= 1.
    expect(idf['certificate']).toBeGreaterThan(0);
  });

  it('quantizes vectors for compact storage', () => {
    const vector = quantize([0.123456, -0.987654], 4);
    expect(vector).toEqual([0.1235, -0.9877]);
  });
});

describe('dense retrieval finds the same failure written differently', () => {
  it('ranks the OOM documents first for an OOM query that shares few words', () => {
    const docs: TrainingDoc[] = [
      { id: 'team:1', source: 'team', title: 'payments-api pods restarted overnight', text: 'Container was killed by the kernel after hitting its cgroup limit.', severity: 'HIGH', category: 'kubernetes' },
      { id: 'team:2', source: 'team', title: 'worker pods killed', text: 'The kernel killed the container when it exceeded its memory limit.', severity: 'HIGH', category: 'kubernetes' },
      { id: 'team:3', source: 'team', title: 'checkout 502s after deploy', text: 'Bad release broke the payments path; rollback restored service.', severity: 'CRITICAL', category: 'deploy' },
      { id: 'team:4', source: 'team', title: 'cert expired on api', text: 'TLS certificate expired, handshake failures everywhere.', severity: 'MEDIUM', category: 'certificate' },
    ];
    const model = new ArchModelRuntime(trainArchModel(docs));
    // A query in different words than the incident used — exactly the case TF-IDF fails at.
    const query = 'kernel terminated our containers for using too much memory';
    const sparse = model.similar(query, { k: 6, minScore: 0 });
    const dense = model.similarDense(query, { k: 6, minScore: 0 });

    // Both find the team's own OOM incidents, but the dense score is far higher, and the pattern
    // library entry it falls back to is the right one (memory) instead of an unrelated family.
    const sparseTeam = sparse.find((hit) => hit.doc.id === 'team:1')!;
    const denseTeam = dense.find((hit) => hit.doc.id === 'team:1')!;
    expect(sparseTeam.score).toBeGreaterThan(0);
    expect(denseTeam.score).toBeGreaterThan(sparseTeam.score * 1.5);
    expect(dense.map((hit) => hit.doc.id).slice(0, 2)).toEqual(['team:2', 'team:1']);
    expect(dense.some((hit) => hit.doc.id === 'pattern:memory-leak')).toBe(true);
  });
});

describe('chunking', () => {
  it('splits on headings and keeps the heading with its content', () => {
    const text = [
      '# Runbook: database pool exhaustion',
      '',
      'Symptoms: queries time out and the pool shows max connections.',
      '',
      'Steps: raise the pool size, then check for leaked connections.',
      '',
      '# Escalation',
      '',
      'Page the database on-call if the pool stays saturated for ten minutes.',
    ].join('\n');
    const chunks = chunkText(text, { maxChars: 200, minChars: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.heading).toBe('Runbook: database pool exhaustion');
    expect(chunks.some((chunk) => chunk.heading === 'Escalation')).toBe(true);
    expect(chunks[0]!.ordinal).toBe(0);
  });

  it('never loses content: every chunk is non-empty and ordinals are contiguous', () => {
    const text = Array.from({ length: 40 }, (_, index) => `Paragraph ${index} about connection pools and timeouts.`).join('\n\n');
    const chunks = chunkText(text, { maxChars: 300 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.text.trim().length > 0)).toBe(true);
    expect(chunks.map((chunk) => chunk.ordinal)).toEqual(chunks.map((_, index) => index));
  });

  it('estimates token counts', () => {
    expect(estimateTokens('one two three')).toBe(3);
  });
});

describe('hybrid retrieval', () => {
  const chunks = [
    { id: 'c1', text: 'Raise the database connection pool size and check for leaked connections.', embedding: [1, 0, 0, 0] },
    { id: 'c2', text: 'Rotate the TLS certificate before it expires and alert at 30 days.', embedding: [0, 1, 0, 0] },
    { id: 'c3', text: 'Roll back the payments deploy and verify the checkout success rate.', embedding: [0, 0, 1, 0] },
  ];

  it('ranks by keyword when no space is supplied', () => {
    const ranked = rankChunks(chunks, 'certificate expiry', { k: 2, minScore: 0 });
    expect(ranked[0]!.chunk.id).toBe('c2');
    expect(ranked[0]!.keyword).toBeGreaterThan(0);
    expect(ranked[0]!.dense).toBe(0);
  });

  it('blends the dense signal when a space is supplied', () => {
    const space = buildEmbeddingSpace(
      [
        ...OOM_DOCS,
        { id: 'k1', tokens: words('Raise the database connection pool size and check for leaked connections.') },
        { id: 'k2', tokens: words('Rotate the TLS certificate before it expires and alert at 30 days.') },
        { id: 'k3', tokens: words('Roll back the payments deploy and verify the checkout success rate.') },
      ],
      { minDocumentFrequency: 1 },
    );
    const withVectors = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embedTokens(space, words(chunk.text), spaceIdf(space)) ?? chunk.embedding,
    }));
    const ranked = rankChunks(withVectors, 'database pool exhausted', { space, k: 1, minScore: 0 });
    expect(ranked[0]!.chunk.id).toBe('c1');
    expect(ranked[0]!.dense).toBeGreaterThanOrEqual(0);
  });

  it('only cites chunks that scored well on meaning or words', () => {
    expect(isCitable({ chunk: {}, score: 0.4, dense: 0.5, keyword: 0.1 })).toBe(true);
    expect(isCitable({ chunk: {}, score: 0.05, dense: 0.1, keyword: 0.02 })).toBe(false);
  });

  it('returns nothing for an empty query', () => {
    expect(rankChunks(chunks, '   ', {})).toEqual([]);
  });
});

describe('change risk', () => {
  const baseChange: Parameters<typeof changeFeatures>[0] = {
    type: 'DEPLOYMENT',
    serviceName: 'payments-api',
    serviceCategory: 'database',
    author: 'riya',
    occurredAt: new Date('2026-09-26T02:30:00Z'),
    filesChanged: 40,
    commitMessage: 'bump connection pool',
  };
  const changeFor = (overrides: Partial<Parameters<typeof changeFeatures>[0]> = {}) => ({ ...baseChange, ...overrides });
  const featuresFor = (overrides: Partial<Parameters<typeof changeFeatures>[0]> = {}) => changeFeatures(changeFor(overrides));

  it('derives explainable categorical features', () => {
    const features = featuresFor();
    expect(features['type']).toBe('deployment');
    expect(features['hourBucket']).toBe('night');
    expect(features['filesBucket']).toBe('medium');
    expect(features['authorKind']).toBe('human');
    expect(features['category']).toBe('database');
  });

  it('flags bot authors and revert messages', () => {
    expect(featuresFor({ author: 'dependabot[bot]' })['authorKind']).toBe('bot');
    expect(featuresFor({ commitMessage: 'revert: bad deploy' })['msg:revert']).toBe('yes');
  });

  it('refuses to score without history instead of inventing a number', () => {
    const empty = trainChangeRisk([]);
    expect(scoreChangeRisk(empty, changeFor()).fallback).toBe(true);
    const small = trainChangeRisk(Array.from({ length: 10 }, () => ({ features: featuresFor(), incident: false })));
    expect(scoreChangeRisk(small, changeFor()).fallback).toBe(true);
  });

  it('learns that night deploys of a large change are followed by incidents', () => {
    const riskyChange = changeFor();
    const safeChange = changeFor({ occurredAt: new Date('2026-09-26T11:00:00Z'), filesChanged: 2, type: 'CONFIG_CHANGE' });
    const examples = [
      ...Array.from({ length: 12 }, () => ({ features: changeFeatures(riskyChange), incident: true, weight: 3 })),
      ...Array.from({ length: 30 }, () => ({ features: changeFeatures(safeChange), incident: false })),
    ];
    const model = trainChangeRisk(examples);
    const risky = scoreChangeRisk(model, riskyChange);
    const safe = scoreChangeRisk(model, safeChange);
    expect(risky.fallback).toBe(false);
    expect(risky.probability).toBeGreaterThan(safe.probability);
    expect(risky.band === 'HIGH' || risky.band === 'ELEVATED').toBe(true);
    expect(safe.band === 'LOW' || safe.band === 'GUARDED').toBe(true);
    expect(risky.drivers.length).toBeGreaterThan(0);
    expect(risky.drivers[0]!.lift).toBeGreaterThan(0);
  });
});

describe('calibration', () => {
  it('softens an over-confident classifier so a reported 80% means 80%', () => {
    // A model that always says HIGH with near-certainty, evaluated on mixed labels.
    const examples = Array.from({ length: 60 }, (_, index) => ({
      tokens: words(`deploy broke checkout, error rate spiked, rollback ${index % 3}`),
      label: index % 4 === 0 ? 'MEDIUM' : 'HIGH',
      weight: 1,
    }));
    const labels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const model = trainNaiveBayes(examples, labels);
    const calibration = fitTemperature(model, examples);

    // How often the model's top choice is actually right, and how sure it was.
    let correct = 0;
    let confidenceSum = 0;
    for (const example of examples) {
      const probabilities = predictNaiveBayes(model, example.tokens, calibration.temperature);
      const best = probabilities.indexOf(Math.max(...probabilities));
      if (labels[best] === example.label) correct += 1;
      confidenceSum += probabilities[best]!;
    }
    const accuracy = correct / examples.length;
    const meanConfidence = confidenceSum / examples.length;
    // Calibration means the reported confidence tracks the measured accuracy.
    expect(Math.abs(meanConfidence - accuracy)).toBeLessThan(0.2);
    expect(calibration.holdoutSize).toBe(examples.length);
    expect(calibration.nll).not.toBeNull();
  });

  it('stays at temperature 1 when there is nothing to fit', () => {
    const model = trainNaiveBayes([{ tokens: words('db pool exhausted'), label: 'HIGH', weight: 1 }], ['LOW', 'HIGH']);
    expect(fitTemperature(model, [])).toEqual({ temperature: 1, holdoutSize: 0, nll: null });
  });

  it('folds human feedback into the classifiers with a heavier weight', () => {
    const docs: TrainingDoc[] = [
      { id: 'team:1', source: 'team', title: 'checkout 502s', text: 'Bad release broke the payments path.', severity: 'CRITICAL', category: 'deploy' },
      { id: 'team:2', source: 'team', title: 'typo on pricing page', text: 'Copy fix, no customer impact.', severity: 'LOW', category: 'config' },
    ];
    const feedback = [{ id: 'feedback:1', tokens: words('checkout 502s after deploy'), severity: 'MEDIUM' as const, weight: 3 }];
    const trained = trainArchModel(docs, { feedback });
    expect(trained.metrics.feedbackExamples).toBe(1);
    expect(trained.metrics.severity.trainedOn).toBeGreaterThan(2);
    expect(trained.calibration?.severity).toBeDefined();
  });
});

describe('reproduction test generation', () => {
  it('writes a vitest skeleton for TypeScript incidents', () => {
    const test = generateReproductionTest({
      incidentTitle: 'Checkout 502s after payments deploy',
      language: 'typescript',
      diagnosis: null,
      topFrameFile: '/srv/api/src/db/pool.ts',
    });
    expect(test.path).toBe('tests/repro-checkout-502s-after-payments-deploy.test.ts');
    expect(test.source).toContain('describe(');
    expect(test.source).toContain('src/db/pool');
    expect(test.todos.length).toBeGreaterThan(0);
  });

  it('writes a pytest skeleton for Python incidents', () => {
    const test = generateReproductionTest({ incidentTitle: 'worker crash', language: 'python', diagnosis: null, topFrameFile: null });
    expect(test.path).toContain('.py');
    expect(test.source).toContain('pytest.raises');
  });

  it('writes a Go test and a JUnit test for those stacks', () => {
    expect(generateReproductionTest({ incidentTitle: 'nil panic', language: 'go', diagnosis: null, topFrameFile: null }).source).toContain('func TestRepro');
    expect(generateReproductionTest({ incidentTitle: 'npe', language: 'java', diagnosis: null, topFrameFile: null }).source).toContain('assertThrows');
  });

  it('never interpolates the incident title in a way that can break the file', () => {
    const test = generateReproductionTest({ incidentTitle: 'weird */ title', language: 'typescript', diagnosis: null, topFrameFile: null });
    expect(test.source).not.toContain('*/ describe');
    expect(test.path).toMatch(/^tests\/repro-[a-z0-9-]+\.test\.ts$/);
  });
});
