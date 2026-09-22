'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/form';
import { acceptInvitationAction, type AcceptInvitationResult } from '@/app/invite/[token]/actions';

export function AcceptInvitationButton({ token }: { token: string }) {
  const [state, action] = useActionState<AcceptInvitationResult | undefined, FormData>(acceptInvitationAction, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Joining…">Accept invitation</SubmitButton>
    </form>
  );
}
