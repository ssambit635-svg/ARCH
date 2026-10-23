'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionForm } from './action-form';
import { Field, Input, Select } from '@/components/ui/form';
import { OneTimeSecret } from '@/components/ui/one-time-secret';
import { Button, ButtonLink } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import type { ActionResult } from '@/app/dashboard/actions';
type WebhookAction = (state: ActionResult | undefined, data: FormData) => Promise<ActionResult>;

function newSecret(result: ActionResult): string | null {
  if (!result.ok || !result.data || typeof result.data !== 'object') return null;
  const value = (result.data as { secret?: unknown }).secret;
  return typeof value === 'string' && value ? value : null;
}

type Project = { id: string; name: string };
type Service = { id: string; name: string; projectId: string };

export function WebhookCreateForm({
  projects,
  services,
  action,
}: {
  projects: Project[];
  services: Service[];
  action: WebhookAction;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [serviceId, setServiceId] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const availableServices = services.filter((service) => service.projectId === projectId);
  if (!projects.length)
    return (
      <div className="workspace-inline-setup">
        <p>
          Create a project before connecting an alert provider. A webhook must route to a project in
          this workspace.
        </p>
        <ButtonLink href="/dashboard/projects" variant="secondary">
          Create a project
        </ButtonLink>
      </div>
    );
  if (secret)
    return (
      <OneTimeSecret
        secret={secret}
        label="New webhook signing secret"
        onDismiss={() => {
          setSecret(null);
          requestAnimationFrame(() => document.getElementById('webhook-provider')?.focus());
        }}
      />
    );
  return (
    <ActionForm
      action={action}
      submitLabel="Create endpoint"
      onDone={(result) => {
        const value = newSecret(result);
        if (value) setSecret(value);
      }}
    >
      <Field
        label="Provider name"
        htmlFor="webhook-provider"
        hint="Lowercase letters, numbers, and hyphens. For example: grafana or sentry."
      >
        <Input
          name="provider"
          required
          minLength={2}
          maxLength={60}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="grafana"
        />
      </Field>
      <Field label="Project" htmlFor="webhook-project">
        <Select
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
        label="Default service"
        htmlFor="webhook-service"
        hint="Optional. Only this project’s services are available."
      >
        <Select
          name="serviceId"
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
        >
          <option value="">No default service</option>
          {availableServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description" htmlFor="webhook-description" optional>
        <Input name="description" maxLength={200} placeholder="Grafana alerting for payments" />
      </Field>
    </ActionForm>
  );
}

export function WebhookEndpointActions({
  endpointId,
  isActive,
  provider,
  actions,
}: {
  endpointId: string;
  isActive: boolean;
  provider: string;
  actions: { toggle: WebhookAction; rotate: WebhookAction; remove: WebhookAction };
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={actionsRef} className="workspace-webhook-actions">
      <div className="workspace-webhook-action-buttons">
        <ActionForm
          action={actions.toggle}
          submitLabel={isActive ? 'Disable' : 'Enable'}
          variant="secondary"
          inline
          quiet
        >
          <input type="hidden" name="endpointId" value={endpointId} />
          <input type="hidden" name="isActive" value={String(!isActive)} />
        </ActionForm>
        {!secret ? (
          <ActionForm
            action={actions.rotate}
            submitLabel="Rotate secret"
            variant="secondary"
            inline
            quiet
            confirm={`Rotate the ${provider} signing secret? The previous secret will stop working. Update the alert provider with the new value before sending more alerts.`}
            onDone={(result) => {
              const value = newSecret(result);
              if (value) setSecret(value);
            }}
          >
            <input type="hidden" name="endpointId" value={endpointId} />
          </ActionForm>
        ) : null}
        <ActionForm
          action={actions.remove}
          submitLabel="Delete"
          variant="danger"
          inline
          quiet
          confirm={`Delete this ${provider} endpoint? Alerts sent to its URL will no longer open incidents.`}
        >
          <input type="hidden" name="endpointId" value={endpointId} />
        </ActionForm>
      </div>
      {secret ? (
        <OneTimeSecret
          secret={secret}
          label="New webhook signing secret"
          onDismiss={() => {
            setSecret(null);
            requestAnimationFrame(() =>
              Array.from(actionsRef.current?.querySelectorAll('button') ?? [])
                .find((button) => button.textContent?.trim() === 'Rotate secret')
                ?.focus(),
            );
          }}
        />
      ) : null}
    </div>
  );
}

/** Copy the reachable browser origin, never a hard-coded development/backend hostname. */
export function WebhookEndpointUrl({
  provider,
  externalId,
}: {
  provider: string;
  externalId: string;
}) {
  const path = `/api/webhooks/${encodeURIComponent(provider)}?endpoint=${encodeURIComponent(externalId)}`;
  const [url, setUrl] = useState(path);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'unavailable'>('idle');
  useEffect(() => {
    setUrl(new URL(path, window.location.origin).href);
  }, [path]);
  return (
    <div className="workspace-webhook-url">
      <code>{url}</code>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-disabled={copyState === 'copying'}
        aria-label={`${copyState === 'copied' ? 'Copied' : 'Copy URL'} (${provider} webhook)`}
        onClick={async () => {
          if (copyState === 'copying') return;
          setCopyState('copying');
          setCopyState(
            (await copyToClipboard(new URL(path, window.location.origin).href))
              ? 'copied'
              : 'unavailable',
          );
        }}
      >
        {copyState === 'copied' ? 'Copied' : 'Copy URL'}
      </Button>
      <span
        role="status"
        className={copyState === 'unavailable' ? 'workspace-webhook-copy-error' : 'sr-only'}
      >
        {copyState === 'unavailable'
          ? 'Clipboard access is unavailable. Select and copy the full URL shown here.'
          : copyState === 'copied'
            ? 'Webhook URL copied.'
            : ''}
      </span>
    </div>
  );
}
