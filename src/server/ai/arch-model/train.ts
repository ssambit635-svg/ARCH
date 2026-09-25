import type { IncidentSeverity } from '@/generated/prisma/client';
import { CATEGORIES, CATEGORY_IDS, PATTERNS, SEVERITY_EXAMPLES, type CategoryId } from './knowledge';
import { clip, termCounts, tokenize } from './text';

/**
 * ARCH Model — training.
 *
 * A small, CPU-only model that is trained per organization in well under a second:
 *
 *   1. a TF-IDF retrieval index over every training document (past incidents, public postmortems,
 *      the built-in pattern library) → "similar incidents and how they were fixed";
 *   2. a multinomial Naive Bayes classifier for the failure CATEGORY (deploy, database, dns …);
 *   3. a multinomial Naive Bayes classifier for SEVERITY, trained on the built-in examples plus the
 *      organization's own resolved incidents (their final severity is the label);
 *   4. held-out evaluation for both classifiers, so the numbers shown in the UI are honest.
 *
 * The output is a plain JSON artifact (stored per organization in `arch_models`). It contains
 * redacted snippets only — callers redact incident text BEFORE it reaches `trainArchModel`.
 */

export const ARCH_MODEL_FORMAT = 1;
export const ARCH_MODEL_NAME = 'arch-native-1';

export const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * Where training documents come from:
 *  - team    the organization's own resolved incidents (tenant-scoped, redacted);
 *  - pattern the built-in failure pattern library (original ARCH content);
 *  - public  public postmortems downloaded by `npm run model:fetch-public`;
 *  - code    real bug-fix knowledge (SWE-bench, ManySStuBs4J) via `npm run model:fetch-code`;
 *  - review  human code-review knowledge (github-codereview, CodeReviewer) via
 *            `npm run model:fetch-review`.
 * `code` and `review` only enrich retrieval for code tasks — never the incident classifiers'
 * labels, and never another organization's model (they are shared, read-only corpora).
 */
export type TrainingSource = 'team' | 'pattern' | 'public' | 'code' | 'review';

/** Bulk external corpora: their tokens only enter the vocabulary when seen in ≥2 documents. */
export const EXTERNAL_SOURCES: TrainingSource[] = ['public', 'code', 'review'];

export type TrainingDoc = {
  id: string;
  source: TrainingSource;
  title: string;
  /** Redacted free text: title, timeline notes, summary … */
  text: string;
  severity?: IncidentSeverity;
  category?: CategoryId | null;
  rootCause?: string;
  mitigation?: string[];
  prevention?: string[];
  resolvedMinutes?: number;
  service?: string | null;
  url?: string;
  company?: string;
  occurredAt?: string;
};

/** Sparse multinomial Naive Bayes. `counts[term]` = flattened [classIndex, count, …] pairs. */
export type NaiveBayesArtifact = {
  labels: string[];
  logPriors: number[];
  totals: number[];
  vocabularySize: number;
  counts: Record<string, number[]>;
};

export type IndexedDoc = {
  id: string;
  source: TrainingSource;
  title: string;
  snippet: string;
  category: CategoryId | null;
  /** True when the category came from the classifier rather than a human label. */
  categoryPredicted: boolean;
  severity?: IncidentSeverity;
  rootCause?: string;
  mitigation?: string[];
  prevention?: string[];
  resolvedMinutes?: number;
  service?: string | null;
  url?: string;
  company?: string;
  occurredAt?: string;
  /** Sparse L2-normalized TF-IDF vector: parallel arrays of vocabulary indexes and weights. */
  terms: number[];
  weights: number[];
};

export type ArchModelMetrics = {
  documents: { team: number; pattern: number; public: number; code: number; review: number };
  severity: { trainedOn: number; holdoutAccuracy: number | null; holdoutSize: number; baseline: number | null };
  category: { trainedOn: number; holdoutAccuracy: number | null; holdoutSize: number };
  team: {
    severityCounts: Partial<Record<IncidentSeverity, number>>;
    medianResolveMinutes: Partial<Record<IncidentSeverity, number>>;
    topCategories: { category: CategoryId; count: number }[];
  };
  vocabularySize: number;
  trainingMs: number;
};

export type ArchModelArtifact = {
  format: typeof ARCH_MODEL_FORMAT;
  name: typeof ARCH_MODEL_NAME;
  trainedAt: string;
  vocabulary: string[];
  idf: number[];
  docs: IndexedDoc[];
  severity: NaiveBayesArtifact;
  category: NaiveBayesArtifact;
  metrics: ArchModelMetrics;
};

// ---------------------------------------------------------------------------------------------
// Naive Bayes
// ---------------------------------------------------------------------------------------------

