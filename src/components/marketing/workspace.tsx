'use client';

import { LinkArrow } from './link-arrow';
import { useState } from 'react';
import Link from 'next/link';

interface PreviewIncident {
  id: string;
  title: string;
  service: string;
  severity: string;
  status: 'Investigating' | 'Identified' | 'Resolved';
  assignee: string;
  suggestion: string;
  timeline: Array<{ time: string; text: string }>;
}

const INCIDENTS: PreviewIncident[] = [
  {
    id: 'INC-204',
    title: 'Checkout API latency is elevated',
    service: 'checkout-api',
    severity: 'High',
    status: 'Identified',
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
    severity: 'Medium',
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
    severity: 'Low',
    status: 'Resolved',
    assignee: 'Taylor Chen',
    suggestion: 'The timeline records a pool-limit adjustment and recovery. Use those notes to prepare a postmortem draft, then have the responder verify the impact and follow-up actions.',
    timeline: [
      { time: '01:20', text: 'Connection-limit alert received.' },
      { time: '01:24', text: 'Pool configuration identified as the cause.' },
      { time: '01:31', text: 'Configuration adjusted. Service monitored.' },
      { time: '01:42', text: 'Service recovered. Incident resolved.' },
    ],
  },
];

export function Workspace() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const incident = INCIDENTS[activeIndex]!;

  return (
    <section id="workspace" className="mk-section" aria-labelledby="workspace-title">
      <div className="mk-container">
        <div className="mk-section-heading">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>The workspace</p>
            <h2 id="workspace-title" className="mk-title" data-mk-heading aria-label="The whole picture. One place to work.">The whole picture.<br /> One place to work.</h2>
            <p className="mk-description" data-mk-reveal>A shared queue, a clear timeline, and the context to take the next step.</p>
          </div>
          <Link href="/login" className="mk-text-link" data-mk-reveal>Open your workspace <LinkArrow /></Link>
        </div>

        <div className="mk-browser-window" data-mk-panel>
          <div className="mk-browser-chrome" aria-hidden="true">
            <div className="mk-window-controls">
              <span className="mk-window-dot mk-window-dot--close" />
              <span className="mk-window-dot mk-window-dot--minimize" />
              <span className="mk-window-dot mk-window-dot--expand" />
            </div>
            <div className="mk-browser-address">app.arch.dev / workspace / incidents</div>
            <div className="mk-browser-actions"><span /><span /><span /></div>
          </div>
          <div className="mk-console" role="region" aria-label="Interactive workspace preview with illustrative data">
            <div className="mk-console-bar">
              <span><strong>ARCH</strong><span className="mk-console-path"> / Workspace / Incidents</span></span>
              <span className="mk-console-demo">Sample workspace</span>
            </div>
            <div className="mk-console-body">
              <div className="mk-console-sidebar">
                <p className="mk-console-label">Incidents <span>{INCIDENTS.length}</span></p>
                <div className="mk-incident-list" aria-label="Sample incidents">
                  {INCIDENTS.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`mk-incident-option${index === activeIndex ? ' is-active' : ''}`}
                      aria-pressed={index === activeIndex}
                      aria-controls="preview-incident-detail"
                      onClick={() => setActiveIndex(index)}
                    >
                      <span className="mk-incident-option-meta"><span>{item.id}</span><span>{item.severity}</span></span>
                      <span className="mk-incident-option-title">{item.title}</span>
                      <span className="mk-incident-option-status"><span className={`mk-status-dot mk-status-dot--${item.status.toLowerCase()}`} aria-hidden="true" />{item.status}</span>
                    </button>
                  ))}
                </div>
                <p className="mk-console-hint">Choose an incident to explore.</p>
              </div>

              <div id="preview-incident-detail" className="mk-console-detail" aria-live="polite" aria-atomic="true">
                <div className="mk-incident-heading">
                  <span className="mk-console-id">{incident.id}</span>
                  <span className={`mk-state mk-state--${incident.status.toLowerCase()}`}>{incident.status}</span>
                </div>
                <h3>{incident.title}</h3>
                <dl className="mk-incident-metadata">
                  <div><dt>Service</dt><dd>{incident.service}</dd></div>
                  <div><dt>Severity</dt><dd>{incident.severity}</dd></div>
                  <div><dt>Assigned to</dt><dd>{incident.assignee}</dd></div>
                </dl>
                <div className="mk-console-content">
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
            <div className="mk-console-rating-row">
              <div className="mk-preview-rating" onMouseLeave={() => setHoveredRating(0)}>
                <span id="workspace-preview-rating-label" className="mk-preview-rating-label">Rate this preview</span>
                <div className="mk-rating-stars" role="radiogroup" aria-labelledby="workspace-preview-rating-label">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label
                      key={value}
                      className={`mk-rating-option${(hoveredRating || rating) >= value ? ' is-active' : ''}`}
                      onMouseEnter={() => setHoveredRating(value)}
                    >
                      <input
                        type="radio"
                        name="workspace-preview-rating"
                        value={value}
                        checked={rating === value}
                        aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                        onFocus={() => setHoveredRating(value)}
                        onBlur={() => setHoveredRating(0)}
                        onChange={() => {
                          setRating(value);
                          setHoveredRating(0);
                        }}
                      />
                      <span aria-hidden="true">{(hoveredRating || rating) >= value ? '★' : '☆'}</span>
                    </label>
                  ))}
                </div>
                {rating > 0 && <span className="mk-rating-status" role="status">Your rating · {rating} / 5</span>}
              </div>
            </div>
          </div>
        </div>
        <p className="mk-preview-caption">Interactive preview · illustrative data, not a live incident feed.</p>
      </div>
    </section>
  );
}
