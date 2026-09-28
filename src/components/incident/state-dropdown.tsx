'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { IncidentStatus } from '@/generated/prisma/client';
import { StatusBadge } from '@/components/ui';
import { Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { updateIncidentAction } from '@/app/dashboard/actions';

/** Legal transitions of the incident state machine, mirrored for display only — the server decides. */
const NEXT: Record<IncidentStatus, { to: IncidentStatus; label: string; hint: string }[]> = {
  INVESTIGATING: [
    { to: 'IDENTIFIED', label: 'Mark identified', hint: 'Root cause is known' },
    { to: 'MONITORING', label: 'Mark monitoring', hint: 'Fix is in, watching recovery' },
    { to: 'RESOLVED', label: 'Resolve', hint: 'Service fully recovered' },
  ],
  IDENTIFIED: [
    { to: 'MONITORING', label: 'Mark monitoring', hint: 'Fix is in, watching recovery' },
    { to: 'RESOLVED', label: 'Resolve', hint: 'Service fully recovered' },
  ],
  MONITORING: [{ to: 'RESOLVED', label: 'Resolve', hint: 'Service fully recovered' }],
  RESOLVED: [{ to: 'INVESTIGATING', label: 'Reopen', hint: 'The problem is back' }],
};

/**
 * Incident state dropdown — the fastest legal transition is one click away.
 * Opens a small note dialog for context, then calls the update action.
 */
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
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const steps = NEXT[status];

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const submit = () => {
    if (!target) return;
    const formData = new FormData();
    formData.set('incidentId', incidentId);
    formData.set('status', target.to);
    if (note.trim()) formData.set('message', note.trim());
    setTarget(null);
    setNote('');
    setOpen(false);
    startTransition(async () => {
      const result = await updateIncidentAction(undefined, formData);
      if (result.ok) {
        toast(result.message ?? 'Incident updated.', 'success');
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
    });
  };

  if (!canWrite) return <StatusBadge status={status} pulse />;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        className="group flex items-center gap-1.5 rounded-full transition hover:brightness-125 disabled:opacity-60"
        title="Change incident status"
      >
        <StatusBadge status={status} pulse />
        <svg viewBox="0 0 16 16" className="size-3.5 text-slate-500 transition group-hover:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div role="menu" aria-label="Change status" className="layer-shadow absolute left-0 top-full z-50 mt-2 w-64 animate-scale-in rounded-xl border border-white/10 bg-abyss-850 p-1.5">
          {steps.map((step) => (
            <button
              key={step.to}
              type="button"
              role="menuitem"
              onClick={() => setTarget(step)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.06]"
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
        open={target !== null}
        onClose={() => {
          setTarget(null);
          setNote('');
        }}
        title={target ? `${target.label}` : 'Update status'}
        description="A short note lands on the timeline with the transition."
      >
        <div className="space-y-4">
          <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed for customers? (optional)" aria-label="Transition note" />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setTarget(null);
                setNote('');
              }}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-xl bg-bone px-3.5 py-2 text-sm font-medium text-ink-1000 transition hover:bg-white disabled:opacity-60"
            >
              {pending ? 'Updating…' : target?.label ?? 'Update'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
