'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { commentOnIncidentAction, type ActionResult } from '@/app/dashboard/actions';

const TEMPLATES = [
  { label: 'Status update', text: 'Update: ' },
  { label: 'Mitigation', text: 'Mitigation in progress: ' },
  { label: 'Handoff', text: 'Handoff — current state: ' },
];

/** Timeline comment composer with quick templates. Posts via commentOnIncidentAction. */
export function CommentBox({ incidentId }: { incidentId: string }) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(commentOnIncidentAction, undefined);
  const [body, setBody] = useState('');
  const seen = useRef(state);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!state || state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      setBody('');
      toast(state.message ?? 'Update posted to the timeline.', 'success');
    } else {
      toast(state.error, 'error');
    }
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="incidentId" value={incidentId} />
      <div className="overflow-hidden rounded-xl border border-white/10 bg-abyss-950/70 transition focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20">
        <Textarea
          ref={boxRef}
          name="body"
          rows={3}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Update responders and the audit trail…  (⌘/Ctrl + Enter to post)"
          aria-label="Timeline update"
          className="!border-0 !bg-transparent !shadow-none !ring-0"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && body.trim()) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-white/[0.015] px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => {
                  setBody((previous) => (previous ? previous : template.text));
                  boxRef.current?.focus();
                }}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-slate-200"
              >
                {template.label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:from-indigo-400 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Posting…' : 'Post update'}
          </button>
        </div>
      </div>
      {state && !state.ok ? (
        <p className="text-[13px] text-rose-300" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
