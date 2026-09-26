import type { IncidentSeverity } from '@/generated/prisma/client';
import { CATEGORY_IDS, type CategoryId } from './knowledge';
import { termCounts, tokenize, words } from './text';
import {
  ARCH_MODEL_FORMAT,
  SEVERITIES,
  predictNaiveBayes,
  trainArchModel,
  type ArchModelArtifact,
  type IndexedDoc,
  type TrainingSource,
} from './train';
import { buildEmbeddingSpace, cosine, embedTokens, spaceIdf, type EmbeddingSpace } from './embeddings';

/**
 * ARCH Model — inference.
 *
 * Wraps a trained artifact with the three things the Copilot needs: "what kind of failure is
 * this?", "how bad is it?" and "what does it look like from the past?". Pure CPU, microseconds.
 *
 * V6 adds two things: calibrated confidence (the temperature fitted on the holdout split, so a
 * reported 80% really means about 80%) and dense embeddings, so retrieval matches meaning as well
 * as words.
 */

export type SimilarDoc = { doc: IndexedDoc; score: number };

export type CategoryPrediction = { category: CategoryId; confidence: number; ranked: { category: CategoryId; p: number }[] };
export type SeverityPrediction = { severity: IncidentSeverity; probabilities: Record<IncidentSeverity, number> };

export class ArchModelRuntime {
  private readonly vocabularyIndex: Map<string, number>;
  /** V6 — dense space over the same documents the TF-IDF index uses. */
  private readonly embeddingSpace: EmbeddingSpace;
  private readonly documentVectors = new Map<string, number[]>();

  constructor(readonly artifact: ArchModelArtifact) {
    if (artifact.format !== ARCH_MODEL_FORMAT) throw new Error(`Unsupported ARCH model format ${String(artifact.format)}`);
    this.vocabularyIndex = new Map(artifact.vocabulary.map((token, index) => [token, index]));
    this.embeddingSpace = buildEmbeddingSpace(
      artifact.docs.map((doc) => ({ id: doc.id, tokens: words(`${doc.title} ${doc.snippet}`) })),
      { minDocumentFrequency: 1 },
    );
  }

  get name(): string {
    return this.artifact.name;
  }

  get trainedAt(): string {
    return this.artifact.trainedAt;
  }

  get teamDocuments(): number {
    return this.artifact.metrics.documents.team;
  }

  /** Temperature fitted on the holdout split; 1 when the artifact predates calibration. */
  private temperature(kind: 'severity' | 'category'): number {
    return this.artifact.calibration?.[kind]?.temperature ?? 1;
  }

  classifyCategory(text: string): CategoryPrediction {
    const probabilities = predictNaiveBayes(this.artifact.category, tokenize(text), this.temperature('category'));
    const ranked = probabilities
      .map((p, index) => ({ category: CATEGORY_IDS[index]!, p: Math.round(p * 1000) / 1000 }))
      .sort((a, b) => b.p - a.p);
    return { category: ranked[0]!.category, confidence: ranked[0]!.p, ranked: ranked.slice(0, 3) };
  }

  classifySeverity(text: string): SeverityPrediction {
    const probabilities = predictNaiveBayes(this.artifact.severity, tokenize(text), this.temperature('severity'));
    const record = Object.fromEntries(SEVERITIES.map((label, index) => [label, probabilities[index]!])) as Record<IncidentSeverity, number>;
    const best = SEVERITIES.reduce((a, b) => (record[b] > record[a] ? b : a));
    return { severity: best, probabilities: record };
  }

  /** Cosine similarity over TF-IDF vectors. */
  similar(text: string, options: { k?: number; minScore?: number; sources?: TrainingSource[]; excludeIds?: string[] } = {}): SimilarDoc[] {
    const k = options.k ?? 3;
    const minScore = options.minScore ?? 0.12;
    const sparse = this.sparseScores(text);
    const results: SimilarDoc[] = [];
    for (const doc of this.artifact.docs) {
      if (options.sources && !options.sources.includes(doc.source)) continue;
      if (options.excludeIds?.includes(doc.id)) continue;
      const score = sparse.get(doc.id) ?? 0;
      if (score >= minScore) results.push({ doc, score: Math.round(score * 1000) / 1000 });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }

  /**
   * V6 — similarity that also understands meaning. The dense score is blended with the sparse one
   * (0.6 dense), so a document that merely shares common words does not outrank one that describes
   * the same failure in different words. Documents the embedding space has no vector for keep their
   * TF-IDF score alone.
   */
  similarDense(text: string, options: { k?: number; minScore?: number; sources?: TrainingSource[]; excludeIds?: string[]; denseWeight?: number } = {}): SimilarDoc[] {
    const k = options.k ?? 5;
    const minScore = options.minScore ?? 0.12;
    const denseWeight = options.denseWeight ?? 0.6;
    const sparse = this.sparseScores(text);
    const queryVector = embedTokens(this.embeddingSpace, words(text), spaceIdf(this.embeddingSpace));

    const results: SimilarDoc[] = [];
    for (const doc of this.artifact.docs) {
      if (options.sources && !options.sources.includes(doc.source)) continue;
      if (options.excludeIds?.includes(doc.id)) continue;
      const sparseScore = sparse.get(doc.id) ?? 0;
      const documentVector = queryVector ? this.documentVector(doc) : null;
      const denseScore = documentVector && queryVector ? Math.max(0, cosine(queryVector, documentVector)) : 0;
      const score = documentVector ? denseWeight * denseScore + (1 - denseWeight) * sparseScore : sparseScore;
      if (score >= minScore) results.push({ doc, score: Math.round(score * 1000) / 1000 });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }

  /** TF-IDF cosine of `text` against every indexed document, keyed by document id. */
  private sparseScores(text: string): Map<string, number> {
    const query = new Map<number, number>();
    for (const [token, count] of termCounts(tokenize(text))) {
      const termIndex = this.vocabularyIndex.get(token);
      if (termIndex === undefined) continue;
      query.set(termIndex, (1 + Math.log(count)) * this.artifact.idf[termIndex]!);
    }
    const scores = new Map<string, number>();
    const norm = Math.sqrt([...query.values()].reduce((sum, weight) => sum + weight * weight, 0));
    if (norm === 0) return scores;
    for (const doc of this.artifact.docs) {
      let dot = 0;
      for (let index = 0; index < doc.terms.length; index += 1) {
        const weight = query.get(doc.terms[index]!);
        if (weight) dot += weight * doc.weights[index]!;
      }
      scores.set(doc.id, dot / norm);
    }
    return scores;
  }

  /** Cached dense vector of one indexed document. */
  private documentVector(doc: IndexedDoc): number[] | null {
    const cached = this.documentVectors.get(doc.id);
    if (cached) return cached;
    const vector = embedTokens(this.embeddingSpace, words(`${doc.title} ${doc.snippet}`), spaceIdf(this.embeddingSpace));
    if (vector) this.documentVectors.set(doc.id, vector);
    return vector;
  }
}

// ---------------------------------------------------------------------------------------------
// Base model (built-in knowledge only) — used before an organization has trained its own.
// ---------------------------------------------------------------------------------------------

let base: ArchModelRuntime | null = null;

export function baseArchModel(): ArchModelRuntime {
  if (!base) base = new ArchModelRuntime(trainArchModel([], { now: new Date(0) }));
  return base;
}

export function loadArchModel(artifact: unknown): ArchModelRuntime | null {
  try {
    return new ArchModelRuntime(artifact as ArchModelArtifact);
  } catch {
    return null;
  }
}
