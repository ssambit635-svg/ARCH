'use client';

import { useEffect, useState } from 'react';
import { useCharacterShortcuts } from './workspace-keyboard-preferences';
import { Kbd } from './kbd';
import { isPageSearchShortcut } from '@/lib/workspace-shortcuts';

/** Keep the server and first client render identical, then show the actual platform modifier. */
export function ShortcutKeys({
  letter,
  decorative = true,
}: {
  letter: string;
  decorative?: boolean;
}) {
  const [apple, setApple] = useState(false);
  useEffect(() => {
    setApple(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
  }, []);
  return (
    <>
      <span className="workspace-shortcut-keys" aria-hidden="true">
        <Kbd>{apple ? '⌘' : 'Ctrl'}</Kbd> <Kbd>{letter}</Kbd>
      </span>
      {!decorative ? (
        <span className="sr-only">
          {apple ? 'Command' : 'Control'} plus {letter}
        </span>
      ) : null}
    </>
  );
}

/** A context-local / shortcut. Native GET fields still work without the interactive client. */
export function PageSearchShortcut({ inputId }: { inputId: string }) {
  const enabled = useCharacterShortcuts();
  useEffect(() => {
    const input = document.getElementById(inputId);
    if (input instanceof HTMLInputElement) {
      if (enabled) input.setAttribute('aria-keyshortcuts', '/');
      else input.removeAttribute('aria-keyshortcuts');
    }
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isPageSearchShortcut(event) || document.querySelector('[role="dialog"], [role="menu"]'))
        return;
      const input = document.getElementById(inputId);
      if (!(input instanceof HTMLInputElement) || input.disabled || !input.getClientRects().length)
        return;
      event.preventDefault();
      input.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      input?.removeAttribute('aria-keyshortcuts');
    };
  }, [inputId, enabled]);
  if (!enabled) return null;
  return (
    <span className="workspace-page-search-hint" aria-hidden="true">
      <Kbd>/</Kbd>
    </span>
  );
}
