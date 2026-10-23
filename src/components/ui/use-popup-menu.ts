'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';

/** Shared menu-button behavior: focus on open, arrow navigation, Escape/Tab dismissal and focus return. */
export function usePopupMenu(open: boolean, setOpen: (open: boolean) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  const close = (restoreFocus = true) => {
    setOpenRef.current(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const items = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? [],
      );
    const selected = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitemradio"][aria-checked="true"]',
    );
    (selected ?? items()[0])?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setOpenRef.current(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpenRef.current(false);
        triggerRef.current?.focus();
        return;
      }
      if (!menuRef.current?.contains(document.activeElement)) return;
      if (event.key === 'Tab') {
        event.preventDefault();
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            element.getClientRects().length > 0 &&
            !element.closest('[inert]') &&
            !menuRef.current?.contains(element),
        );
        const triggerIndex = focusable.indexOf(triggerRef.current!);
        const next =
          focusable[
            (triggerIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length
          ];
        setOpenRef.current(false);
        next?.focus();
        return;
      }
      const options = items();
      const index = options.indexOf(document.activeElement as HTMLElement);
      let next: number;
      if (event.key === 'ArrowDown') next = (index + 1) % options.length;
      else if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = options.length - 1;
      else return;
      event.preventDefault();
      options[next]?.focus();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setOpenRef.current(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpenRef.current(true);
    }
  };
  return { containerRef, triggerRef, menuRef, onTriggerKeyDown, close };
}