type Example = { tokens: string[]; label: string; weight: number };

export function trainNaiveBayes(examples: Example[], labels: string[]): NaiveBayesArtifact {
  const classCounts = labels.map(() => 0);
  const totals = labels.map(() => 0);
  const dense = new Map<string, number[]>();

  for (const example of examples) {
    const classIndex = labels.indexOf(example.label);
    if (classIndex === -1) continue;
    classCounts[classIndex]! += example.weight;
    for (const [token, count] of termCounts(example.tokens)) {
      let row = dense.get(token);
      if (!row) {
        row = labels.map(() => 0);
        dense.set(token, row);
      }
      row[classIndex]! += count * example.weight;
      totals[classIndex]! += count * example.weight;
    }
  }

  const totalExamples = classCounts.reduce((sum, value) => sum + value, 0) || 1;
  const counts: Record<string, number[]> = {};
  for (const [token, row] of dense) {
    const sparse: number[] = [];
    row.forEach((value, index) => {
      if (value > 0) sparse.push(index, Math.round(value * 100) / 100);
    });
    counts[token] = sparse;
  }

  return {
    labels,
    // Smoothed priors: a class with no examples still gets a small chance.
    logPriors: classCounts.map((count) => Math.log((count + 1) / (totalExamples + labels.length))),
    totals: totals.map((value) => Math.round(value * 100) / 100),
    vocabularySize: Math.max(1, dense.size),
    counts,
  };
}

/** Class probabilities (softmax of log-likelihoods). */
export function predictNaiveBayes(model: NaiveBayesArtifact, tokens: string[]): number[] {
  const scores = [...model.logPriors];
  const alpha = 1;
  for (const [token, count] of termCounts(tokens)) {
    const sparse = model.counts[token];
    if (!sparse) continue; // unseen words carry no evidence
    const row = model.labels.map(() => 0);
    for (let index = 0; index < sparse.length; index += 2) row[sparse[index]!] = sparse[index + 1]!;
    for (let classIndex = 0; classIndex < model.labels.length; classIndex += 1) {
      scores[classIndex]! += count * Math.log((row[classIndex]! + alpha) / (model.totals[classIndex]! + alpha * model.vocabularySize));
    }
  }
  const max = Math.max(...scores);
  const exp = scores.map((score) => Math.exp(score - max));
  const sum = exp.reduce((total, value) => total + value, 0);
  return exp.map((value) => value / sum);
}

function argmax(values: number[]): number {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) if (values[index]! > values[best]!) best = index;
  return best;
}

/** Deterministic pseudo-random split so evaluation numbers are reproducible. */
function isHoldout(id: string, fraction = 0.2): boolean {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000 < fraction;
}

function accuracy(model: NaiveBayesArtifact, examples: Example[]): number | null {
  if (examples.length === 0) return null;
  const correct = examples.filter((example) => model.labels[argmax(predictNaiveBayes(model, example.tokens))] === example.label).length;
  return Math.round((correct / examples.length) * 1000) / 1000;
}

// ---------------------------------------------------------------------------------------------
// Built-in documents
// ---------------------------------------------------------------------------------------------

/** The pattern library as training documents — every organization starts from these. */
export function builtInDocs(): TrainingDoc[] {
  return PATTERNS.map((pattern) => ({
    id: `pattern:${pattern.id}`,
    source: 'pattern' as const,
    title: pattern.title,
    text: `${pattern.title}. ${pattern.symptoms} ${pattern.rootCause}`,
    category: pattern.category,
    rootCause: pattern.rootCause,
    mitigation: pattern.mitigation,
    prevention: pattern.prevention,
  }));
}

function docText(doc: TrainingDoc): string {
  return [doc.title, doc.text, doc.rootCause ?? '', ...(doc.mitigation ?? [])].join('. ');
}

// ---------------------------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------------------------

const MAX_VOCABULARY = 12_000;
const TERMS_PER_DOC = 48;

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

