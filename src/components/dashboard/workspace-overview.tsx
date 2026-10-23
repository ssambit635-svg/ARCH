import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { workspaceHealth } from '@/lib/workspace-view';

export function WorkspaceHealthBanner({
  health,
  priorityHref,
}: {
  health: ReturnType<typeof workspaceHealth>;
  priorityHref?: string;
}) {
  return (
    <section className="workspace-health" data-tone={health.tone} aria-label="Workspace health">
      <span className="workspace-health-icon" aria-hidden="true">
        {health.tone === 'danger' || health.tone === 'warning'
          ? '!'
          : health.tone === 'success'
            ? '✓'
            : '—'}
      </span>
      <div className="workspace-health-copy">
        <h2>{health.title}</h2>
        <p>{health.description}</p>
      </div>
      {priorityHref ? (
        <ButtonLink href={priorityHref} variant="secondary" size="sm">
          Open priority incident <span aria-hidden="true">↗</span>
        </ButtonLink>
      ) : null}
    </section>
  );
}

export function WorkspaceMetrics({
  metrics,
}: {
  metrics: {
    label: string;
    value: number;
    hint: string;
    tone?: 'danger' | 'warning';
    href?: string;
  }[];
}) {
  return (
    <div className="workspace-stats">
      {metrics.map((metric) => (
        <div key={metric.label} className="workspace-metric" data-tone={metric.tone}>
          <dl>
            <dt>{metric.label}</dt>
            <dd>
              {metric.href ? (
                <Link
                  href={metric.href}
                  aria-label={`${metric.value} ${metric.label.toLowerCase()}`}
                >
                  {metric.value}
                </Link>
              ) : (
                metric.value
              )}
            </dd>
          </dl>
          <p>{metric.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceChecklist({
  steps,
}: {
  steps: {
    title: string;
    description: string;
    complete: boolean;
    href?: string;
    action?: string;
  }[];
}) {
  return (
    <ol className="workspace-checklist">
      {steps.map((step, index) => (
        <li key={step.title}>
          <span
            className={`workspace-checklist-mark${step.complete ? ' is-done' : ''}`}
            aria-label={step.complete ? 'Complete' : `Step ${index + 1}`}
          >
            {step.complete ? '✓' : index + 1}
          </span>
          <div>
            <h3>{step.title}</h3>
            <p>
              {step.description}
              {!step.complete && step.href ? (
                <>
                  {' '}
                  <Link href={step.href}>{step.action ?? 'Get started'}</Link>
                </>
              ) : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
