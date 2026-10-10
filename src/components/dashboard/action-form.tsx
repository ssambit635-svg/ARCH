'use client';

import { useEffect, useRef, type FormEvent } from 'react';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import type { ActionResult } from '@/app/dashboard/actions';

/**
 * Binds a server action to a form and renders the outcome inline.
 *
 * Server actions return `ActionResult`; errors from the service layer (403/404/409/422, invalid
 * transitions) surface here as text instead of a stack trace — the UI never decides what is legal.
 * Long messages (invite links, secrets) stay inline; short confirmations also raise a toast.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = 'primary',
  className = 'space-y-3',
  inline = false,
  onDone,
  quiet = false,
  confirm,
}: {
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ai';
  className?: string;
  inline?: boolean;
  onDone?: (result: ActionResult) => void;
  /** When true, outcomes surface only as toasts — nothing renders inline. */
  quiet?: boolean;
  /** Optional native confirmation shown before submitting a destructive action. */
  confirm?: string;
}) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(action, undefined);
  const seen = useRef(state);
  const guardSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (confirm && !window.confirm(confirm)) event.preventDefault();
  };

  useEffect(() => {
    if (!state || state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      if (state.message && (quiet || state.message.length < 140)) toast(state.message, 'success');
    } else {
      toast(state.error, 'error');
    }
    onDone?.(state);
  }, [state, onDone, quiet]);

  return (
    <form action={formAction} className={className} onSubmit={guardSubmit}>
      {children}
      <div className={inline ? 'flex items-center gap-2' : 'mt-3 flex flex-wrap items-center gap-3'}>
        <SubmitButton variant={variant} pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>
        {!quiet && state?.ok && state.message ? (
          <span className="max-w-full break-words text-[13px] leading-snug text-emerald-300" role="status">
            {state.message}
          </span>
        ) : null}
        {!quiet && state && !state.ok ? (
          <span className="max-w-full break-words text-[13px] leading-snug text-rose-300" role="alert">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function InlineAction({ action, label, variant = 'secondary', confirm }: {
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  confirm?: string;
}) {
  return (
    <ActionForm action={action} submitLabel={label} variant={variant} inline className="" confirm={confirm}>
      {confirm ? <span className="hidden">{confirm}</span> : null}
    </ActionForm>
  );
}
