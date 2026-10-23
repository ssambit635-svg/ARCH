import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '@/lib/copy-to-clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  return writeText;
}

function mockDocument({
  allowed = true,
  copied = true,
}: { allowed?: boolean; copied?: boolean } = {}) {
  const textarea = {
    value: '',
    style: {},
    tabIndex: 0,
    setAttribute: vi.fn(),
    focus: vi.fn(),
    select: vi.fn(),
    setSelectionRange: vi.fn(),
    remove: vi.fn(),
  } as unknown as HTMLTextAreaElement;
  const documentMock = {
    permissionsPolicy: { allowsFeature: vi.fn(() => allowed) },
    createElement: vi.fn(() => textarea),
    body: { appendChild: vi.fn() },
    execCommand: vi.fn(() => copied),
  } as unknown as Document;
  vi.stubGlobal('document', documentMock);
  return { documentMock, textarea };
}

describe('copyToClipboard', () => {
  it('uses the native clipboard when the current document permits it', async () => {
    const writeText = mockClipboard();
    const { documentMock } = mockDocument();

    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(documentMock.execCommand).not.toHaveBeenCalled();
  });

  it('skips a clipboard API blocked by the document policy and uses the fallback', async () => {
    const writeText = mockClipboard();
    const { documentMock, textarea } = mockDocument({ allowed: false });

    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).not.toHaveBeenCalled();
    expect(documentMock.execCommand).toHaveBeenCalledWith('copy');
    expect(textarea.remove).toHaveBeenCalledOnce();
  });

  it('falls back cleanly when the native clipboard rejects with NotAllowedError', async () => {
    const writeText = mockClipboard().mockRejectedValue(
      new DOMException('Blocked', 'NotAllowedError'),
    );
    const { documentMock } = mockDocument();

    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(documentMock.execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false without throwing when the fallback cannot copy', async () => {
    const writeText = mockClipboard().mockRejectedValue(
      new DOMException('Blocked', 'NotAllowedError'),
    );
    const { documentMock } = mockDocument({ copied: false });

    await expect(copyToClipboard('hello')).resolves.toBe(false);
    expect(documentMock.execCommand).toHaveBeenCalledWith('copy');
  });
});

describe('clipboard fallback focus', () => {
  it.each([true, false])(
    'restores the original connected control whether copy succeeds (%s) or not',
    async (copied) => {
      mockClipboard();
      const { documentMock } = mockDocument({ allowed: false, copied });
      const focus = vi.fn();
      Object.defineProperty(documentMock, 'activeElement', { value: { isConnected: true, focus } });
      await expect(copyToClipboard('test value')).resolves.toBe(copied);
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    },
  );
  it('does not try to focus a control removed during the copy', async () => {
    mockClipboard();
    const { documentMock } = mockDocument({ allowed: false });
    const focus = vi.fn();
    Object.defineProperty(documentMock, 'activeElement', { value: { isConnected: false, focus } });
    await expect(copyToClipboard('test value')).resolves.toBe(true);
    expect(focus).not.toHaveBeenCalled();
  });
  it('never turns a focus-restoration exception into a failed clipboard operation', async () => {
    mockClipboard();
    const { documentMock } = mockDocument({ allowed: false });
    Object.defineProperty(documentMock, 'activeElement', {
      value: {
        isConnected: true,
        focus() {
          throw new Error('Control disappeared');
        },
      },
    });
    await expect(copyToClipboard('test value')).resolves.toBe(true);
  });
});
