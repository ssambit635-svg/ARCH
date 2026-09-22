'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/form';
import type { ActionResult } from '@/app/dashboard/actions';

/**
 * Binds a server action to a form and renders the outcome inline.
 *
 * Server actions return `ActionResult`; errors from the service layer (403/404/409/422, invalid
 * transitions) surface here as text instead of a stack trace — the UI never decides what is legal.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = 'primary',
  className = 'space-y-3',
  inline = false,
}: {
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  inline?: boolean;
}) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(action, undefined);

  return (
    <form action={formAction} className={className}>
      {children}
      <div className={inline ? 'flex items-center gap-2' : 'mt-3 flex flex-wrap items-center gap-3'}>
        <SubmitButton variant={variant} pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>
        {state?.ok && state.message ? (
          <span className="text-sm text-emerald-300" role="status">
            {state.message}
          </span>
        ) : null}
        {state && !state.ok ? (
          <span className="text-sm text-rose-300" role="alert">
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
    <ActionForm action={action} submitLabel={label} variant={variant} inline className="">
      {confirm ? <span className="hidden">{confirm}</span> : null}
    </ActionForm>
  );
}
