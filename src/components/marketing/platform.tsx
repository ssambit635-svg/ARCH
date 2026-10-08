'use client';

import { useState } from 'react';
import { LinkArrow } from './link-arrow';

type DiagramMode = 'problem' | 'solution';

const DIAGRAMS = {
  problem: {
    eyebrow: 'Before ARCH',
    title: 'The response starts in the wrong place.',
    body: 'An alert lands in one tool, context lives in another, and the person on call has to become the integration layer.',
    nodes: [
      { label: 'Alert', detail: 'a signal arrives', tone: 'coral' },
      { label: 'Database', detail: 'context stays quiet', tone: 'ink' },
      { label: 'Admin', detail: 'decisions happen in chat', tone: 'yellow' },
      { label: 'Team', detail: 'pieces arrive late', tone: 'lilac' },
    ],
    trace: ['signal', 'context', 'decision', 'action'],
  },
  solution: {
    eyebrow: 'With ARCH',
    title: 'One calm handoff from signal to action.',
    body: 'ARCH connects the systems you already run, brings the useful context forward, and keeps a human in control of every decision.',
    nodes: [
      { label: 'Admin', detail: 'sets the guardrails', tone: 'yellow' },
      { label: 'Database', detail: 'keeps the source of truth', tone: 'mint' },
      { label: 'ARCH', detail: 'correlates and drafts', tone: 'blue' },
      { label: 'Team', detail: 'reviews and acts', tone: 'lilac' },
    ],
    trace: ['policy', 'context', 'assistance', 'response'],
  },
} as const;

function FlowIcon({ type }: { type: string }) {
  if (type === 'Database') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></svg>;
  }
  if (type === 'Admin') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5M4 4h3M17 4h3" /></svg>;
  }
  if (type === 'ARCH') {
    return <img src="/dragon-mark.webp" alt="" aria-hidden="true" />;
  }
  if (type === 'Team') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 20c.6-3.2 2.4-5 5.5-5s4.9 1.8 5.5 5M14 15.5c3.4-.1 5.4 1.4 6 4.5" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12M12 6l6 6-6 6" /><circle cx="5" cy="12" r="2" /></svg>;
}

function FlowConnector({ label, broken }: { label: string; broken?: boolean }) {
  return (
    <div className={`mk-flow-connector${broken ? ' is-broken' : ''}`} aria-hidden="true">
      <span className="mk-flow-connector-line" />
      <small>{label}</small>
    </div>
  );
}

export function Platform() {
  const [mode, setMode] = useState<DiagramMode>('solution');
  const diagram = DIAGRAMS[mode];

  return (
    <section id="capabilities" className="mk-section mk-architecture" aria-labelledby="architecture-title">
      <div className="mk-container">
        <div className="mk-architecture-heading">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>How ARCH fits together</p>
            <h2 id="architecture-title" className="mk-title" data-mk-heading>From scattered signals<br /> to a shared response.</h2>
            <p className="mk-description" data-mk-reveal>See the problem first, then switch to the handoff ARCH makes possible.</p>
          </div>
          <div className="mk-diagram-toggle" role="group" aria-label="Compare incident response flow">
            <button type="button" aria-pressed={mode === 'problem'} onClick={() => setMode('problem')}>
              The problem
            </button>
            <button type="button" aria-pressed={mode === 'solution'} onClick={() => setMode('solution')}>
              The ARCH way
            </button>
          </div>
        </div>

        <div className={`mk-architecture-board is-${mode}`} aria-live="polite">
          <div className="mk-architecture-copy">
            <p className="mk-eyebrow">{diagram.eyebrow}</p>
            <h3>{diagram.title}</h3>
            <p>{diagram.body}</p>
            <p className="mk-architecture-note">
              {mode === 'problem' ? 'Every handoff adds delay and another place to lose the thread.' : 'Your infrastructure stays yours. ARCH makes the next decision easier to see.'}
            </p>
            <a href="#workspace" className="mk-text-link">See it in the workspace <LinkArrow /></a>
          </div>

          <div className="mk-flow-map" aria-label={`${diagram.eyebrow}: ${diagram.trace.join(', ')}`}>
            <div className="mk-flow-topline">
              <span>Incident path</span>
              <span>{mode === 'problem' ? 'context gets lost' : 'context stays with the incident'}</span>
            </div>
            <div className="mk-flow-row">
              {diagram.nodes.map((node, index) => (
                <div className="mk-flow-step" key={node.label}>
                  <div className={`mk-flow-node is-${node.tone}`}>
                    <span className="mk-flow-icon"><FlowIcon type={node.label} /></span>
                    <strong>{node.label}</strong>
                    <small>{node.detail}</small>
                  </div>
                  {index < diagram.nodes.length - 1 && (
                    <FlowConnector label={diagram.trace[index]!} broken={mode === 'problem'} />
                  )}
                </div>
              ))}
            </div>
            <div className="mk-flow-footer">
              <span className="mk-flow-pulse" aria-hidden="true" />
              {mode === 'problem' ? 'The responder stitches this together manually.' : 'ARCH keeps the trail reviewable from alert to resolution.'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
