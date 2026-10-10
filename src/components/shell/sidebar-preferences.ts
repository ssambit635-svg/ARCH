export const SIDEBAR_PREFERENCE_COOKIE = 'arch-sidebar';
export const SIDEBAR_PREFERENCE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** The sidebar is visible by default. Only an explicit hidden preference changes that default. */
export function isSidebarVisible(cookieValue: string | undefined): boolean {
  return cookieValue !== 'hidden';
}

/** Build the harmless, non-authentication cookie used to remember a local UI preference. */
export function serializeSidebarPreference(visible: boolean, secure = false): string {
  const value = visible ? 'visible' : 'hidden';
  const secureAttribute = secure ? '; Secure' : '';
  return `${SIDEBAR_PREFERENCE_COOKIE}=${value}; Path=/; Max-Age=${SIDEBAR_PREFERENCE_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
}

type ElementLike = EventTarget & {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => ElementLike | null;
};

/**
 * Ctrl/Cmd+B toggles the desktop navigation, except while the user is typing or composing text.
 * This prevents the app-level shortcut from stealing normal editor and form input.
 */
export function isSidebarToggleShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  target: EventTarget | null;
}): boolean {
  if (
    event.key.toLowerCase() !== 'b' ||
    (!event.ctrlKey && !event.metaKey) ||
    event.shiftKey ||
    event.altKey ||
    event.repeat ||
    event.isComposing ||
    event.defaultPrevented
  ) {
    return false;
  }

  const target = event.target as ElementLike | null;
  if (!target) return true;

  const tagName = target.tagName?.toUpperCase();
  return !(
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.closest?.('[contenteditable="true"], [role="textbox"]')
  );
}
