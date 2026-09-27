'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ToastTone = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; tone: ToastTone };

const EVENT = 'arch:toast';

export function toast(message: string, tone: ToastTone = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

/** Global toast stack — mount once in the dashboard shell. */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: ToastTone }>).detail;
      if (!detail?.message) return;
      idRef.current += 1;
      const id = idRef.current;
      setItems((previous) => [...previous.slice(-3), { id, message: detail.message, tone: detail.tone ?? 'success' }]);
      window.setTimeout(() => dismiss(id), 4200);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, [dismiss]);

  if (items.length === 0) return null;

  const tones: Record<ToastTone, string> = {
    success: 'border-emerald-500/30',
    error: 'border-rose-500/30',
    info: 'border-indigo-500/30',
  };
  const dots: Record<ToastTone, string> = {
    success: 'bg-emerald-400',
    error: 'bg-rose-400',
    info: 'bg-indigo-400',
  };

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-80 flex-col gap-2" aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          className={`layer-shadow pointer-events-auto flex animate-slide-in-right items-start gap-2.5 rounded-xl border bg-abyss-850/95 px-4 py-3 text-sm text-slate-200 backdrop-blur ${tones[item.tone]}`}
        >
          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dots[item.tone]}`} aria-hidden />
          <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-0.5 text-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
