import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { env } from '@/lib/env';
import { writeAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PATTERNS } from '../ai/arch-model/knowledge';
import { buildEmbeddingSpace, embedTokens, quantize, spaceIdf, type EmbeddingSpace } from '../ai/arch-model/embeddings';
import { chunkText, estimateTokens } from '../ai/rag/chunking';
import { isCitable, rankChunks, type RetrievableChunk } from '../ai/rag/retrieve';
import { words } from '../ai/arch-model/text';
import { redact } from '../ai/guardrails';
import { knowledgeSourceRepository } from '../repositories/knowledgeSource.repository';
import type { KnowledgeChunkHint } from '../ai/context';

/**
 * V6 — Knowledge service: ARCH's own retrieval-augmented generation.
 *
 * An organization's runbooks, docs and notes are chunked and embedded **at ingest time**, on this
 * server, by ARCH's own embedding space. At answer time the chunks are ranked (dense meaning +
 * keyword words) and the best ones are handed to the Copilot as citations. No embedding API, no
 * external vector database, no network call while answering.
 *
 * The one network call in this file is `fetchKnowledgeUrl`, which happens when a human asks ARCH to
 * read a *public* document. It is deliberately locked down (see `assertPublicUrl`) because it is
 * the only place tenant-controlled input reaches the network.
 */

export const KNOWLEDGE_LIMITS = {
  /** Maximum characters of pasted text per source. */
  maxSourceChars: 200_000,
  /** Maximum chunks retrieved for one Copilot call. */
  maxRetrievedChunks: 3,
  /** Fetch: response size cap. */
  maxFetchBytes: 2_000_000,
  /** Fetch: wall-clock cap. */
  fetchTimeoutMs: 10_000,
} as const;

export type KnowledgeKind = 'RUNBOOK' | 'DOC' | 'NOTE' | 'URL' | 'INCIDENT_EXPORT';

const KIND_LABEL: Record<KnowledgeKind, string> = {
  RUNBOOK: 'Runbook',
  DOC: 'Document',
  NOTE: 'Note',
  URL: 'Fetched document',
  INCIDENT_EXPORT: 'Incident export',
};

export type KnowledgeSourceSummary = {
  id: string;
  name: string;
  kind: KnowledgeKind;
  status: 'PENDING' | 'READY' | 'FAILED';
  sourceUrl: string | null;
  chunkCount: number;
  tokenCount: number;
  error: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------------------------
// Embedding space (cached per organization; rebuilt when the corpus changes)
// ---------------------------------------------------------------------------------------------

type SpaceCacheEntry = { signature: string; space: EmbeddingSpace; idf: Record<string, number> };
const spaceCache = new Map<string, SpaceCacheEntry>();

type ChunkRow = Awaited<ReturnType<typeof knowledgeSourceRepository.listChunks>>[number];
type CorpusCacheEntry = { rows: ChunkRow[]; expiresAt: number };

/**
 * The organization's chunks, cached briefly. Retrieval used to re-read the whole corpus (embedding
 * vectors included) twice per request; on a chat surface — where every turn retrieves — that is the
 * single most expensive thing ARCH does. The cache is invalidated by every write path (ingest,
 * reindex, delete, training) and expires after a few seconds, so another process's ingest is picked
 * up without a restart.
 */
const CORPUS_TTL_MS = 8_000;
const corpusCache = new Map<string, CorpusCacheEntry>();

async function chunksFor(organizationId: string): Promise<ChunkRow[]> {
  const cached = corpusCache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  const rows = await knowledgeSourceRepository.listChunks(organizationId, { take: 2_000 });
  corpusCache.set(organizationId, { rows, expiresAt: Date.now() + CORPUS_TTL_MS });
  return rows;
}

/**
 * The space every chunk embedding lives in. Built from the built-in pattern library (original ARCH
 * content — a stable backbone of failure vocabulary) plus the organization's own chunks. Cached
 * with a signature so a changed corpus is picked up without restarting the process.
 */
async function embeddingSpaceFor(organizationId: string): Promise<{ space: EmbeddingSpace; idf: Record<string, number> }> {
  const chunks = await chunksFor(organizationId);
  const signature = `${chunks.length}:${chunks[chunks.length - 1]?.createdAt.toISOString() ?? 'none'}`;
  const cached = spaceCache.get(organizationId);
  if (cached?.signature === signature) return { space: cached.space, idf: cached.idf };

  const documents = [
    ...PATTERNS.map((pattern) => ({ id: `pattern:${pattern.id}`, tokens: words(`${pattern.title} ${pattern.symptoms} ${pattern.rootCause}`) })),
    ...chunks.map((chunk) => ({ id: chunk.id, tokens: words(`${chunk.heading ?? ''} ${chunk.text}`) })),
  ];
  const space = buildEmbeddingSpace(documents, { minDocumentFrequency: 1 });
  const entry: SpaceCacheEntry = { signature, space, idf: spaceIdf(space) };
  spaceCache.set(organizationId, entry);
  return { space: entry.space, idf: entry.idf };
}

export function resetKnowledgeCaches(): void {
  spaceCache.clear();
  corpusCache.clear();
}

/** Drop the cached corpus for one organization (called by every write path). */
function invalidateCorpus(organizationId: string): void {
  spaceCache.delete(organizationId);
  corpusCache.delete(organizationId);
}

// ---------------------------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------------------------

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function validateText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < 40) throw AppError.badRequest('A knowledge source needs at least 40 characters of content.');
  if (trimmed.length > KNOWLEDGE_LIMITS.maxSourceChars) {
    throw AppError.badRequest(`A knowledge source may not exceed ${KNOWLEDGE_LIMITS.maxSourceChars.toLocaleString('en-US')} characters. Split large documents.`);
  }
  return trimmed;
}

