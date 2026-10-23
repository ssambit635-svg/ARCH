'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { IncidentStatus } from '@/generated/prisma/client';
import { StatusBadge } from '@/components/ui';
import { Field, FormError, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/dialog';
import { usePopupMenu } from '@/components/ui/use-popup-menu';
import { toast } from '@/components/ui/toast';
import { updateIncidentAction } from '@/app/dashboard/actions';

const NEXT: Record<IncidentStatus, { to: IncidentStatus; label: string; hint: string }[]> = {
  INVESTIGATING: [
    { to: 'IDENTIFIED', label: 'Mark identified', hint: 'The cause is understood' },
    { to: 'MONITORING', label: 'Mark monitoring', hint: 'A fix is in; watch for recovery' },
    { to: 'RESOLVED', label: 'Resolve incident', hint: 'The service has recovered' },
  ],
  IDENTIFIED: [
    { to: 'MONITORING', label: 'Mark monitoring', hint: 'A fix is in; watch for recovery' },
    { to: 'RESOLVED', label: 'Resolve incident', hint: 'The service has recovered' },
  ],
  MONITORING: [{ to: 'RESOLVED', label: 'Resolve incident', hint: 'The service has recovered' }],
  RESOLVED: [{ to: 'INVESTIGATING', label: 'Reopen incident', hint: 'The problem has returned' }],
};

export function IncidentStateDropdown({
  incidentId,
  status,
  canWrite,
}: {
  incidentId: string;
  status: IncidentStatus;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ to: IncidentStatus; label: string } | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menu = usePopupMenu(open, setOpen);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const closeDialog = () => {
    if (!pending) {
      setTarget(null);
      setNote('');
      setError(null);
    }
  };
  const submit = () => {
    if (!target || pending) return;
    const formData = new FormData();
    formData.set('incidentId', incidentId);
    formData.set('status', target.to);
    if (note.trim()) formData.set('message', note.trim());
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateIncidentAction(undefined, formData);
        if (result.ok) {
          setTarget(null);
          setNote('');
          toast(result.message ?? 'Incident updated.', 'success');
          router.refresh();
        } else setError(result.error);
      } catch {
        setError(
          'Could not confirm the status change. Your note is still here; check the timeline before trying again.',
        );
      }
    });
  };
  if (!canWrite) return <StatusBadge status={status} />;
  return (
    <div ref={menu.containerRef} className="relative">
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={menu.onTriggerKeyDown}
        aria-label={`Change status, ${status.charAt(0) + status.slice(1).toLowerCase()}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        className="workspace-status-trigger flex items-center gap-2"
        title="Change incident status"
      >
        <StatusBadge status={status} />
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menu.menuRef}
          role="menu"
          aria-label="Change status"
          className="workspace-status-menu layer-shadow absolute top-full z-50 mt-2 rounded-xl border border-white/10 bg-abyss-850 p-1.5"
        >
          {NEXT[status].map((step) => (
            <button
              key={step.to}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                menu.close();
                setTarget(step);
                setNote('');
                setError(null);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/[0.06]"
            >
              <span>
                <span className="block text-[13px] font-medium text-slate-100">{step.label}</span>
                <span className="block text-xs text-slate-500">{step.hint}</span>
              </span>
              <StatusBadge status={step.to} />
            </button>
          ))}
        </div>
      ) : null}
      <Dialog
        busy={pending}
        open={target !== null}
        onClose={closeDialog}
        title={target?.label ?? 'Update status'}
        description="The transition is recorded on the timeline. Add a short note so your team knows what changed."
        initialFocusRef={noteRef}
      >
        <div className="space-y-5" aria-busy={pending}>
          <FormError message={error} />
          <Field
            label="Response update"
            htmlFor="transition-note"
            optional
            hint="This note may appear on a linked public status page. Keep it customer-safe."
          >
            <Textarea
              ref={noteRef}
              id="transition-note"
              rows={4}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={pending}
              placeholder="What changed, and what should your team do next?"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDialog}
              disabled={pending}
              className="workspace-button workspace-button--secondary px-4 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="workspace-button workspace-button--primary px-4 text-sm"
            >
              {pending ? 'Updating…' : (target?.label ?? 'Update')}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
