'use client';

import { useActionState, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Input, Select, SubmitButton } from '@/components/ui/form';
import { inviteMemberAction, type ActionResult } from '@/app/dashboard/actions';
import { copyToClipboard } from '@/lib/copy-to-clipboard';

/** Invite-a-teammate modal — the one-time invite link renders inside with a copy button. */
export function InviteModal({ triggerLabel = 'Invite member' }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(inviteMemberAction, undefined);
  const [copied, setCopied] = useState(false);
  const [copyUnavailable, setCopyUnavailable] = useState(false);

  const inviteUrl = state?.ok ? (state.data as { inviteUrl?: string } | undefined)?.inviteUrl : undefined;
  const showLink = Boolean(inviteUrl && state?.ok && state.message && !state.message.startsWith('Invitation emailed'));

  const copy = async () => {
    if (!inviteUrl) return;
    const didCopy = await copyToClipboard(inviteUrl);
    setCopied(didCopy);
    setCopyUnavailable(!didCopy);
    if (didCopy) window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-bone px-3.5 py-2 text-sm font-medium text-ink-1000 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.9)] ring-1 ring-inset ring-ink-1000/10 transition hover:bg-white active:scale-[0.98]"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
        {triggerLabel}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Invite a teammate" description="They join this organization with the role you pick.">
        <form action={action} className="space-y-4">
          <FormError message={state && !state.ok ? state.error : undefined} />
          <Field label="Email" htmlFor="invite-email">
            <Input id="invite-email" name="email" type="email" required placeholder="teammate@company.com" autoComplete="off" />
          </Field>
          <Field label="Role" htmlFor="invite-role" hint="VIEWER is read-only · RESPONDER runs incidents · ADMIN manages everything except ownership.">
            <Select id="invite-role" name="role" defaultValue="RESPONDER">
              <option value="ADMIN">ADMIN</option>
              <option value="RESPONDER">RESPONDER</option>
              <option value="VIEWER">VIEWER</option>
            </Select>
          </Field>

          {state?.ok && state.message && !showLink ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3.5 py-2.5 text-sm text-emerald-200" role="status">
              {state.message}
            </p>
          ) : null}

          {showLink && inviteUrl ? (
            <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3.5">
              <p className="text-[13px] font-medium text-amber-200">Invitation created — share this link once:</p>
              <p className="arch-mono break-all rounded-lg bg-abyss-950/80 p-2.5 text-xs text-slate-200">{inviteUrl}</p>
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[13px] font-medium text-slate-200 transition hover:bg-white/[0.1]"
              >
                {copied ? 'Copied ✓' : 'Copy link'}
              </button>
              {copyUnavailable ? (
                <p className="text-xs text-amber-200" role="status">Clipboard access is blocked here. Select the link above to copy it manually.</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
            >
              {state?.ok ? 'Done' : 'Cancel'}
            </button>
            {!state?.ok ? <SubmitButton pendingLabel="Inviting…">Send invitation</SubmitButton> : null}
          </div>
        </form>
      </Dialog>
    </>
  );
}
