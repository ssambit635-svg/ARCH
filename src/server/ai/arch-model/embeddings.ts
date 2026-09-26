/**
 * ARCH Model — dense embeddings, trained in-process.
 *
 * Why this exists: TF-IDF retrieval matches *words*, not *meaning*. "Pods OOMKilled" and
 * "containers killed because memory limit was exceeded" share almost no tokens, so a responder
 * looking for one never finds the other — even though they are the same failure.
 *
 * Random Indexing (Kanerva, Kristoferson & Holst) fixes that for a few hundred lines of plain
 * TypeScript: every term is given a fixed, *sparse random* vector; a term's context vector is the
 * sum of the random vectors of the terms that appear near it. Terms that show up in the same
 * contexts (oom, memory, killed, limit) end up close together, and a document vector is the
 * IDF-weighted mean of its terms' context vectors.
 *
 * Properties that matter for ARCH:
 *   - **Deterministic** — the seed comes from the term itself, so a model trained on one machine
 *     behaves identically on another (same guarantee the tokenizer already makes).
 *   - **Offline** — no embedding API, no model download, no GPU, no network.
 *   - **Cheap** — one pass over the corpus, O(tokens × window × non-zeros).
 *   - **Tenant-scoped** — the space is built from the organization's own documents only.
 */

/** A trained embedding space: term → dense context vector. */
export type EmbeddingSpace = {
  dims: number;
  window: number;
  /** term → L2-normalized context vector. */
  terms: Record<string, number[]>;
  /** Number of documents each term appeared in (useful for weighting). */
  documentFrequency: Record<string, number>;
  /** How many documents the space was built from. */
  documents: number;
};

export type EmbeddingOptions = {
  dims?: number;
  window?: number;
  /** Non-zeros per random index vector (2–8; 4 is the classic setting). */
  nonZeros?: number;
  /** Ignore terms rarer than this many documents — noise control. */
  minDocumentFrequency?: number;
};

const DEFAULT_DIMS = 64;
const DEFAULT_WINDOW = 4;
const DEFAULT_NON_ZEROS = 4;

/** FNV-1a — the same hash the holdout split uses, so behaviour is reproducible. */
function hashTerm(term: string): number {
  let hash = 2166136261;
  for (let index = 0; index < term.length; index += 1) {
    hash ^= term.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 — tiny deterministic PRNG. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The fixed sparse random vector of a term. Deterministic in the term string, so the same term
 * always gets the same vector — in training and at inference, on every machine.
 */
export function randomIndexVector(term: string, dims = DEFAULT_DIMS, nonZeros = DEFAULT_NON_ZEROS): number[] {
  const random = prng(hashTerm(term));
  const vector = new Array<number>(dims).fill(0);
  const used = new Set<number>();
  let placed = 0;
  let guard = 0;
  while (placed < nonZeros && guard < nonZeros * 20) {
    guard += 1;
    const index = Math.floor(random() * dims);
    if (used.has(index)) continue;
    used.add(index);
    vector[index] = random() < 0.5 ? -1 : 1;
    placed += 1;
  }
  return vector;
}

export type EmbeddingDocument = { id: string; tokens: string[] };

/**
 * Build the embedding space from already-tokenized documents. Terms that appear in fewer than
 * `minDocumentFrequency` documents get no vector — they cannot contribute co-occurrence evidence
 * and would only add noise.
 */
export function buildEmbeddingSpace(documents: EmbeddingDocument[], options: EmbeddingOptions = {}): EmbeddingSpace {
  const dims = options.dims ?? DEFAULT_DIMS;
  const window = options.window ?? DEFAULT_WINDOW;
  const nonZeros = options.nonZeros ?? DEFAULT_NON_ZEROS;
  const minDf = options.minDocumentFrequency ?? 2;

  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const token of new Set(document.tokens)) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }

  const indexVectors = new Map<string, number[]>();
  const contextSums = new Map<string, number[]>();
  const addContext = (term: string, vector: number[], weight: number) => {
    let sum = contextSums.get(term);
    if (!sum) {
      sum = new Array<number>(dims).fill(0);
      contextSums.set(term, sum);
    }
    for (let index = 0; index < dims; index += 1) sum[index]! += vector[index]! * weight;
  };
  const indexVectorFor = (term: string): number[] => {
    let vector = indexVectors.get(term);
    if (!vector) {
      vector = randomIndexVector(term, dims, nonZeros);
      indexVectors.set(term, vector);
    }
    return vector;
  };

  for (const document of documents) {
    const tokens = document.tokens;
    for (let position = 0; position < tokens.length; position += 1) {
      const term = tokens[position]!;
      if ((documentFrequency.get(term) ?? 0) < minDf) continue;
      for (let offset = -window; offset <= window; offset += 1) {
        if (offset === 0) continue;
        const neighbour = tokens[position + offset];
        if (!neighbour || neighbour === term) continue;
        if ((documentFrequency.get(neighbour) ?? 0) < minDf) continue;
        addContext(term, indexVectorFor(neighbour), 1 / Math.abs(offset));
      }
    }
  }

  const terms: Record<string, number[]> = {};
  const keptFrequency: Record<string, number> = {};
  for (const [term, sum] of contextSums) {
    const normalized = normalize(sum);
    if (!normalized) continue;
    terms[term] = normalized;
    keptFrequency[term] = documentFrequency.get(term) ?? 0;
  }

  return { dims, window, terms, documentFrequency: keptFrequency, documents: documents.length };
}

export function normalize(vector: number[]): number[] | null {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return null;
  return vector.map((value) => Math.round((value / norm) * 10_000) / 10_000);
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index]! * b[index]!;
    normA += a[index]! * a[index]!;
    normB += b[index]! * b[index]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embed tokens into the space: the IDF-weighted mean of the terms' context vectors. Returns null
 * when nothing in the text is known to the space, so callers can fall back to keyword search.
 */
export function embedTokens(space: EmbeddingSpace, tokens: readonly string[], idf?: Record<string, number>): number[] | null {
  const total = new Array<number>(space.dims).fill(0);
  let weight = 0;
  for (const token of tokens) {
    const vector = space.terms[token];
    if (!vector) continue;
    const termWeight = idf?.[token] ?? 1;
    for (let index = 0; index < space.dims; index += 1) total[index]! += vector[index]! * termWeight;
    weight += termWeight;
  }
  if (weight === 0) return null;
  return normalize(total.map((value) => value / weight));
}

/** Inverse document frequency over the space, for embedding-time weighting. */
export function spaceIdf(space: EmbeddingSpace): Record<string, number> {
  const idf: Record<string, number> = {};
  for (const [term, df] of Object.entries(space.documentFrequency)) {
    idf[term] = Math.round(Math.log(1 + space.documents / Math.max(1, df)) * 1000) / 1000;
  }
  return idf;
}

/** Round a vector for compact JSON storage (4 decimals is plenty for cosine). */
export function quantize(vector: number[], decimals = 4): number[] {
  const factor = 10 ** decimals;
  return vector.map((value) => Math.round(value * factor) / factor);
}
