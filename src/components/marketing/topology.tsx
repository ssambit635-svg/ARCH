'use client';

import { LinkArrow } from './link-arrow';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';

const RobotScene = dynamic(() => import('./robot-scene').then((module) => module.RobotScene), {
  ssr: false,
  loading: () => <div className="robot-stage mk-robot-placeholder" role="status">Preparing the robot…</div>,
});

/** Keep the original mascot and section anchor; load WebGL only near the viewport. */
export function Topology() {
  const sectionRef = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [cursorPoint, setCursorPoint] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px' });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="topology" className="mk-section" aria-labelledby="native-model-title">
      <div className="mk-container mk-model-grid">
        <div
          className="mk-model-visual"
          data-mk-reveal
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setCursorPoint({ x: event.clientX - rect.left, y: event.clientY - rect.top, active: true });
          }}
          onPointerLeave={() => setCursorPoint((point) => ({ ...point, active: false }))}
        >
          <div className="mk-robot-viewport">
            <span
              className={`mk-robot-signal${cursorPoint.active ? ' is-active' : ''}`}
              style={{ transform: `translate3d(${cursorPoint.x}px, ${cursorPoint.y}px, 0)` }}
              aria-hidden="true"
            />
            {nearViewport ? <RobotScene /> : <div className="robot-stage" aria-hidden="true" />}
          </div>
          <p className="mk-model-caption">A little personality. Not a measure of intelligence.</p>
        </div>

        <div id="model-facts" className="mk-model-copy mk-anchor">
          <p className="mk-eyebrow" data-mk-reveal>The native engine</p>
          <h2 id="native-model-title" className="mk-title" data-mk-heading aria-label="Small model. Useful by design.">Small model.<br /> Useful by design.</h2>
          <p className="mk-description" data-mk-reveal>Practical help with incidents. A human still in charge.</p>
          <p className="mk-model-intro" data-mk-reveal>ARCH uses small classifiers, similarity search, rules, and templates. It runs on your server’s CPU—without an external LLM API or AI API key.</p>
          <div className="mk-model-facts" data-mk-stagger aria-label="Native engine facts">
            <span>CPU-only</span><span>Organization-scoped</span><span>Human-reviewed</span>
          </div>

          <div className="mk-disclosures" data-mk-reveal>
            <details open>
              <summary>What it helps with</summary>
              <p>Suggesting category and severity, finding similar incidents and runbooks, and drafting summaries and postmortems from supplied context. Code Assist adds heuristic checks and small template-based snippets.</p>
            </details>
            <details>
              <summary>How it learns</summary>
              <p>Training uses your organization’s resolved incidents and explicit corrections, alongside built-in examples and optional public corpora. Runbooks enrich retrieval. Chat ratings do not automatically fine-tune the model.</p>
            </details>
            <details>
              <summary>Where it stops</summary>
              <p>This is not a general-purpose language model or an autonomous coding agent. Suggestions can be repetitive, incomplete, or wrong. It cannot guarantee a root cause or replace your on-call engineer. Verify every suggestion.</p>
            </details>
          </div>
          <p className="mk-footnote">Native inference does not call an AI vendor. Optional document fetching and configured integrations can still use the network.</p>
          <div className="mk-actions" data-mk-reveal>
            <Link href="/dashboard/model" className="mk-text-link">Inspect your model <LinkArrow /></Link>
            <a href={`${GITHUB_REPO_URL}/blob/main/docs/engineering/ARCH-MODEL.md`} target="_blank" rel="noopener noreferrer" className="mk-muted-link">Technical notes <LinkArrow /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
