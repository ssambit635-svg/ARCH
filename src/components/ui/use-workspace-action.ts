'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import type { ActionResult } from '@/app/dashboard/actions';
import { runWorkspaceAction } from '@/lib/workspace-action';

/**
 * React resets a native action form when the action resolves, including { ok: false } responses.
 * Dispatch explicitly so failed validation/transport cannot reset select elements or draft inputs.
 * Native constraint validation still runs before onSubmit; no mutation is automatically retried.
 */
export function useWorkspaceAction(
  action: (state: ActionResult | undefined, data: FormData) => Promise<ActionResult>,
  unconfirmedMessage: string,
) {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    (state, data) => runWorkspaceAction(() => action(state, data), unconfirmedMessage),
    undefined,
  );
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  return { state, formAction, pending, onSubmit };
}
