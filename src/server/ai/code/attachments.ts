import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execFile = promisify(execFileCallback);

/** Hard limits are enforced before reading bytes or creating temporary files. */
export const MAX_CODE_REVIEW_FILES = 6;
export const MAX_CODE_REVIEW_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_CONTEXT_FILE_BYTES = 1024 * 1024;
export const MAX_CONTEXT_FILE_CHARS = 12_000;

export type CodeReviewAttachment = {
  name: string;
  kind: 'image' | 'text';
  content: string;
};

const TEXT_EXTENSIONS = new Set([
  '.md', '.markdown', '.txt', '.log', '.json', '.yaml', '.yml', '.toml', '.ini', '.env.example',
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.go', '.java', '.kt', '.cs', '.rb', '.php',
  '.sql', '.sh', '.bash', '.zsh', '.diff', '.patch', '.html', '.css', '.scss', '.xml', '.graphql',
]);
const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
};

function safeName(name: string): string {
  const base = path.basename(name || 'attachment').replace(/[\r\n\0]/g, '').slice(0, 120);
  return base || 'attachment';
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}
function isJpeg(bytes: Uint8Array): boolean { return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
function isGif(bytes: Uint8Array): boolean { return new TextDecoder().decode(bytes.subarray(0, 6)) === 'GIF87a' || new TextDecoder().decode(bytes.subarray(0, 6)) === 'GIF89a'; }
function isWebp(bytes: Uint8Array): boolean { return bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP'; }
function isBmp(bytes: Uint8Array): boolean { return bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d; }

function imageExtension(bytes: Uint8Array): string | null {
  if (isPng(bytes)) return '.png';
  if (isJpeg(bytes)) return '.jpg';
  if (isWebp(bytes)) return '.webp';
  if (isGif(bytes)) return '.gif';
  if (isBmp(bytes)) return '.bmp';
  return null;
}

function cleanOcrText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, MAX_CONTEXT_FILE_CHARS);
}

async function runTesseract(bytes: Uint8Array, extension: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'arch-ocr-'));
  const imagePath = path.join(directory, `upload${extension}`);
  try {
    await writeFile(imagePath, bytes, { flag: 'wx', mode: 0o600 });
    const result = await execFile('tesseract', [imagePath, 'stdout', '-l', 'eng', '--psm', '3'], {
      encoding: 'utf8',
      timeout: 25_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });
    return cleanOcrText(result.stdout);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error('Image reading needs the local Tesseract OCR tool. Install it with “brew install tesseract” (macOS) or “sudo apt install tesseract-ocr” (Debian/Ubuntu), then retry. ARCH does not upload images to an AI service.');
    }
    if (code === 'ETIMEDOUT') throw new Error('Image OCR timed out. Try a smaller or cropped screenshot.');
    const detail = error instanceof Error ? error.message.split('\n')[0] : 'unknown OCR error';
    throw new Error(`Could not read this image with local OCR (${detail}). Try PNG, JPEG, WebP, GIF or BMP.`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/**
 * Read user-selected text context and OCR images entirely on the ARCH server. No attachment is
 * persisted; image bytes exist only in a short-lived, private temp directory during OCR.
 * `ocr` is injectable so tests can verify image processing without installing Tesseract.
 */
export async function extractCodeReviewAttachments(
  files: readonly File[],
  ocr: (bytes: Uint8Array, extension: string) => Promise<string> = runTesseract,
): Promise<CodeReviewAttachment[]> {
  if (files.length > MAX_CODE_REVIEW_FILES) throw new Error(`Choose at most ${MAX_CODE_REVIEW_FILES} files.`);
  let totalBytes = 0;
  const attachments: CodeReviewAttachment[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_CONTEXT_FILE_BYTES) throw new Error(`${safeName(file.name)} is too large. Each file must be 1 MB or smaller.`);
    totalBytes += file.size;
    if (totalBytes > MAX_CODE_REVIEW_UPLOAD_BYTES) throw new Error('Attachments must be 5 MB or smaller in total.');

    const name = safeName(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = imageExtension(bytes);
    if (extension) {
      const declaredType = file.type.toLowerCase();
      if (declaredType && declaredType !== 'application/octet-stream' && IMAGE_MIME_TO_EXTENSION[declaredType] !== extension) {
        throw new Error(`${name} does not match its declared image type.`);
      }
      const content = cleanOcrText(await ocr(bytes, extension));
      if (!content) throw new Error(`No readable text was found in ${name}. Try cropping or enlarging the text.`);
      attachments.push({ name, kind: 'image', content });
      continue;
    }

    const fileExtension = path.extname(name).toLowerCase();
    const allowed = TEXT_EXTENSIONS.has(fileExtension) || name.toLowerCase().endsWith('.env.example');
    if (!allowed) throw new Error(`${name} is not a supported image or text context file. Use PNG/JPEG/WebP/GIF/BMP or a Markdown, log, config or source file.`);
    if (bytes.includes(0)) throw new Error(`${name} is not a UTF-8 text file.`);
    let content: string;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
    } catch {
      throw new Error(`${name} is not valid UTF-8 text.`);
    }
    if (!content) throw new Error(`${name} is empty.`);
    attachments.push({ name, kind: 'text', content: content.slice(0, MAX_CONTEXT_FILE_CHARS) });
  }
  return attachments;
}