export type IngestParams = {
  organizationId: string;
  userId: string;
  name: string;
  kind: KnowledgeKind;
  text: string;
  sourceUrl?: string | null;
};

/** Chunk + embed + store one document. Returns the source, or the existing one when unchanged. */
export async function ingestKnowledgeSource(params: IngestParams): Promise<{ source: KnowledgeSourceSummary; chunks: number; created: boolean }> {
  await requirePermission(params.organizationId, params.userId, 'knowledge.manage');
  enforceRateLimit(`knowledge-ingest:${params.organizationId}`, { limit: 20, windowMs: 60_000 });

  const name = params.name.trim().slice(0, 160) || KIND_LABEL[params.kind];
  // Redaction first: a runbook may contain a connection string, and ARCH must not index secrets.
  const text = redact(validateText(params.text));
  const contentHash = sha256(text);

  const existing = await knowledgeSourceRepository.findByContentHash(params.organizationId, contentHash);
  if (existing) {
    return { source: toSummary(existing), chunks: existing.chunkCount, created: false };
  }

  const source = await knowledgeSourceRepository.create({
    organizationId: params.organizationId,
    name,
    kind: params.kind,
    sourceUrl: params.sourceUrl ?? null,
    contentHash,
    createdById: params.userId,
  });

  try {
    const { space, idf } = await embeddingSpaceFor(params.organizationId);
    const chunks = chunkText(text);
    const stored = await knowledgeSourceRepository.replaceChunks(
      source.id,
      params.organizationId,
      chunks.map((chunk) => {
        const tokens = words(`${chunk.heading ?? ''} ${chunk.text}`);
        const vector = embedTokens(space, tokens, idf);
        return {
          ordinal: chunk.ordinal,
          heading: chunk.heading,
          text: chunk.text,
          tokenCount: estimateTokens(chunk.text),
          embedding: vector ? quantize(vector) : new Array<number>(space.dims).fill(0),
        };
      }),
    );
    const ready = await knowledgeSourceRepository.markReady(source.id, {
      chunkCount: stored.length,
      tokenCount: stored.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
    });
    invalidateCorpus(params.organizationId);

    await writeAudit({
      organizationId: params.organizationId,
      actorId: params.userId,
      action: 'knowledge.ingest',
      entityType: 'knowledge_source',
      entityId: source.id,
      metadata: { name, kind: params.kind, chunks: stored.length, sourceUrl: params.sourceUrl ?? null },
    });

    return { source: toSummary(ready), chunks: stored.length, created: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await knowledgeSourceRepository.markFailed(source.id, message).catch(() => undefined);
    throw error;
  }
}

/** Re-chunk and re-embed an existing source from new text. */
export async function reindexKnowledgeSource(params: { organizationId: string; userId: string; sourceId: string; text: string }) {
  await requirePermission(params.organizationId, params.userId, 'knowledge.manage');
  const source = await knowledgeSourceRepository.findById(params.organizationId, params.sourceId);
  if (!source) throw AppError.notFound('Knowledge source not found.');
  const text = redact(validateText(params.text));
  const { space, idf } = await embeddingSpaceFor(params.organizationId);
  const chunks = chunkText(text);
  const stored = await knowledgeSourceRepository.replaceChunks(
    source.id,
    params.organizationId,
    chunks.map((chunk) => {
      const tokens = words(`${chunk.heading ?? ''} ${chunk.text}`);
      const vector = embedTokens(space, tokens, idf);
      return {
        ordinal: chunk.ordinal,
        heading: chunk.heading,
        text: chunk.text,
        tokenCount: estimateTokens(chunk.text),
        embedding: (vector ? quantize(vector) : new Array<number>(space.dims).fill(0)) as unknown as number[],
      };
    }),
  );
  const ready = await knowledgeSourceRepository.markReady(source.id, {
    chunkCount: stored.length,
    tokenCount: stored.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
  });
  invalidateCorpus(params.organizationId);
  await writeAudit({
    organizationId: params.organizationId,
    actorId: params.userId,
    action: 'knowledge.reindex',
    entityType: 'knowledge_source',
    entityId: source.id,
    metadata: { name: source.name, chunks: stored.length },
  });
  return toSummary(ready);
}

export async function listKnowledgeSources(params: { organizationId: string; userId: string }) {
  await requirePermission(params.organizationId, params.userId, 'knowledge.read');
  const rows = await knowledgeSourceRepository.list(params.organizationId);
  return rows.map(toSummary);
}

export async function deleteKnowledgeSource(params: { organizationId: string; userId: string; sourceId: string }) {
  await requirePermission(params.organizationId, params.userId, 'knowledge.delete');
  const source = await knowledgeSourceRepository.findById(params.organizationId, params.sourceId);
  if (!source) throw AppError.notFound('Knowledge source not found.');
  await knowledgeSourceRepository.delete(params.organizationId, params.sourceId);
  invalidateCorpus(params.organizationId);
  await writeAudit({
    organizationId: params.organizationId,
    actorId: params.userId,
    action: 'knowledge.delete',
    entityType: 'knowledge_source',
    entityId: params.sourceId,
    metadata: { name: source.name, chunks: source.chunkCount },
  });
  return { id: params.sourceId };
}

// ---------------------------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------------------------

/**
 * Rank the organization's knowledge for a free-text query. Pure ranking; the DB read happens here
 * so `ai/rag/retrieve.ts` stays testable without a database.
 */
export async function retrieveKnowledge(params: { organizationId: string; query: string; k?: number }): Promise<KnowledgeChunkHint[]> {
  const k = params.k ?? KNOWLEDGE_LIMITS.maxRetrievedChunks;
  const all = await chunksFor(params.organizationId);
  if (all.length === 0) return [];
  // Ranking is O(chunks) over dense vectors — one request ranks at most the newest 1,000.
  const rows = all.length > 1_000 ? all.slice(0, 1_000) : all;

  const { space, idf } = await embeddingSpaceFor(params.organizationId);
  const candidates: RetrievableChunk[] = rows.map((row) => ({
    id: row.id,
    text: row.heading ? `${row.heading}\n${row.text}` : row.text,
    heading: row.heading,
    embedding: Array.isArray(row.embedding) ? (row.embedding as number[]) : null,
    // A runbook that names the failure outranks a loose note when scores are otherwise equal.
    weight: row.source.kind === 'RUNBOOK' ? 1.1 : 1,
  }));

  const ranked = rankChunks(candidates, params.query, { space, k, minScore: 0.08 });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ranked
    .filter(isCitable)
    .map(({ chunk, score }) => {
      const row = byId.get(chunk.id)!;
      const hint: KnowledgeChunkHint = {
        id: row.id,
        sourceName: row.source.name,
        sourceKind: row.source.kind,
        heading: row.heading,
        text: row.text.slice(0, 600),
        url: row.source.sourceUrl,
        similarity: score,
      };
      return hint;
    });
}

// ---------------------------------------------------------------------------------------------
// Fetching a public document (the only outbound call in the knowledge path)
// ---------------------------------------------------------------------------------------------

function isPrivateAddress(address: string): boolean {
  if (isIP(address)) {
    if (address === '::1' || address.startsWith('::ffff:')) return true;
    const octets = address.split('.').map(Number);
    if (octets.length === 4) {
      const [a, b] = octets as [number, number, number, number];
      return a === 0 || a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
    }
    return /^f[cd]/i.test(address) || /^fe80/i.test(address);
  }
  return true;
}

/**
 * Refuse anything that is not a public http(s) URL. This is the SSRF guard: the hostname is
 * resolved and every address it points at must be public, so a link cannot be used to reach
 * cloud metadata endpoints, internal services or the loopback interface.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw AppError.badRequest('That does not look like a URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw AppError.badRequest('Only http and https URLs can be fetched.');
  }
  if (url.username || url.password) throw AppError.badRequest('URLs with embedded credentials are not allowed.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
    throw AppError.badRequest('Internal hostnames cannot be fetched.');
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw AppError.badRequest('That host could not be resolved.');
  }
  if (addresses.length === 0 || addresses.every((entry) => isPrivateAddress(entry.address))) {
    throw AppError.badRequest('That URL does not point at a public address.');
  }
  return url;
}

/** Strip scripts, styles and tags from fetched HTML — enough for docs pages, not a parser. */
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|pre|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<h([1-6])[^>]*>/gi, (_match, level: string) => `${'\n'}${'#'.repeat(Number(level))} `)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Fetch a public document and ingest it. The response is size- and time-capped, must be text, and
 * redirects are followed manually so each hop is re-checked against the SSRF guard.
 */