export function trainArchModel(input: TrainingDoc[], options: { now?: Date } = {}): ArchModelArtifact {
  const started = Date.now();
  const docs = [...builtInDocs(), ...input];
  const tokenized = docs.map((doc) => tokenize(docText(doc)));

  // ---- category classifier: patterns + category vocab + human-labelled docs
  const categoryExamples: (Example & { id: string })[] = [];
  for (const category of CATEGORY_IDS) {
    const info = CATEGORIES[category];
    categoryExamples.push({ id: `vocab:${category}`, tokens: tokenize(`${info.label} ${info.vocabulary}`), label: category, weight: 2 });
  }
  docs.forEach((doc, index) => {
    if (doc.category) categoryExamples.push({ id: doc.id, tokens: tokenized[index]!, label: doc.category, weight: doc.source === 'pattern' ? 2 : 1 });
  });
  // Evaluate on held-out human-labelled real-world docs (team + public), then train on everything.
  const categoryHoldout = categoryExamples.filter((example) => !example.id.startsWith('vocab:') && !example.id.startsWith('pattern:') && isHoldout(example.id));
  const categoryEval = trainNaiveBayes(categoryExamples.filter((example) => !categoryHoldout.includes(example)), CATEGORY_IDS);
  const category = trainNaiveBayes(categoryExamples, CATEGORY_IDS);

  // ---- severity classifier: built-in examples + team incidents (weighted higher: it is their scale)
  const severityExamples: (Example & { id: string })[] = SEVERITY_EXAMPLES.map((example, index) => ({
    id: `sev:${index}`,
    tokens: tokenize(example.text),
    label: example.severity,
    weight: 1,
  }));
  docs.forEach((doc, index) => {
    if (doc.source === 'team' && doc.severity) severityExamples.push({ id: doc.id, tokens: tokenized[index]!, label: doc.severity, weight: 1.5 });
  });
  const teamSeverity = severityExamples.filter((example) => !example.id.startsWith('sev:'));
  const severityHoldout = teamSeverity.length >= 10 ? teamSeverity.filter((example) => isHoldout(example.id)) : [];
  const severityEval = trainNaiveBayes(severityExamples.filter((example) => !severityHoldout.includes(example)), SEVERITIES);
  const severity = trainNaiveBayes(severityExamples, SEVERITIES);
  // Majority-class baseline, so "73% accurate" can be compared to "always say MEDIUM".
  const majority = severityHoldout.length
    ? Math.max(...SEVERITIES.map((label) => severityHoldout.filter((example) => example.label === label).length)) / severityHoldout.length
    : null;

  // ---- vocabulary + IDF
  const documentFrequency = new Map<string, number>();
  const keepAlways = new Set<string>();
  tokenized.forEach((tokens, index) => {
    const unique = new Set(tokens);
    for (const token of unique) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    // Team + pattern tokens are always kept; bulk external corpora (public/code/review) only
    // contribute vocabulary seen in at least two documents, so one download cannot blow up the
    // vocabulary or drown the organization's own signal.
    if (!EXTERNAL_SOURCES.includes(docs[index]!.source)) for (const token of unique) keepAlways.add(token);
  });
  const vocabulary = [...documentFrequency.entries()]
    .filter(([token, df]) => df >= 2 || keepAlways.has(token))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, MAX_VOCABULARY)
    .map(([token]) => token);
  const vocabularyIndex = new Map(vocabulary.map((token, index) => [token, index]));
  const total = docs.length;
  const idf = vocabulary.map((token) => Math.round(Math.log(1 + total / (documentFrequency.get(token) ?? 1)) * 1000) / 1000);

  // ---- index every document
  const indexed: IndexedDoc[] = docs.map((doc, index) => {
    const counts = termCounts(tokenized[index]!);
    const weighted: [number, number][] = [];
    for (const [token, count] of counts) {
      const termIndex = vocabularyIndex.get(token);
      if (termIndex === undefined) continue;
      weighted.push([termIndex, (1 + Math.log(count)) * idf[termIndex]!]);
    }
    weighted.sort((a, b) => b[1] - a[1]);
    const top = weighted.slice(0, TERMS_PER_DOC);
    const norm = Math.sqrt(top.reduce((sum, [, weight]) => sum + weight * weight, 0)) || 1;

    let docCategory = doc.category ?? null;
    let categoryPredicted = false;
    if (!docCategory) {
      const probabilities = predictNaiveBayes(category, tokenized[index]!);
      const best = argmax(probabilities);
      if (probabilities[best]! >= 0.5) {
        docCategory = CATEGORY_IDS[best]!;
        categoryPredicted = true;
      }
    }

    const entry: IndexedDoc = {
      id: doc.id,
      source: doc.source,
      title: clip(doc.title, 160),
      snippet: clip(doc.text, 280),
      category: docCategory,
      categoryPredicted,
      terms: top.map(([termIndex]) => termIndex),
      weights: top.map(([, weight]) => Math.round((weight / norm) * 10_000) / 10_000),
    };
    if (doc.severity) entry.severity = doc.severity;
    if (doc.rootCause) entry.rootCause = clip(doc.rootCause, 400);
    if (doc.mitigation?.length) entry.mitigation = doc.mitigation.slice(0, 4).map((item) => clip(item, 240));
    if (doc.prevention?.length) entry.prevention = doc.prevention.slice(0, 4).map((item) => clip(item, 240));
    if (typeof doc.resolvedMinutes === 'number') entry.resolvedMinutes = doc.resolvedMinutes;
    if (doc.service) entry.service = clip(doc.service, 120);
    if (doc.url) entry.url = doc.url;
    if (doc.company) entry.company = clip(doc.company, 80);
    if (doc.occurredAt) entry.occurredAt = doc.occurredAt;
    return entry;
  });

  // ---- team statistics
  const team = indexed.filter((doc) => doc.source === 'team');
  const severityCounts: Partial<Record<IncidentSeverity, number>> = {};
  const medianResolveMinutes: Partial<Record<IncidentSeverity, number>> = {};
  for (const label of SEVERITIES) {
    const rows = team.filter((doc) => doc.severity === label);
    if (rows.length) severityCounts[label] = rows.length;
    const minutes = median(rows.map((doc) => doc.resolvedMinutes).filter((value): value is number => typeof value === 'number'));
    if (minutes !== undefined) medianResolveMinutes[label] = minutes;
  }
  const categoryTally = new Map<CategoryId, number>();
  for (const doc of team) if (doc.category) categoryTally.set(doc.category, (categoryTally.get(doc.category) ?? 0) + 1);

  const metrics: ArchModelMetrics = {
    documents: {
      team: team.length,
      pattern: indexed.filter((doc) => doc.source === 'pattern').length,
      public: indexed.filter((doc) => doc.source === 'public').length,
      code: indexed.filter((doc) => doc.source === 'code').length,
      review: indexed.filter((doc) => doc.source === 'review').length,
    },
    severity: {
      trainedOn: severityExamples.length,
      holdoutAccuracy: accuracy(severityEval, severityHoldout),
      holdoutSize: severityHoldout.length,
      baseline: majority === null ? null : Math.round(majority * 1000) / 1000,
    },
    category: {
      trainedOn: categoryExamples.length,
      holdoutAccuracy: accuracy(categoryEval, categoryHoldout),
      holdoutSize: categoryHoldout.length,
    },
    team: {
      severityCounts,
      medianResolveMinutes,
      topCategories: [...categoryTally.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ category: name, count })),
    },
    vocabularySize: vocabulary.length,
    trainingMs: Date.now() - started,
  };

  return {
    format: ARCH_MODEL_FORMAT,
    name: ARCH_MODEL_NAME,
    trainedAt: (options.now ?? new Date()).toISOString(),
    vocabulary,
    idf,
    docs: indexed,
    severity,
    category,
    metrics,
  };
}

