'use client';

import { useWorkspaceAction } from '@/components/ui/use-workspace-action';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Field,
  FormError,
  FormValidation,
  Input,
  Select,
  SubmitButton,
  Textarea,
} from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import type { ActionResult } from '@/app/dashboard/actions';
import type { IncidentSeverity } from '@/generated/prisma/client';

const severityHelp: Record<IncidentSeverity, string> = {
  LOW: 'Limited impact; normal response is appropriate.',
  MEDIUM: 'Some users or functionality are affected.',
  HIGH: 'Significant customer impact; prioritize the response.',
  CRITICAL: 'Widespread or severe impact; immediate response is needed.',
};

export function NewIncidentForm({
  projects,
  services,
  assignees,
  createAction,
  initialProjectId,
  initialServiceId,
}: {
  projects: { id: string; name: string }[];
  services: { id: string; name: string; projectId: string }[];
  assignees: { id: string; label: string }[];
  createAction: (state: ActionResult | undefined, data: FormData) => Promise<ActionResult>;
  initialProjectId?: string;
  initialServiceId?: string;
}) {
  const { state, formAction, pending, onSubmit } = useWorkspaceAction(
    createAction,
    'Could not confirm the incident. Your draft is still here. Check the incident list before trying again.',
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? '');
  const [serviceId, setServiceId] = useState(initialServiceId ?? '');
  const [assigneeId, setAssigneeId] = useState('');
  const handled = useRef(state);
  const router = useRouter();
  const options = services.filter((service) => service.projectId === projectId);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const createdId =
    state?.ok &&
    state.data &&
    typeof state.data === 'object' &&
    'incidentId' in state.data &&
    typeof state.data.incidentId === 'string'
      ? state.data.incidentId
      : null;

  useEffect(() => {
    if (!state || state === handled.current) return;
    handled.current = state;
    if (state.ok && createdId) {
      toast('Incident declared. Your response workspace is ready.', 'success');
      router.push(`/dashboard/incidents/${createdId}`);
    }
  }, [state, createdId, router]);

  if (state?.ok)
    return (
      <div className="space-y-3">
        <p role="status">Incident declared. Opening its response timeline…</p>
        <a
          className="workspace-filter-reset"
          href={createdId ? `/dashboard/incidents/${createdId}` : '/dashboard/incidents'}
        >
          Continue to the incident
        </a>
      </div>
    );
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      className="workspace-incident-form"
      aria-label="Declare an incident"
      aria-busy={pending}
    >
      <FormValidation errors={errors}>
        <FormError message={state && !state.ok ? state.error : undefined} />
        <Field
          label="Incident title"
          htmlFor="title"
          hint="Describe the customer impact. You can refine it as you learn more."
        >
          <Input
            disabled={pending}
            id="title"
            name="title"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Checkout requests are timing out"
          />
        </Field>
        <div className="workspace-incident-form-grid">
          <Field label="Project" htmlFor="projectId">
            <Select
              disabled={pending}
              id="projectId"
              name="projectId"
              required
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setServiceId('');
              }}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Affected service"
            htmlFor="serviceId"
            optional
            hint={
              options.length
                ? 'Optional. Link the service if you know which one is affected.'
                : 'No services in this project. You can link one later.'
            }
          >
            <Select
              id="serviceId"
              name="serviceId"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              disabled={pending || !options.length}
            >
              <option value="">No service linked</option>
              {options.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Severity" htmlFor="severity" hint={severityHelp[severity]}>
          <Select
            disabled={pending}
            id="severity"
            name="severity"
            value={severity}
            onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </Field>
        <details
          className="workspace-disclosure"
          open={Boolean(errors?.description || errors?.assignedToId)}
        >
          <summary>
            Add context & assign a responder{' '}
            <span className="workspace-muted text-xs">Optional</span>
          </summary>
          <div className="workspace-disclosure-body">
            <Field
              label="What do we know so far?"
              htmlFor="description"
              optional
              hint="Impact, observations, or next steps. Do not include secrets."
            >
              <Textarea
                disabled={pending}
                id="description"
                name="description"
                rows={4}
                maxLength={5000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is affected? When did it start?"
              />
            </Field>
            <Field
              label="Assign to"
              htmlFor="assignedToId"
              optional
              hint="Notifications are queued for responders. Delivery requires your configured worker and email provider."
            >
              <Select
                disabled={pending}
                id="assignedToId"
                name="assignedToId"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </details>
        <div className="workspace-form-actions">
          <SubmitButton pending={pending} pendingLabel="Declaring incident…">
            Declare incident
          </SubmitButton>
          <a href="/dashboard/incidents">Cancel</a>
        </div>
        <p className="workspace-form-footer">
          A linked public status page can show this incident’s title, description, and updates. Keep
          them customer-safe.
        </p>
      </FormValidation>
    </form>
  );
}