export async function fetchKnowledgeUrl(params: { organizationId: string; userId: string; url: string; name?: string }): Promise<{ source: KnowledgeSourceSummary; chunks: number; created: boolean }> {
  await requirePermission(params.organizationId, params.userId, 'knowledge.manage');
  enforceRateLimit(`knowledge-fetch:${params.organizationId}`, { limit: 10, windowMs: 60_000 });

  let current = await assertPublicUrl(params.url);
  let response: Response | null = null;
  for (let hop = 0; hop < 3; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KNOWLEDGE_LIMITS.fetchTimeoutMs);
    try {
      response = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: { accept: 'text/plain, text/html;q=0.9, */*;q=0.1', 'user-agent': 'ARCH-knowledge-ingest/1.0' },
      });
    } catch (error) {
      throw AppError.badRequest(`Could not fetch that URL: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      current = await assertPublicUrl(new URL(location, current).toString());
      continue;
    }
    break;
  }
  if (!response || !response.ok) throw AppError.badRequest(`That URL returned ${response?.status ?? 'no response'}.`);

  const contentType = response.headers.get('content-type') ?? '';
  if (!/^(text\/plain|text\/html|application\/xhtml)/i.test(contentType)) {
    throw AppError.badRequest('Only plain text and HTML documents can be indexed.');
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > KNOWLEDGE_LIMITS.maxFetchBytes) {
    throw AppError.badRequest('That document is too large to index.');
  }
  const body = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const text = /html/i.test(contentType) ? htmlToText(body) : body;
  const cleaned = text.trim();
  if (cleaned.length < 40) throw AppError.badRequest('That document did not contain enough text to index.');

  const name = params.name?.trim() || new URL(current.toString()).hostname;
  const result = await ingestKnowledgeSource({
    organizationId: params.organizationId,
    userId: params.userId,
    name: name.slice(0, 160),
    kind: 'URL',
    text: cleaned,
    sourceUrl: current.toString(),
  });
  await writeAudit({
    organizationId: params.organizationId,
    actorId: params.userId,
    action: 'knowledge.fetch',
    entityType: 'knowledge_source',
    entityId: result.source.id,
    metadata: { url: current.toString(), chunks: result.chunks, created: result.created },
  });
  return result;
}

function toSummary(row: {
  id: string;
  name: string;
  kind: string;
  status: string;
  sourceUrl: string | null;
  chunkCount: number;
  tokenCount: number;
  error: string | null;
  createdAt: Date;
}): KnowledgeSourceSummary {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as KnowledgeKind,
    status: row.status as KnowledgeSourceSummary['status'],
    sourceUrl: row.sourceUrl,
    chunkCount: row.chunkCount,
    tokenCount: row.tokenCount,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  };
}

/** True when a fetch is possible at all (offline deployments may disable it entirely). */
export function knowledgeFetchEnabled(): boolean {
  return !env.ARCH_OFFLINE_ONLY;
}
