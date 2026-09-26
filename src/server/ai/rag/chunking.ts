/**
 * RAG — chunking.
 *
 * Knowledge documents (runbooks, docs, pasted notes) are split into retrievable pieces. Chunks are
 * deliberately small: retrieval quality drops when a chunk contains several unrelated procedures,
 * and a cited answer should point at one thing the reader can act on.
 *
 * Pure and deterministic: same text in, same chunks out, on every machine.
 */

export type Chunk = {
  ordinal: number;
  /** Nearest preceding markdown heading, when the document has structure. */
  heading: string | null;
  text: string;
};

export type ChunkOptions = {
  /** Target maximum characters per chunk. */
  maxChars?: number;
  /** Characters of overlap carried into the next chunk, so a step split across a boundary survives. */
  overlap?: number;
  /** Chunks shorter than this are merged into the previous one. */
  minChars?: number;
};

const DEFAULTS = { maxChars: 900, overlap: 160, minChars: 120 } as const;

/** Normalize line endings and trim trailing whitespace without touching inner structure. */
function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function splitBlocks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function isHeading(block: string): boolean {
  return /^#{1,6}\s+\S/.test(block) || (/^[A-Z][\w\s/-]{2,60}:$/.test(block) && !block.includes('.'));
}

function headingText(block: string): string {
  return block.replace(/^#{1,6}\s+/, '').replace(/:$/, '').trim();
}

/** Carry the tail of a chunk into the next one, cut on a sentence boundary when possible. */
function overlapTail(text: string, overlap: number): string {
  if (overlap <= 0 || text.length <= overlap) return '';
  const tail = text.slice(-overlap);
  const boundary = tail.search(/[.!?]\s/);
  return (boundary >= 0 ? tail.slice(boundary + 1) : tail).trim();
}

export function chunkText(input: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = Math.max(200, options.maxChars ?? DEFAULTS.maxChars);
  const overlap = Math.max(0, options.overlap ?? DEFAULTS.overlap);
  const minChars = Math.max(0, options.minChars ?? DEFAULTS.minChars);

  const blocks = splitBlocks(normalizeText(input));
  const chunks: { heading: string | null; parts: string[] }[] = [];
  let current: { heading: string | null; parts: string[] } | null = null;
  let heading: string | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const text = current.parts.join('\n\n').trim();
    if (text) chunks.push({ heading: current.heading, parts: [text] });
    current = null;
  };

  for (const block of blocks) {
    if (isHeading(block)) {
      pushCurrent();
      heading = headingText(block);
      continue;
    }

    // A single block longer than the budget is split on sentence-ish boundaries.
    const pieces = block.length > maxChars ? splitLongBlock(block, maxChars) : [block];
    for (const piece of pieces) {
      const size = (current?.parts.join('\n\n').length ?? 0) + piece.length + 2;
      if (current && size > maxChars) {
        const tail = overlapTail(current.parts.join('\n\n'), overlap);
        pushCurrent();
        if (tail) current = { heading, parts: [tail] };
      }
      if (!current) current = { heading, parts: [] };
      current.parts.push(piece);
    }
  }
  pushCurrent();

  // Merge chunks that are too small to be worth retrieving on their own.
  const merged: { heading: string | null; text: string }[] = [];
  for (const chunk of chunks) {
    const text = chunk.parts.join('\n\n');
    const previous = merged[merged.length - 1];
    if (previous && text.length < minChars && previous.heading === chunk.heading) {
      previous.text = `${previous.text}\n\n${text}`.trim();
      continue;
    }
    merged.push({ heading: chunk.heading, text });
  }

  return merged.map((chunk, index) => ({
    ordinal: index,
    heading: chunk.heading,
    text: clipChunk(chunk.text, maxChars + overlap + 200),
  }));
}

function splitLongBlock(block: string, maxChars: number): string[] {
  const sentences = block.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])|\n/).filter(Boolean);
  const pieces: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      pieces.push(current.trim());
      current = '';
    }
    current = current ? `${current} ${sentence}` : sentence;
    while (current.length > maxChars) {
      pieces.push(current.slice(0, maxChars).trim());
      current = current.slice(maxChars);
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces.length ? pieces : [block];
}

function clipChunk(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Cheap estimate of retrieval cost; chunks are stored with it so the UI can show corpus size. */
export function estimateTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
