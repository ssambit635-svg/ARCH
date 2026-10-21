'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LinkArrow } from './link-arrow';

interface PreviewIncident {
  id: string;
  title: string;
  service: string;
  severity: string;
  status: 'Investigating' | 'Identified' | 'Monitoring' | 'Resolved';
  assignee: string;
  suggestion: string;
  timeline: Array<{ time: string; text: string }>;
}

const INCIDENTS: PreviewIncident[] = [
  {
    id: 'INC-204',
    title: 'Checkout API latency is elevated',
    service: 'checkout-api',
    severity: 'CRITICAL',
    status: 'Monitoring',
    assignee: 'Alex Mercer',
    suggestion: 'A database lock appeared after the latest deploy. Review the migration and compare it with previous pool-saturation incidents before choosing a rollback.',
    timeline: [
      { time: '03:12', text: 'Latency alert received. Incident opened.' },
      { time: '03:13', text: 'Alex joined the response and began investigating.' },
      { time: '03:15', text: 'Related deployment and runbook added to the timeline.' },
      { time: '03:18', text: 'Database lock identified. Rollback under review.' },
    ],
  },
  {
    id: 'INC-203',
    title: 'Webhook deliveries are delayed',
    service: 'webhook-worker',
    severity: 'HIGH',
    status: 'Investigating',
    assignee: 'Sam Patel',
    suggestion: 'Delivery retries increased alongside queue depth. Check worker throughput and the downstream rate limit; the available evidence does not yet confirm a root cause.',
    timeline: [
      { time: '02:46', text: 'Queue-depth alert received. Incident opened.' },
      { time: '02:48', text: 'Sam joined the response.' },
      { time: '02:52', text: 'Retry metrics added for investigation.' },
    ],
  },
  {
    id: 'INC-201',
    title: 'Database connection spike',
    service: 'postgres-primary',
    severity: 'LOW',
    status: 'Resolved',
    assignee: 'Taylor Chen',
    suggestion: 'The timeline records a pool-limit adjustment and recovery. Use those notes to prepare a postmortem draft, then have the responder verify the impact and follow-up actions.',
    timeline: [
      { time: '01:20', text: 'Connection-limit alert received.' },
      { time: '01:24', text: 'Pool configuration identified as the cause.' },
      { time: '01:31', text: 'Configuration adjusted. Service monitored.' },
    ],
  },
];

/**
 * The workspace preview is the centrepiece: a real, dark application window with the same
 * information hierarchy as the shipped console. Selecting an incident swaps the record, so the
 * page demonstrates the workflow instead of describing it.
 */
export function Workspace() {
  const [activeIndex, setActiveIndex] = useState(0);
  const incident = INCIDENTS[activeIndex]!;

  return (
    <section id="product" className="mk-section mk-band--white mk-dawn--workspace" aria-labelledby="workspace-title">
      <div className="mk-container">
        <div className="mk-section-head">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>The workspace</p>
            <h2 id="workspace-title" className="mk-title" data-mk-heading aria-label="The whole picture, in one window.">
              The whole picture,<br /> in one window.
            </h2>
            <p className="mk-description" data-mk-reveal>
              A shared queue, one continuous timeline, and just enough context to take the next step.
            </p>
          </div>
          <Link href="/login" className="mk-text-link mk-section-aside" data-mk-reveal>
            Open your workspace <LinkArrow />
          </Link>
        </div>

        <div className="mk-app" data-mk-panel>
          <div className="mk-on-dark">
            <div className="mk-app-bar">
              <span className="mk-window-dots" aria-hidden="true">
                <span className="mk-window-dot" /><span className="mk-window-dot" /><span className="mk-window-dot" />
              </span>
              <span className="mk-app-address">app.arch.dev / incidents</span>
              <span className="mk-app-bar-right" aria-hidden="true"><i /> live · sample data</span>
            </div>

            <div className="mk-app-body">
              <div className="mk-app-rail">
                <p className="mk-rail-label">Incidents <span>{INCIDENTS.length}</span></p>
                <div className="mk-rail-list" aria-label="Sample incidents">
                  {INCIDENTS.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`mk-rail-item${index === activeIndex ? ' is-active' : ''}`}
                      aria-pressed={index === activeIndex}
                      aria-controls="preview-incident-detail"
                      onClick={() => setActiveIndex(index)}
                    >
                      <span className="mk-rail-id"><span>{item.id}</span><span>{item.severity}</span></span>
                      <span className="mk-rail-title">{item.title}</span>
                      <span className="mk-rail-status">
                        <span className={`mk-dot mk-dot--${item.status.toLowerCase()}`} aria-hidden="true" />
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div id="preview-incident-detail" className="mk-app-detail" aria-live="polite" aria-atomic="true">
                <div className="mk-detail-head">
                  <span className="mk-detail-id">{incident.id}</span>
                  <span className={`mk-state mk-state--${incident.status.toLowerCase()}`}>{incident.status}</span>
                </div>
                <h3>{incident.title}</h3>
                <dl className="mk-meta">
                  <div><dt>Service</dt><dd>{incident.service}</dd></div>
                  <div><dt>Severity</dt><dd>{incident.severity}</dd></div>
                  <div><dt>Assigned to</dt><dd>{incident.assignee}</dd></div>
                  <div><dt>Source</dt><dd>webhook</dd></div>
                </dl>
                <div className="mk-app-grid">
                  <div className="mk-suggestion">
                    <h4>Suggested next step</h4>
                    <p>{incident.suggestion}</p>
                    <span>Draft · responder review required</span>
                  </div>
                  <div className="mk-timeline">
                    <h4>Timeline</h4>
                    <ol>
                      {incident.timeline.map((event, index) => (
                        <li key={event.time}>
                          <span className="mk-timeline-stamp">
                            <span className="mk-timeline-number" aria-hidden="true">{index + 1}.</span>
                            <time>{event.time}</time>
                          </span>
                          <span>{event.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mk-app-caption">
          Interactive preview · illustrative data, not a live incident feed.
        </p>
      </div>
    </section>
  );
}
