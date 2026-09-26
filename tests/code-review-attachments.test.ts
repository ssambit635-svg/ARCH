import { describe, expect, it, vi } from 'vitest';
import {
  extractCodeReviewAttachments,
  MAX_CODE_REVIEW_FILES,
  MAX_CONTEXT_FILE_BYTES,
} from '@/server/ai/code/attachments';

const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function uploaded(name: string, bytes: Uint8Array, type = ''): File {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new File([copy], name, { type });
}

describe('Code Assist attachment ingestion', () => {
  it('extracts Markdown and keeps the supplied filename as context', async () => {
    const items = await extractCodeReviewAttachments([
      uploaded('incident-notes.md', new TextEncoder().encode('# Checkout\nTimeoutError: upstream timed out')),
    ]);
    expect(items).toEqual([{
      name: 'incident-notes.md',
      kind: 'text',
      content: '# Checkout\nTimeoutError: upstream timed out',
    }]);
  });

  it('recognizes image bytes and sends them only to the local OCR adapter', async () => {
    const ocr = vi.fn(async (_bytes: Uint8Array, extension: string) => `OCR from ${extension}: ECONNREFUSED`);
    const items = await extractCodeReviewAttachments([uploaded('terminal.png', pngHeader, 'image/png')], ocr);
    expect(ocr).toHaveBeenCalledWith(expect.any(Uint8Array), '.png');
    expect(items).toEqual([{ name: 'terminal.png', kind: 'image', content: 'OCR from .png: ECONNREFUSED' }]);
  });

  it('rejects fake images, mismatched MIME, unsupported binaries and invalid UTF-8', async () => {
    const ocr = vi.fn(async () => 'never called');
    await expect(extractCodeReviewAttachments([uploaded('fake.png', new TextEncoder().encode('not an image'), 'image/png')], ocr)).rejects.toThrow(/supported image or text/i);
    await expect(extractCodeReviewAttachments([uploaded('image.png', pngHeader, 'image/jpeg')], ocr)).rejects.toThrow(/does not match/i);
    await expect(extractCodeReviewAttachments([uploaded('archive.pdf', new Uint8Array([1, 2, 3]))], ocr)).rejects.toThrow(/not a supported/i);
    await expect(extractCodeReviewAttachments([uploaded('notes.md', new Uint8Array([0xc3, 0x28]))])).rejects.toThrow(/valid UTF-8/i);
    expect(ocr).not.toHaveBeenCalled();
  });

  it('enforces count and per-file byte limits before parsing content', async () => {
    const tooMany = Array.from({ length: MAX_CODE_REVIEW_FILES + 1 }, (_, index) => uploaded(`note-${index}.txt`, new Uint8Array([65])));
    await expect(extractCodeReviewAttachments(tooMany)).rejects.toThrow(/at most/i);
    const large = uploaded('large.md', new Uint8Array(MAX_CONTEXT_FILE_BYTES + 1).fill(65));
    await expect(extractCodeReviewAttachments([large])).rejects.toThrow(/1 MB or smaller/i);
  });

  it('normalizes line endings, trims excess whitespace, and caps OCR output', async () => {
    const noisy = `  Error\r\n\r\n\r\n\r\n${'x'.repeat(12_100)}`;
    const items = await extractCodeReviewAttachments([uploaded('screen.png', pngHeader)], async () => noisy);
    expect(items[0]?.content.startsWith('Error\n\n\n')).toBe(true);
    expect(items[0]?.content.length).toBe(12_000);
  });
});
