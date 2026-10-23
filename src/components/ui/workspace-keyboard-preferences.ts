'use client';

import { useSyncExternalStore } from 'react';

export const CHARACTER_SHORTCUTS_KEY = 'arch-character-shortcuts';
const changed = 'arch-character-shortcuts-changed';
let memoryPreference = true;

export function readCharacterShortcutPreference(value: string | null, fallback = true): boolean {
  return value === 'off' ? false : value === 'on' ? true : fallback;
}
function snapshot() {
  try {
    return readCharacterShortcutPreference(
      window.localStorage.getItem(CHARACTER_SHORTCUTS_KEY),
      memoryPreference,
    );
  } catch {
    return memoryPreference;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(changed, callback);
  };
}
export function setCharacterShortcuts(enabled: boolean): boolean {
  memoryPreference = enabled;
  let persisted = true;
  try {
    window.localStorage.setItem(CHARACTER_SHORTCUTS_KEY, enabled ? 'on' : 'off');
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new Event(changed));
  return persisted;
}

/** WCAG 2.1.4: voice-input users can turn off global printable-character shortcuts. */
export function useCharacterShortcuts() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
