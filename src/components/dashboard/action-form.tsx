'use client';

import { useWorkspaceAction } from '@/components/ui/use-workspace-action';

import { useEffect, useRef, type FormEvent } from 'react';
import { FormError, FormValidation, SubmitButton } from '@/components/ui/form';
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
  resetOnSuccess = false,
}: {
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ai';
  className?: string;
  inline?: boolean;
  onDone?: (result: ActionResult) => void;
  /** Keep success confirmations compact; errors always stay visible inline for recovery. */
  quiet?: boolean;
  /** Optional native confirmation shown before submitting a destructive action. */
  confirm?: string;
  /** Creation forms opt in; update forms retain the newly selected value. */
  resetOnSuccess?: boolean;
}) {
  const { state, formAction, pending, onSubmit } = useWorkspaceAction(
    action,
    'Could not confirm this change. Your inputs are still here. Check the current data before trying again.',
  );
  const seen = useRef(state);
  const formRef = useRef<HTMLFormElement>(null);
  const guardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || (confirm && !window.confirm(confirm))) return;
    onSubmit(event);
  };

  useEffect(() => {
    if (!state || state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      if (state.message && (quiet || state.message.length < 140)) toast(state.message, 'success');
    } else {
      toast(state.error, 'error');
      formRef.current?.querySelector<HTMLElement>('[data-form-error]')?.focus();
    }
    onDone?.(state);
  }, [state, onDone, quiet, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={`workspace-action-form ${className}${inline ? ' workspace-action-inline' : ''}`}
      onSubmit={guardSubmit}
      aria-busy={pending}
    >
      <FormValidation errors={state && !state.ok ? state.fieldErrors : undefined}>
        <fieldset disabled={pending} className="workspace-action-fields">
          {children}
          <div
            className={
              inline ? 'flex items-center gap-2' : 'mt-3 flex flex-wrap items-center gap-3'
            }
          >
            <SubmitButton variant={variant} pendingLabel={pendingLabel} pending={pending}>
              {submitLabel}
            </SubmitButton>
            {!quiet && state?.ok && state.message ? (
              <span
                className="max-w-full break-words text-[13px] leading-snug text-emerald-300"
                role="status"
              >
                {state.message}
              </span>
            ) : null}
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </div>
        </fieldset>
      </FormValidation>
    </form>
  );
}

export function InlineAction({
  action,
  label,
  variant = 'secondary',
  confirm,
}: {
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  confirm?: string;
  /** Creation forms opt in; update forms retain the newly selected value. */
  resetOnSuccess?: boolean;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={label}
      variant={variant}
      inline
      className=""
      confirm={confirm}
    >
      {confirm ? <span className="hidden">{confirm}</span> : null}
    </ActionForm>
  );
}
