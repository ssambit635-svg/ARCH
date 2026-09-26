/**
 * V4 M4 — minimal, dependency-free unified-diff reader.
 *
 * Why this exists: the model returns a *patch* (a unified diff string). The sandbox can get away with
 * dropping that text into a temp dir and running tests, but pushing a real GitHub PR needs concrete
 * file contents — GitHub's Git Data API takes blobs, not diffs. So we parse the diff and apply it here.
 *
 * Deliberately strict: when a hunk does not fit the file as it exists at the pinned commit, we return
 * `ok:false` and the caller refuses to open a PR rather than pushing a mangled file. A wrong PR is
 * worse than no PR — a human reads a "conflict" error and fixes it, but they may merge a corrupted
 * file.
 *
 * Lenient where leniency is harmless: markdown fences, prose and index/mode lines around hunks are
 * skipped, and `@@ -l +l @@` (an omitted count means 1) is accepted.
 */

export type DiffLineType = 'context' | 'add' | 'del';

export type DiffLine = { type: DiffLineType; text: string };

export type DiffHunk = {
  /** 1-based first line of the pre-image in the old file. */
  oldStart: number;
  /** Lines the header declared for the pre-image (`@@ -l,s`), for terminating the hunk. */
  oldLines: number;
  /** 1-based first line of the post-image in the new file. */
  newStart: number;
  /** Lines the header declared for the post-image (`@@ +l,s`). */
  newLines: number;
  lines: DiffLine[];
  /** "\ No newline at end of file" applied to the old side's last line. */
  oldNoNewline: boolean;
  /** "\ No newline at end of file" applied to the new side's last line. */
  newNoNewline: boolean;
};

export type FileChangeType = 'create' | 'update' | 'delete';

export type FilePatch = {
  /** Path in the repository after the change (the "b/" side). */
  path: string;
  /** Path before the change (the "a/" side); null for creations. */
  oldPath: string | null;
  changeType: FileChangeType;
  hunks: DiffHunk[];
};

export type ApplyResult = { ok: true; content: string } | { ok: false; reason: string };

const HUNK_RE = /^@@+\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/;
const GIT_HEADER_RE = /^diff --git a\/(.+?) b\/(.+)$/;
const OLD_HEADER_RE = /^---\s+(.+)$/;
const NEW_HEADER_RE = /^\+\+\+\s+(.+)$/;

/**
 * Reject anything that would write outside the repository or touch git internals. The patch comes from
 * a model, so this is a trust boundary, not a formality.
 */
export function safeRepoPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim().replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (!path || path === '/dev/null' || path.length > 1024) return null;
  if (path.startsWith('/') || /^[a-zA-Z]:\//.test(path)) return null;
  if (path.includes('\0') || /[\r\n]/.test(path)) return null;
  const segments = path.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;
  if (segments.some((segment) => segment === '..' || segment === '.git')) return null;
  return segments.join('/');
}

