/**
 * RAG — hybrid retrieval over an organization's knowledge chunks.
 *
 * Two signals, because each one alone misses things:
 *   - **dense** (cosine over ARCH's own embeddings) catches paraphrase: "OOMKilled" ≈
 *     "container exceeded its memory limit";
 *   - **keyword** (cosine over chunk TF-ICF vectors) catches exact terms embeddings smooth away:
 *     error codes, service names, `ECONNREFUSED`, a specific runbook title.
 *
 * The final score is the weighted mix, so a chunk has to be relevant in meaning *or* in words.
 * Pure functions only: the service loads the chunks, this ranks them.
 */

import { cosine, embedTokens, spaceIdf, type EmbeddingSpace } from '../arch-model/embeddings';
import { termCounts, tokenize } from '../arch-model/text';

export type RetrievableChunk = {
  id: string;
  text: string;
  heading?: string | null;
  /** Dense vector stored at ingest time; null when the chunk predates embeddings. */
  embedding?: number[] | null;
  /** Editorial weight: 1 is neutral, runbooks may be boosted above raw notes. */
  weight?: number;
};

export type RankedChunk<T> = {
  chunk: T;
  score: number;
  dense: number;
  keyword: number;
};

export type RankOptions = {
  space?: EmbeddingSpace | null;
  k?: number;
  minScore?: number;
  /** Share of the score carried by the dense signal (0–1). */
  denseWeight?: number;
};

const DEFAULT_DENSE_WEIGHT = 0.6;

/** Inverse chunk frequency — the "idf" of a chunk collection. */
function chunkIdf(chunks: RetrievableChunk[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const chunk of chunks) {
    for (const token of new Set(tokenize(chunk.text))) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [token, count] of frequency) idf.set(token, Math.log(1 + chunks.length / count));
  return idf;
}

function sparseVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const vector = new Map<string, number>();
  for (const [token, count] of termCounts(tokens)) {
    const weight = idf.get(token);
    if (weight === undefined) continue;
    vector.set(token, (1 + Math.log(count)) * weight);
  }
  return vector;
}

function cosineSparse(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [, value] of a) normA += value * value;
  for (const [, value] of b) normB += value * value;
  if (normA === 0 || normB === 0) return 0;
  for (const [token, value] of a) {
    const other = b.get(token);
    if (other !== undefined) dot += value * other;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Rank chunks for a query. Chunks without an embedding still compete on the keyword signal, so a
 * corpus ingested before embeddings existed keeps working.
 */
export function rankChunks<T extends RetrievableChunk>(chunks: T[], query: string, options: RankOptions = {}): RankedChunk<T>[] {
  const k = options.k ?? 3;
  const minScore = options.minScore ?? 0.05;
  const denseWeight = options.denseWeight ?? DEFAULT_DENSE_WEIGHT;
  if (chunks.length === 0 || !query.trim()) return [];

  const idf = chunkIdf(chunks);
  const queryTokens = tokenize(query);
  const queryVector = sparseVector(queryTokens, idf);

  const space = options.space ?? null;
  const queryEmbedding = space ? embedTokens(space, queryTokens, spaceIdf(space)) : null;
  const usableDense = Boolean(queryEmbedding);

  const ranked: RankedChunk<T>[] = [];
  for (const chunk of chunks) {
    const keyword = cosineSparse(queryVector, sparseVector(tokenize(chunk.text), idf));
    const dense = usableDense && chunk.embedding?.length && queryEmbedding ? cosine(queryEmbedding, chunk.embedding) : 0;
    const score = usableDense ? denseWeight * dense + (1 - denseWeight) * keyword : keyword;
    const weighted = score * (chunk.weight ?? 1);
    if (weighted >= minScore) {
      ranked.push({ chunk, score: round(weighted), dense: round(dense), keyword: round(keyword) });
    }
  }
  return ranked.sort((a, b) => b.score - a.score).slice(0, k);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** True when a chunk is relevant enough to cite — used to keep weak matches out of drafts. */
export function isCitable(ranked: RankedChunk<unknown>): boolean {
  return ranked.score >= 0.12 && (ranked.dense >= 0.35 || ranked.keyword >= 0.2);
}