// ---------------------------------------------------------------------------------------------
// Promotion gate — a new version serves only if it beats the one it replaces
// ---------------------------------------------------------------------------------------------

export type PromotionCandidate = { metrics: ArchModelMetrics; teamDocuments: number; totalDocuments: number };
export type PromotionIncumbent = { version: number; score: number; teamDocuments: number };
export type PromotionDecision = { promote: boolean; score: number; reason: string };

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * One comparable number per model: weighted average of the measured holdout accuracies
 * (severity 0.6 / category 0.4). Components that could not be measured are excluded; a model
 * with nothing measured scores 0.
 */
export function modelScore(metrics: ArchModelMetrics): number {
  const parts: [weight: number, accuracy: number][] = [];
  if (metrics.severity.holdoutAccuracy !== null) parts.push([0.6, metrics.severity.holdoutAccuracy]);
  if (metrics.category.holdoutAccuracy !== null) parts.push([0.4, metrics.category.holdoutAccuracy]);
  if (parts.length === 0) return 0;
  const weight = parts.reduce((sum, [w]) => sum + w, 0);
  return round3(parts.reduce((sum, [w, accuracy]) => sum + w * accuracy, 0) / weight);
}

/**
 * Promotion rule (V3): the first model always serves; afterwards a candidate serves only if it
 * BEATS the active model's measured score. Exact ties fall back to data growth — a model trained
 * on strictly more of the team's incidents is the better bet when accuracy is level.
 */
export function decidePromotion(candidate: PromotionCandidate, incumbent: PromotionIncumbent | null): PromotionDecision {
  const score = modelScore(candidate.metrics);
  if (!incumbent) {
    return { promote: true, score, reason: 'First trained model for this workspace.' };
  }
  if (score > incumbent.score) {
    return { promote: true, score, reason: `Beat active v${incumbent.version}: score ${score} vs ${incumbent.score}.` };
  }
  if (score === incumbent.score && candidate.teamDocuments > incumbent.teamDocuments) {
    return { promote: true, score, reason: `Score level with active v${incumbent.version} (${score}) but trained on more team incidents (${candidate.teamDocuments} vs ${incumbent.teamDocuments}).` };
  }
  return { promote: false, score, reason: `Did not beat active v${incumbent.version}: score ${score} vs ${incumbent.score}.` };
}