/** Strip an `a/` or `b/` prefix and a trailing timestamp (`git diff` pretty-headers). */
function cleanHeaderPath(value: string): string | null {
  const withoutTimestamp = value.replace(/\t.*$/, '').trim();
  if (!withoutTimestamp || withoutTimestamp === '/dev/null') return null;
  return safeRepoPath(withoutTimestamp.replace(/^[ab]\//, ''));
}

/** Have we collected every line the `@@` header announced? */
function hunkIsComplete(hunk: DiffHunk): boolean {
  let pre = 0;
  let post = 0;
  for (const line of hunk.lines) {
    if (line.type !== 'add') pre += 1;
    if (line.type !== 'del') post += 1;
  }
  return pre >= hunk.oldLines && post >= hunk.newLines;
}

function preImageLines(hunk: DiffHunk): DiffLine[] {
  return hunk.lines.filter((line) => line.type !== 'add');
}

function postImageLines(hunk: DiffHunk): DiffLine[] {
  return hunk.lines.filter((line) => line.type !== 'del');
}

/** Parse the body of one file's diff (everything between two `diff --git`/`---` headers). */
function parseFileBlock(block: string[]): FilePatch | null {
  let path: string | null = null;
  let oldPath: string | null = null;
  let changeType: FileChangeType = 'update';
  let sawFileHeader = false;
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;

  for (const line of block) {
    const gitHeader = GIT_HEADER_RE.exec(line);
    if (gitHeader) {
      sawFileHeader = true;
      oldPath = cleanHeaderPath(gitHeader[1]!);
      path = cleanHeaderPath(gitHeader[2]!);
      current = null;
      continue;
    }

    if (line.startsWith('new file mode')) {
      changeType = 'create';
      oldPath = null;
      continue;
    }
    if (line.startsWith('deleted file mode')) {
      changeType = 'delete';
      continue;
    }
    if (line.startsWith('rename from ')) {
      oldPath = safeRepoPath(line.slice('rename from '.length));
      continue;
    }
    if (line.startsWith('rename to ')) {
      path = safeRepoPath(line.slice('rename to '.length));
      continue;
    }

    const oldHeader = OLD_HEADER_RE.exec(line);
    if (oldHeader && !current) {
      sawFileHeader = true;
      const cleaned = cleanHeaderPath(oldHeader[1]!);
      if (cleaned === null) {
        changeType = 'create';
        oldPath = null;
      } else {
        oldPath = cleaned;
        path = path ?? cleaned;
      }
      continue;
    }

    const newHeader = NEW_HEADER_RE.exec(line);
    if (newHeader && !current) {
      sawFileHeader = true;
      const cleaned = cleanHeaderPath(newHeader[1]!);
      if (cleaned === null) changeType = 'delete';
      else path = cleaned;
      continue;
    }

    const hunk = HUNK_RE.exec(line);
    if (hunk) {
      current = {
        oldStart: Number(hunk[1]),
        oldLines: hunk[2] === undefined ? 1 : Number(hunk[2]),
        newStart: Number(hunk[3]),
        newLines: hunk[4] === undefined ? 1 : Number(hunk[4]),
        lines: [],
        oldNoNewline: false,
        newNoNewline: false,
      };
      hunks.push(current);
      continue;
    }

    if (!current) continue; // index/mode lines, prose, fences

    if (line.startsWith('\\')) {
      // The marker belongs to the line just emitted, i.e. the last line of that side.
      const last = current.lines[current.lines.length - 1];
      if (!last || last.type !== 'add') current.oldNoNewline = true;
      if (!last || last.type !== 'del') current.newNoNewline = true;
      continue;
    }

    const marker = line[0];
    if (marker === '+') {
      current.lines.push({ type: 'add', text: line.slice(1) });
      continue;
    }
    if (marker === '-') {
      current.lines.push({ type: 'del', text: line.slice(1) });
      continue;
    }
    if (marker === ' ') {
      current.lines.push({ type: 'context', text: line.slice(1) });
      continue;
    }
    // A truly empty line is ambiguous: it is a blank context line that lost its leading space (some
    // tools strip trailing whitespace), or it is the gap between the hunk and the next one. The
    // declared counts decide — once a hunk has every line it announced, an empty line closes it.
    if (line.length === 0) {
      if (hunkIsComplete(current)) current = null;
      else current.lines.push({ type: 'context', text: '' });
      continue;
    }
    // Anything else (prose, fences) ends the hunk: never swallow it as file content.
    current = null;
  }

  const resolvedPath = path ?? oldPath;
  if (!sawFileHeader || !resolvedPath) return null;
  if (changeType !== 'delete' && hunks.length === 0) return null;

  return { path: resolvedPath, oldPath: oldPath && oldPath !== resolvedPath ? oldPath : null, changeType, hunks };
}

/** Split file content into lines, remembering whether the file ended with a newline. */
function splitLines(content: string): { lines: string[]; endsWithNewline: boolean } {
  if (content === '') return { lines: [], endsWithNewline: false };
  const endsWithNewline = content.endsWith('\n');
  const body = endsWithNewline ? content.slice(0, -1) : content;
  return { lines: body.split('\n'), endsWithNewline };
}

/** Does the hunk's pre-image match `lines` exactly at `index`? */
function matchesAt(lines: string[], index: number, hunk: DiffHunk): boolean {
  const preImage = preImageLines(hunk);
  if (index < 0 || index + preImage.length > lines.length) return false;
  return preImage.every((line, offset) => lines[index + offset] === line.text);
}

/**
 * How far from the declared position a hunk may still be applied. Real `git apply` defaults to 0; 120
 * absorbs the drift an LLM patch introduces while still requiring an exact context match, so a wrong
 * offset cannot invent content.
 */
const MAX_HUNK_FUZZ = 120;

function locateHunk(lines: string[], hunk: DiffHunk, from: number): number {
  const preferred = Math.max(from, hunk.oldStart - 1);
  if (matchesAt(lines, preferred, hunk)) return preferred;
  for (let distance = 1; distance <= MAX_HUNK_FUZZ; distance += 1) {
    for (const candidate of [preferred + distance, preferred - distance]) {
      if (candidate < from || candidate > lines.length) continue;
      if (matchesAt(lines, candidate, hunk)) return candidate;
    }
  }
  return -1;
}

function describeHunk(hunk: DiffHunk): string {
  const wanted = preImageLines(hunk)[0]?.text ?? postImageLines(hunk)[0]?.text ?? '';
  return `@@ -${hunk.oldStart} +${hunk.newStart} @@ (needs ${JSON.stringify(wanted).slice(0, 100)})`;
}

/**
 * Apply one file's hunks to the file as it exists at the base commit.
 * `ok:false` carries a reason a human can act on.
 */
export function applyFilePatch(original: string, patch: FilePatch): ApplyResult {
  if (patch.changeType === 'delete') return { ok: true, content: '' };

  if (patch.changeType === 'create' && original.trim().length === 0) {
    const added = patch.hunks.flatMap((hunk) => hunk.lines.filter((line) => line.type === 'add').map((line) => line.text));
    if (added.length === 0) return { ok: false, reason: 'creation patch contains no added lines' };
    return { ok: true, content: `${added.join('\n')}\n` };
  }

  const { lines, endsWithNewline } = splitLines(original);
  const output: string[] = [];
  let cursor = 0;
  let reachedEof = false;

  for (const hunk of patch.hunks) {
    const preImage = preImageLines(hunk);

    // Pure insertion (empty pre-image): anchored at newStart.
    if (preImage.length === 0) {
      const at = Math.min(Math.max(hunk.newStart - 1, 0), lines.length);
      output.push(...lines.slice(cursor, at));
      output.push(...postImageLines(hunk).map((line) => line.text));
      cursor = at;
      reachedEof = cursor >= lines.length;
      continue;
    }

    const at = locateHunk(lines, hunk, cursor);
    if (at === -1) {
      return {
        ok: false,
        reason: `hunk ${describeHunk(hunk)} does not match ${patch.path} at the pinned commit (searched ±${MAX_HUNK_FUZZ} lines)`,
      };
    }

    output.push(...lines.slice(cursor, at));
    let source = at;
    for (const line of hunk.lines) {
      if (line.type === 'context') {
        output.push(lines[source]!);
        source += 1;
      } else if (line.type === 'del') {
        source += 1;
      } else {
        output.push(line.text);
      }
    }
    cursor = source;
    reachedEof = cursor >= lines.length;
  }

  output.push(...lines.slice(cursor));

  const lastHunk = patch.hunks[patch.hunks.length - 1];
  const dropTrailingNewline = Boolean(lastHunk?.newNoNewline && reachedEof);
  const keepTrailingNewline = dropTrailingNewline ? false : endsWithNewline;
  const content = output.length === 0 ? '' : output.join('\n') + (keepTrailingNewline ? '\n' : '');
  return { ok: true, content };
}

/** Parse a whole patch, possibly touching several files. Unparseable input returns `[]`, never throws. */
export function parseUnifiedDiff(patch: string): FilePatch[] {
  if (!patch?.trim()) return [];
  const normalized = patch.replace(/\r\n/g, '\n').replace(/\r/g, '');
  const lines = (normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized).split('\n');

  // A file section starts at `diff --git`, or at a `--- a/x` immediately followed by `+++ b/x`.
  // Diff body lines are prefixed with ' ', '+', '-' or '\\', so a removed line can never be
  // mistaken for one of those headers.
  const isFileStart = (index: number): boolean =>
    GIT_HEADER_RE.test(lines[index]!) ||
    (OLD_HEADER_RE.test(lines[index]!) && NEW_HEADER_RE.test(lines[index + 1] ?? ''));

  const blocks: string[][] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (isFileStart(index)) {
      blocks.push([line]);
      continue;
    }
    const block = blocks[blocks.length - 1];
    if (block) block.push(line); // everything before the first file header is prose and is dropped
  }

  const files: FilePatch[] = [];
  for (const block of blocks) {
    const parsed = parseFileBlock(block);
    if (parsed) files.push(parsed);
  }

  // De-duplicate by path, last wins: a model that emits one file twice would otherwise create two
  // tree entries for the same path, which GitHub rejects with a bare 422.
  const byPath = new Map<string, FilePatch>();
  for (const file of files) byPath.set(file.path, file);
  return [...byPath.values()];
}

/** Does this string look like a diff at all? Used for a clear error instead of a silent mock. */
export function looksLikeUnifiedDiff(patch: string): boolean {
  if (!patch) return false;
  return /(^|\n)(@@+\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@|diff --git |---\s+\S+\n\+\+\+\s+\S+)/.test(patch);
}
