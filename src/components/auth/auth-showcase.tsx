'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AI_NAME } from '@/lib/brand';
import { CheckIcon } from './icons';

const STAGES = [
  {
    state: 'Investigating',
    key: 'investigating',
    suggestion:
      'Compare the recent deployment with similar incidents and the linked runbook. The available evidence does not yet confirm a root cause.',
    timeline: [
      { time: '03:12', text: 'Latency alert received. Incident opened.' },
      { time: '03:13', text: 'Alex joined the response.' },
      { time: '03:14', text: 'Deployment and runbook added for investigation.' },
    ],
  },
  {
    state: 'Identified',
    key: 'identified',
    suggestion:
      'The responder has identified a database lock after the deployment. Review the migration notes before choosing the next step.',
    timeline: [
      { time: '03:13', text: 'Alex joined the response.' },
      { time: '03:15', text: 'Database lock identified by the responder.' },
      { time: '03:16', text: 'Rollback plan shared with the team.' },
    ],
  },
  {
    state: 'Monitoring',
    key: 'monitoring',
    suggestion:
      'The timeline records a rollback and a recovery check. Review the monitoring notes before resolving the incident.',
    timeline: [
      { time: '03:15', text: 'Database lock identified by the responder.' },
      { time: '03:18', text: 'Rollback confirmed. Service recovering.' },
      { time: '03:19', text: 'Public update reviewed and published.' },
    ],
  },
  {
    state: 'Resolved',
    key: 'resolved',
    suggestion:
      'Use the response timeline to prepare a postmortem draft. Have the team verify the impact, root cause, and follow-up actions.',
    timeline: [
      { time: '03:18', text: 'Rollback confirmed. Service recovering.' },
      { time: '03:24', text: 'Recovery verified by the team.' },
      { time: '03:26', text: 'Incident resolved. Postmortem draft saved.' },
    ],
  },
] as const;

/** An explicitly labelled sample, never a live feed or a claim about automated remediation. */
export function AuthShowcase() {
  const [activeIndex, setActiveIndex] = useState(2);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const stage = STAGES[activeIndex]!;

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % STAGES.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + STAGES.length) % STAGES.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = STAGES.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveIndex(next);
    tabs.current[next]?.focus();
  }

  return (
    <aside className="auth-showcase" aria-labelledby="auth-showcase-title">
      <div className="auth-showcase-copy">
        <p className="auth-showcase-badge">
          <span aria-hidden="true" />
          Built for your on-call
        </p>
        <h2 id="auth-showcase-title" className="auth-showcase-title">
          Through the noise.
          <br />
          <span>Back to calm.</span>
        </h2>
        <p className="auth-showcase-lede">
          The alert, the context, the next step.
          <br />
          All together. All on your infrastructure.
        </p>
      </div>

      <figure className="auth-preview">
        <div className="auth-window">
          <div className="auth-window-bar" aria-hidden="true">
            <span className="auth-window-dots">
              <i />
              <i />
              <i />
            </span>
            <span>ARCH / incident workspace</span>
            <span className="auth-window-tag">Sample data</span>
          </div>

          <div className="auth-window-body">
            <div className="auth-inc-header">
              <span className="auth-inc-id">
                INC-204 <span>·</span> CHECKOUT API
              </span>
              <span className={`auth-inc-state auth-inc-state--${stage.key}`}>
                <span aria-hidden="true" />
                {stage.state}
              </span>
            </div>
            <h3 className="auth-inc-title">Checkout latency is elevated</h3>
            <p className="auth-inc-context">
              checkout-api <span> / </span> eu-west-1
            </p>

            <div
              className="auth-lifecycle-tabs"
              role="tablist"
              aria-label="Sample incident lifecycle"
            >
              {STAGES.map((item, index) => (
                <button
                  key={item.key}
                  ref={(element) => {
                    tabs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`auth-stage-tab-${item.key}`}
                  aria-selected={index === activeIndex}
                  aria-controls="auth-stage-panel"
                  tabIndex={index === activeIndex ? 0 : -1}
                  className="auth-lifecycle-tab"
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  {item.state}
                </button>
              ))}
            </div>

            <div
              id="auth-stage-panel"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={`auth-stage-tab-${stage.key}`}
              className="auth-incident-panel"
            >
              <div className="auth-timeline-heading">
                <h4>One continuous timeline</h4>
                <span>UTC</span>
              </div>
              <ol className="auth-timeline">
                {stage.timeline.map((entry) => (
                  <li key={entry.time}>
                    <time>{entry.time}</time>
                    <span className="auth-timeline-node" aria-hidden="true" />
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ol>
              <div className="auth-suggestion">
                <p className="auth-suggestion-label">
                  <span aria-hidden="true">✳</span>
                  {AI_NAME}
                  <span className="auth-draft-tag">Draft</span>
                </p>
                <p className="auth-suggestion-body">{stage.suggestion}</p>
                <span className="auth-suggestion-note">For your team to review. Always.</span>
              </div>
            </div>
          </div>
        </div>
        <figcaption>Interactive preview · illustrative data, not a live incident feed.</figcaption>
      </figure>

      <ul className="auth-principles" aria-label="How ARCH works">
        <li>
          <CheckIcon />
          Self-hosted
        </li>
        <li>
          <CheckIcon />
          Native AI
        </li>
        <li>
          <CheckIcon />
          Human-reviewed
        </li>
      </ul>
    </aside>
  );
}
