'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import {
  Field,
  FormError,
  FormValidation,
  Input,
  Select,
  SubmitButton,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useWorkspaceAction } from '@/components/ui/use-workspace-action';
import { inviteMemberAction } from '@/app/dashboard/actions';
import { copyToClipboard } from '@/lib/copy-to-clipboard';

/** A newly returned manual invitation link lives in the open dialog only. */
export function InviteModal({ triggerLabel = 'Invite member' }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        leftIcon={
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
        }
      >
        {triggerLabel}
      </Button>
      {open ? <InviteDialog onClose={close} /> : null}
    </>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const { state, formAction, pending, onSubmit } = useWorkspaceAction(
    inviteMemberAction,
    'Could not confirm this invitation. Your inputs are still here. Check the invitations list before trying again.',
  );
  const [copied, setCopied] = useState(false);
  const [copyUnavailable, setCopyUnavailable] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteUrl = state?.ok
    ? (state.data as { inviteUrl?: string } | undefined)?.inviteUrl
    : undefined;
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <Dialog
      open
      onClose={onClose}
      busy={pending}
      title="Invite a teammate"
      description="They join this workspace with the role you choose."
    >
      <form action={formAction} onSubmit={onSubmit} className="space-y-4" aria-busy={pending}>
        <FormValidation errors={state && !state.ok ? state.fieldErrors : undefined}>
          <FormError message={state && !state.ok ? state.error : undefined} />
          <Field label="Email address" htmlFor="invite-email">
            <Input
              name="email"
              type="email"
              required
              maxLength={200}
              placeholder="teammate@company.com"
              autoComplete="off"
              disabled={pending || Boolean(state?.ok)}
            />
          </Field>
          <Field
            label="Role"
            htmlFor="invite-role"
            hint="Viewers read, responders run incidents, and admins manage the workspace except ownership."
          >
            <Select name="role" defaultValue="RESPONDER" disabled={pending || Boolean(state?.ok)}>
              <option value="ADMIN">Admin</option>
              <option value="RESPONDER">Responder</option>
              <option value="VIEWER">Viewer</option>
            </Select>
          </Field>
        </FormValidation>
        {state?.ok && state.message && !inviteUrl ? (
          <p className="workspace-invite-success" role="status">
            {state.message}
          </p>
        ) : null}
        {inviteUrl ? (
          <section className="workspace-invite-result" aria-label="One-time invitation link">
            <p>Invitation created — share this link with your teammate.</p>
            <p className="workspace-muted text-xs">
              The link is available in this dialog only. Copy it before closing.
            </p>
            <Input
              readOnly
              type="url"
              value={inviteUrl}
              aria-label="Invitation link"
              data-ui-sensitive="true"
              autoComplete="off"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                const success = await copyToClipboard(inviteUrl);
                setCopied(success);
                setCopyUnavailable(!success);
                if (timer.current) clearTimeout(timer.current);
                if (success) timer.current = setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <p className="workspace-muted text-xs" role="status">
              {copyUnavailable
                ? 'Clipboard access is unavailable. Select the invitation link and copy it manually.'
                : copied
                  ? 'Invitation link copied.'
                  : ''}
            </p>
          </section>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
            {state?.ok ? 'Done' : 'Cancel'}
          </Button>
          {!state?.ok ? (
            <SubmitButton pending={pending} pendingLabel="Inviting…">
              Send invitation
            </SubmitButton>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
