'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Form primitives. Every control has an explicit <label>, and errors are announced with
 * `role="alert"` so screen readers pick them up (a11y is not optional).
 */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  optional,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline justify-between text-[13px] font-medium text-slate-200" htmlFor={htmlFor}>
        {label}
        {optional ? <span className="text-xs font-normal text-slate-500">Optional</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs leading-relaxed text-slate-500" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-rose-300" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlClass =
  'w-full rounded-xl border border-white/10 bg-abyss-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 shadow-[0_1px_0_rgb(255_255_255/0.04)_inset] transition focus:border-indigo-500/60 focus:bg-abyss-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50';

export function Input({ ref, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function Textarea({ ref, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} {...props} className={`${controlClass} scroll-thin resize-y leading-relaxed ${props.className ?? ''}`} />;
}

export function Select({ ref, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { ref?: React.Ref<HTMLSelectElement> }) {
  return <select ref={ref} {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function Checkbox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className={`size-4 shrink-0 cursor-pointer appearance-none rounded-md border border-white/15 bg-abyss-950 transition checked:border-indigo-500 checked:bg-indigo-500 checked:bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%222.5%22%20stroke-linecap=%22round%22><path%20d=%22M3.5%208.5l3%203%206-7%22/></svg>')] checked:bg-center checked:bg-no-repeat disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ''}`}
    />
  );
}

export function SubmitButton({
  children,
  variant = 'primary',
  pendingLabel,
  size = 'md',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ai';
  pendingLabel?: string;
  size?: 'sm' | 'md';
}) {
  const { pending } = useFormStatus();
  const variants = {
    primary:
      'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_4px_16px_-4px_rgb(99_102_241/0.6)] ring-1 ring-inset ring-white/10 hover:from-indigo-400 hover:to-indigo-500',
    secondary: 'border border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]',
    danger:
      'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_4px_16px_-4px_rgb(244_63_94/0.6)] ring-1 ring-inset ring-white/10 hover:from-rose-400 hover:to-rose-500',
    ai: 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-violet-100 ring-1 ring-inset ring-violet-500/40 hover:from-indigo-500/40 hover:to-violet-500/40',
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${
        size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'px-3.5 py-2 text-sm'
      }`}
    >
      {pending ? (
        <svg viewBox="0 0 16 16" className="size-4 animate-spin" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : null}
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-3.5 py-2.5 text-sm leading-relaxed text-rose-200" role="alert">
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3.5 py-2.5 text-sm leading-relaxed text-emerald-200" role="status">
      {message}
    </div>
  );
}
