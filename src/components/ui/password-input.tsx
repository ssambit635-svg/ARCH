'use client';

import { useState } from 'react';
import { controlClass } from './form-styles';

/**
 * Password field with a show/hide toggle.
 *
 * The toggle is `type="button"` so it never submits the surrounding form, and it keeps the
 * input's `name` untouched — server actions read the value exactly as before. The icon flips
 * between an eye and an eye-with-slash, and `aria-pressed`/`aria-label` keep it usable with a
 * screen reader.
 */
export function PasswordInput({
  id,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { id: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? 'text' : 'password'}
        className={`${controlClass} pr-11 ${props.className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5" />
            <path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c5 0 8.6 3.6 10 7a13.2 13.2 0 0 1-2.4 3.6" />
            <path d="M6.3 6.5C4.4 7.9 3 9.8 2 12c1.4 3.4 5 7 10 7 1.6 0 3-.3 4.3-.9" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12c1.4-3.4 5-7 10-7s8.6 3.6 10 7c-1.4 3.4-5 7-10 7s-8.6-3.6-10-7Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
