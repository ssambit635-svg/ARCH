'use client';

import { useActionState, useState } from 'react';
import { Field, FormError, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { createIncidentAction, type ActionResult } from '@/app/dashboard/actions';

/**
 * Recording an incident has to survive shaking hands: title first, everything else optional.
 * The service dropdown is filtered to the selected project's services.
 */
export function NewIncidentForm({
  projects,
  services,
  assignees,
}: {
  projects: { id: string; name: string }[];
  services: { id: string; name: string; projectId: string }[];
  assignees: { id: string; label: string }[];
}) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(createIncidentAction, undefined);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const options = services.filter((service) => service.projectId === projectId);

  if (state?.ok) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3.5 py-2.5 text-sm text-emerald-200" role="status">
          {state.message}
        </p>
        <div className="flex gap-3">
          <a className="rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:from-indigo-400 hover:to-indigo-500" href={`/dashboard/incidents/${(state.data as { incidentId?: string })?.incidentId ?? ''}`}>
            Open the incident
          </a>
          <a className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]" href="/dashboard/incidents">
            Back to the list
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormError message={state && !state.ok ? state.error : undefined} />

      <Field label="Title" htmlFor="title" error={state && !state.ok ? state.fieldErrors?.title : undefined}>
        <Input id="title" name="title" required maxLength={200} placeholder="Checkout latency spike in eu-west" />
      </Field>

      <Field label="What do we know so far?" htmlFor="description" error={state && !state.ok ? state.fieldErrors?.description : undefined}>
        <Textarea id="description" name="description" rows={4} placeholder="Impact, first observations, who is looking at it…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Severity" htmlFor="severity">
          <Select id="severity" name="severity" defaultValue="MEDIUM">
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Project" htmlFor="projectId">
          <Select id="projectId" name="projectId" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Service" htmlFor="serviceId" hint={options.length === 0 ? 'This project has no services yet.' : undefined}>
          <Select id="serviceId" name="serviceId" defaultValue="" disabled={options.length === 0}>
            <option value="">—</option>
            {options.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Assign to" htmlFor="assignedToId" hint="The assignee is always notified.">
        <Select id="assignedToId" name="assignedToId" defaultValue="">
          <option value="">— nobody yet —</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.label}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pendingLabel="Opening incident…">Declare incident</SubmitButton>
    </form>
  );
}
