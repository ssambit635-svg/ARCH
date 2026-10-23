'use client';

import { useWorkspaceAction } from '@/components/ui/use-workspace-action';

import { useState } from 'react';
import { Field, FormError, FormValidation, Input, SubmitButton } from '@/components/ui/form';
import type { ActionResult } from '@/app/dashboard/actions';

export function OnboardingForm({
  action,
}: {
  action: (state: ActionResult | undefined, data: FormData) => Promise<ActionResult>;
}) {
  const { state, formAction, pending, onSubmit } = useWorkspaceAction(
    action,
    'Could not confirm workspace creation. Your name is still here. Refresh before trying again.',
  );
  const [name, setName] = useState('');
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      aria-label="Create a workspace"
      aria-busy={pending}
    >
      <FormValidation errors={state && !state.ok ? state.fieldErrors : undefined}>
        <FormError message={state && !state.ok ? state.error : undefined} />
        <Field
          label="Workspace name"
          htmlFor="organization-name"
          hint="Your team or organization name. You can change it later."
        >
          <Input
            disabled={pending}
            id="organization-name"
            name="name"
            placeholder="Your team"
            autoComplete="organization"
            minLength={2}
            maxLength={80}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <SubmitButton pending={pending} pendingLabel="Creating workspace…">
          Create workspace <span aria-hidden="true">→</span>
        </SubmitButton>
      </FormValidation>
    </form>
  );
}
