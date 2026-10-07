/**
 * Copy text without assuming the browser grants clipboard-write permission.
 * Sandboxed previews and embedded contexts can deny navigator.clipboard even over HTTPS,
 * so fall back to the user-gesture-compatible textarea command and report failure cleanly.
 */
type ClipboardPolicy = { allowsFeature(feature: string): boolean };
type DocumentWithClipboardPolicy = Document & {
  permissionsPolicy?: ClipboardPolicy;
  featurePolicy?: ClipboardPolicy;
};

function clipboardWriteAllowed(): boolean {
  const policyDocument = document as DocumentWithClipboardPolicy;
  const policy = policyDocument.permissionsPolicy ?? policyDocument.featurePolicy;
  if (!policy || typeof policy.allowsFeature !== 'function') return true;

  try {
    return policy.allowsFeature('clipboard-write');
  } catch {
    // Older implementations may expose an incomplete Permissions Policy API.
    return true;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && clipboardWriteAllowed()) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard permissions are commonly denied inside previews/iframes; try the legacy path.
  }

  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.tabIndex = -1;
    Object.assign(textarea.style, {
      position: 'fixed',
      top: '0',
      left: '-9999px',
      width: '1px',
      height: '1px',
      padding: '0',
      opacity: '0',
      pointerEvents: 'none',
    });
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea?.remove();
  }
}
