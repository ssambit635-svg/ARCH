'use client';

import { useState } from 'react';

interface Stage {
  name: string;
  title: string;
  body: string;
  trace: Array<{ time: string; label: string }>;
  card: {
    status: string;
    events: Array<{ time: string; strong: string; text: string; muted?: boolean }>;
    footLeft: string;
    footRight: string;
  };
}

const STAGES: Stage[] = [
  {
    name: 'Investigating',
    title: 'Start with what you know.',
    body: 'Bring the alert into a shared incident, assign a responder, and record the first observations. Everyone starts from the same timeline.',
    trace: [
      { time: '00:00', label: 'Signed webhook received' },
      { time: '00:01', label: 'Incident opened and fingerprinted' },
      { time: '00:02', label: 'Responder assigned' },
    ],
    card: {
      status: 'Investigating',
      events: [
        { time: '03:12', strong: 'Alert received.', text: 'POST /api/webhooks/alertmanager · signature verified.' },
        { time: '03:13', strong: 'Alex Mercer joined', text: 'as responder. Timeline opened from the alert payload.' },
        { time: '03:14', strong: 'Blast radius attached.', text: '3 services in the dependency chain.', muted: true },
      ],
      footLeft: 'Source · webhook',
      footRight: '2 open items',
    },
  },
  {
    name: 'Identified',
    title: 'Turn evidence into a next step.',
    body: 'Link the affected service, the relevant changes and runbooks. Native suggestions arrive as context; the responder confirms the cause and chooses the action.',
    trace: [
      { time: '00:06', label: 'Recent deployments linked' },
      { time: '00:08', label: 'Root-cause candidate recorded' },
      { time: '00:09', label: 'Action drafted for review' },
    ],
    card: {
      status: 'Identified',
      events: [
        { time: '03:15', strong: 'Deploy v2.3 linked.', text: 'Pool defaults changed 9 minutes before the first alert.' },
        { time: '03:17', strong: 'Candidate cause.', text: 'Lock introduced by migration 0412 — labelled a hypothesis.' },
        { time: '03:18', strong: 'Draft fix ready.', text: 'Rollback command attached. Waiting on a responder.', muted: true },
      ],
      footLeft: 'Evidence · 4 records',
      footRight: '1 draft',
    },
  },
  {
    name: 'Monitoring',
    title: 'Watch the recovery, together.',
    body: 'Record the mitigation and keep the team informed while you watch the service. A clear timeline preserves what changed and who made the call.',
    trace: [
      { time: '00:22', label: 'Mitigation approved and applied' },
      { time: '00:24', label: 'Status page updated' },
      { time: '00:31', label: 'Error rate returning to baseline' },
    ],
    card: {
      status: 'Monitoring',
      events: [
        { time: '03:20', strong: 'Mitigation approved.', text: 'Rollback of migration 0412 by Alex Mercer.' },
        { time: '03:24', strong: 'Customer update published.', text: 'Status page moved to MONITORING.' },
        { time: '03:31', strong: 'p95 latency recovering.', text: '1.8 s → 420 ms over 7 minutes.', muted: true },
      ],
      footLeft: 'Status page · published',
      footRight: '0 external AI calls',
    },
  },
  {
    name: 'Resolved',
    title: 'Close the loop. Keep the learning.',
    body: 'Resolve the incident with its history intact. Draft the review from the timeline and carry the useful lessons into the next response.',
    trace: [
      { time: '00:58', label: 'Recovery confirmed' },
      { time: '01:02', label: 'Incident resolved' },
      { time: '01:05', label: 'Postmortem draft prepared' },
    ],
    card: {
      status: 'Resolved',
      events: [
        { time: '03:58', strong: 'Recovery confirmed.', text: 'Error rate at baseline for 30 minutes.' },
        { time: '04:02', strong: 'Incident resolved.', text: 'Duration 50 minutes. Full timeline retained.' },
        { time: '04:05', strong: 'Review draft prepared.', text: 'Blameless, sourced from the timeline.', muted: true },
      ],
      footLeft: 'Audit · hash-chained',
      footRight: 'Postmortem ready',
    },
  },
];

/** Four explicit states, presented as tabs so the page shows the workflow rather than describing it. */
export function Workflow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const stage = STAGES[activeIndex]!;

  return (
    <section id="workflow" className="mk-section mk-dawn--workflow" aria-labelledby="workflow-title">
      <div className="mk-container">
        <div className="mk-section-head">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>The workflow</p>
            <h2 id="workflow-title" className="mk-title" data-mk-heading aria-label="From the first alert to the next lesson.">
              From the first alert<br /> to the next lesson.
            </h2>
            <p className="mk-description" data-mk-reveal>
              Four explicit states. One continuous record. No invented fifth step.
            </p>
          </div>
        </div>

        <div className="mk-tabs" role="tablist" aria-label="Incident lifecycle" data-mk-reveal>
          {STAGES.map((item, index) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              id={`workflow-tab-${index}`}
              aria-selected={index === activeIndex}
              aria-controls="workflow-panel"
              className="mk-tab"
              onClick={() => setActiveIndex(index)}
            >
              <span className="mk-tab-index" aria-hidden="true">0{index + 1}</span>
              {item.name}
            </button>
          ))}
        </div>

        <div
          id="workflow-panel"
          role="tabpanel"
          aria-labelledby={`workflow-tab-${activeIndex}`}
          className="mk-flow-panel"
          data-mk-reveal
        >
          <div className="mk-flow-copy">
            <p className="mk-eyebrow">0{activeIndex + 1} / 04 · {stage.name}</p>
            <h3 className="mk-flow-title">{stage.title}</h3>
            <p className="mk-flow-body">{stage.body}</p>
            <ul className="mk-flow-trace">
              {stage.trace.map((item) => (
                <li key={item.label} className="mk-trace-item">
                  <span className="mk-trace-time">{item.time}</span>
                  <span className="mk-trace-text">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mk-flow-card">
            <div className="mk-flow-card-bar">
              <strong>INC-204</strong>
              <span>{stage.card.status}</span>
            </div>
            <div className="mk-flow-card-body">
              {stage.card.events.map((event) => (
                <div key={event.time} className={`mk-flow-event${event.muted ? ' mk-flow-event--muted' : ''}`}>
                  <span className="mk-flow-event-dot" aria-hidden="true" />
                  <div>
                    <time>{event.time}</time>
                    <p><strong>{event.strong}</strong> {event.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mk-flow-card-foot">
              <span>{stage.card.footLeft}</span>
              <span>{stage.card.footRight}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
