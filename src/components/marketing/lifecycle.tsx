'use client';

import { LinkArrow } from './link-arrow';
import { useState } from 'react';

const STAGES = [
  {
    name: 'Investigating',
    title: 'Start with what you know.',
    body: 'Bring the alert into a shared incident, assign a responder, and record the first observations. Everyone starts from the same timeline.',
    detail: 'Alert received / incident opened / responder assigned',
  },
  {
    name: 'Identified',
    title: 'Turn evidence into a next step.',
    body: 'Link the affected service, relevant changes, and runbooks. Use native suggestions as context, then let the responder confirm the cause and choose an action.',
    detail: 'Context gathered / cause identified / action reviewed',
  },
  {
    name: 'Monitoring',
    title: 'Watch the recovery, together.',
    body: 'Record the mitigation and keep the team informed while you monitor the service. A clear timeline preserves what changed and who made the call.',
    detail: 'Mitigation recorded / recovery monitored / team updated',
  },
  {
    name: 'Resolved',
    title: 'Close the loop. Keep the learning.',
    body: 'Resolve the incident with its history intact. Prepare a review from the timeline and bring useful lessons into the next response.',
    detail: 'Recovery confirmed / incident resolved / review drafted',
  },
];

export function Lifecycle() {
  const [activeIndex, setActiveIndex] = useState(0);
  const stage = STAGES[activeIndex]!;

  return (
    <section id="lifecycle" className="mk-section mk-section--soft" aria-labelledby="lifecycle-title">
      <div className="mk-container">
        <div className="mk-section-heading">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>The workflow</p>
            <h2 id="lifecycle-title" className="mk-title" data-mk-heading aria-label="From the first alert. To the next lesson.">From the first alert.<br /> To the next lesson.</h2>
            <p className="mk-description" data-mk-reveal>Four explicit states. One continuous record.</p>
          </div>
        </div>
        <div className="mk-lifecycle-grid">
          <div className="mk-stage-list" data-mk-reveal aria-label="Explore the incident lifecycle">
            <span className="mk-stage-track" aria-hidden="true"><span className="mk-stage-track-fill" data-mk-progress /></span>
            {STAGES.map((item, index) => (
              <button
                key={item.name}
                type="button"
                className={`mk-stage-button${index === activeIndex ? ' is-active' : ''}`}
                aria-pressed={index === activeIndex}
                aria-controls="lifecycle-detail"
                onClick={() => setActiveIndex(index)}
              >
                <span className="mk-stage-number">0{index + 1}</span><span>{item.name}</span><LinkArrow />
              </button>
            ))}
          </div>
          <div id="lifecycle-detail" className="mk-stage-detail" data-mk-reveal aria-live="polite" aria-atomic="true">
            <p className="mk-eyebrow">0{activeIndex + 1} / 04</p>
            <h3>{stage.title}</h3>
            <p>{stage.body}</p>
            <p className="mk-stage-trace">{stage.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
