'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { WorkspacePortal } from '@/components/shell/workspace-theme';

/** Shared modal: contained/restored focus, inert workspace, Escape, scroll lock and themed portals. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  className = '',
  initialFocusRef,
  position = 'center',
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  position?: 'center' | 'top';
  busy?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const initialFocus = useRef(initialFocusRef);
  initialFocus.current = initialFocusRef;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backgrounds = Array.from(
      document.querySelectorAll<HTMLElement>('.arch-product-shell, .workspace-onboarding'),
    ).map((element) => ({ element, inert: element.inert }));
    backgrounds.forEach(({ element }) => {
      element.inert = true;
    });
    document.body.style.overflow = 'hidden';
    (initialFocus.current?.current ?? panel).focus();
    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          element.getClientRects().length > 0 &&
          !element.closest('[aria-hidden="true"]'),
      );
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const focusable = getFocusable();
        const first = focusable[0];
        const last = focusable.at(-1);
        const inside = panel.contains(document.activeElement);
        if (!first) {
          event.preventDefault();
          panel.focus();
        } else if (
          event.shiftKey &&
          (!inside || document.activeElement === first || document.activeElement === panel)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (!inside || document.activeElement === last || document.activeElement === panel)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      backgrounds.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <WorkspacePortal>
      <div
        className="workspace-dialog-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        data-position={position}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onCloseRef.current();
        }}
        role="presentation"
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-busy={busy}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={`workspace-dialog layer-shadow w-full rounded-2xl border border-white/10 bg-abyss-850 outline-none ${wide ? 'max-w-2xl' : 'max-w-md'} ${className}`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-white">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-[13px] text-slate-400">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onCloseRef.current()}
              aria-label="Close dialog"
              className="workspace-dialog-close shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white/[0.07] hover:text-slate-200"
            >
              <svg
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </WorkspacePortal>
  );
}
