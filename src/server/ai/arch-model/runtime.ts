import type { IncidentSeverity } from '@/generated/prisma/client';
import { CATEGORY_IDS, type CategoryId } from './knowledge';
import { termCounts, tokenize } from './text';
import {
  ARCH_MODEL_FORMAT,
  SEVERITIES,
  predictNaiveBayes,
  trainArchModel,
  type ArchModelArtifact,
  type IndexedDoc,
  type TrainingSource,
} from './train';

/**
 * ARCH Model — inference.
 *
 * Wraps a trained artifact with the three things the Copilot needs: "what kind of failure is
 * this?", "how bad is it?" and "what does it look like from the past?". Pure CPU, microseconds.
 */

export type SimilarDoc = { doc: IndexedDoc; score: number };

export type CategoryPrediction = { category: CategoryId; confidence: number; ranked: { category: CategoryId; p: number }[] };
export type SeverityPrediction = { severity: IncidentSeverity; probabilities: Record<IncidentSeverity, number> };

export class ArchModelRuntime {
  private readonly vocabularyIndex: Map<string, number>;

  constructor(readonly artifact: ArchModelArtifact) {
    if (artifact.format !== ARCH_MODEL_FORMAT) throw new Error(`Unsupported ARCH model format ${String(artifact.format)}`);
    this.vocabularyIndex = new Map(artifact.vocabulary.map((token, index) => [token, index]));
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

  classifyCategory(text: string): CategoryPrediction {
    const probabilities = predictNaiveBayes(this.artifact.category, tokenize(text));
    const ranked = probabilities
      .map((p, index) => ({ category: CATEGORY_IDS[index]!, p: Math.round(p * 1000) / 1000 }))
      .sort((a, b) => b.p - a.p);
    return { category: ranked[0]!.category, confidence: ranked[0]!.p, ranked: ranked.slice(0, 3) };
  }

  classifySeverity(text: string): SeverityPrediction {
    const probabilities = predictNaiveBayes(this.artifact.severity, tokenize(text));
    const record = Object.fromEntries(SEVERITIES.map((label, index) => [label, probabilities[index]!])) as Record<IncidentSeverity, number>;
    const best = SEVERITIES.reduce((a, b) => (record[b] > record[a] ? b : a));
    return { severity: best, probabilities: record };
  }

  /** Cosine similarity over TF-IDF vectors. */
  similar(text: string, options: { k?: number; minScore?: number; sources?: TrainingSource[]; excludeIds?: string[] } = {}): SimilarDoc[] {
    const k = options.k ?? 3;
    const minScore = options.minScore ?? 0.12;
    const query = new Map<number, number>();
    for (const [token, count] of termCounts(tokenize(text))) {
      const termIndex = this.vocabularyIndex.get(token);
      if (termIndex === undefined) continue;
      query.set(termIndex, (1 + Math.log(count)) * this.artifact.idf[termIndex]!);
    }
    const norm = Math.sqrt([...query.values()].reduce((sum, weight) => sum + weight * weight, 0));
    if (norm === 0) return [];

    const results: SimilarDoc[] = [];
    for (const doc of this.artifact.docs) {
      if (options.sources && !options.sources.includes(doc.source)) continue;
      if (options.excludeIds?.includes(doc.id)) continue;
      let dot = 0;
      for (let index = 0; index < doc.terms.length; index += 1) {
        const weight = query.get(doc.terms[index]!);
        if (weight) dot += weight * doc.weights[index]!;
      }
      const score = dot / norm;
      if (score >= minScore) results.push({ doc, score: Math.round(score * 1000) / 1000 });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, k);
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
