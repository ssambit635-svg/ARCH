import { describe, expect, it } from 'vitest';
import {
  isSidebarToggleShortcut,
  isSidebarVisible,
  serializeSidebarPreference,
} from '../src/components/shell/sidebar-preferences';

function shortcut(overrides: Partial<Parameters<typeof isSidebarToggleShortcut>[0]> = {}) {
  return isSidebarToggleShortcut({
    key: 'b',
    ctrlKey: false,
    metaKey: false,
    target: null,
    ...overrides,
  });
}

describe('sidebar preference', () => {
  it('defaults to visible and respects only the explicit hidden value', () => {
    expect(isSidebarVisible(undefined)).toBe(true);
    expect(isSidebarVisible('visible')).toBe(true);
    expect(isSidebarVisible('unexpected')).toBe(true);
    expect(isSidebarVisible('hidden')).toBe(false);
  });

  it('serializes a year-long, same-site preference cookie without marking it secure on local HTTP', () => {
    expect(serializeSidebarPreference(false)).toBe(
      'arch-sidebar=hidden; Path=/; Max-Age=31536000; SameSite=Lax',
    );
  });

  it('marks the preference cookie secure on HTTPS', () => {
    expect(serializeSidebarPreference(true, true)).toBe(
      'arch-sidebar=visible; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    );
  });
});

describe('desktop sidebar shortcut', () => {
  it('accepts Ctrl+B and Command+B', () => {
    expect(shortcut({ ctrlKey: true })).toBe(true);
    expect(shortcut({ metaKey: true })).toBe(true);
  });

  it('ignores unrelated keys and modifier combinations', () => {
    expect(shortcut({ ctrlKey: true, key: 'k' })).toBe(false);
    expect(shortcut({ key: 'b' })).toBe(false);
    expect(shortcut({ ctrlKey: true, shiftKey: true })).toBe(false);
    expect(shortcut({ ctrlKey: true, altKey: true })).toBe(false);
    expect(shortcut({ ctrlKey: true, repeat: true })).toBe(false);
    expect(shortcut({ ctrlKey: true, isComposing: true })).toBe(false);
    expect(shortcut({ ctrlKey: true, defaultPrevented: true })).toBe(false);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT'])(
    'does not steal the shortcut while focus is in a %s',
    (tagName) => {
      expect(shortcut({ ctrlKey: true, target: { tagName } as unknown as EventTarget })).toBe(false);
    },
  );

  it('does not steal typing from content-editable or textbox editors', () => {
    expect(
      shortcut({
        ctrlKey: true,
        target: { isContentEditable: true } as unknown as EventTarget,
      }),
    ).toBe(false);
    expect(
      shortcut({
        ctrlKey: true,
        target: {
          closest: (selector: string) =>
            selector.includes('[role="textbox"]') ? ({} as Element) : null,
        } as unknown as EventTarget,
      }),
    ).toBe(false);
  });
});
