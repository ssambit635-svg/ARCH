import { LinkArrow } from './link-arrow';
import { GITHUB_REPO_URL } from '@/lib/brand';

const PILLARS = [
  {
    title: 'Every alert lands once.',
    body: 'Signed webhook intake and alert fingerprinting fold repeats into a single incident, so two responders never work one outage twice.',
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
    ),
  },
  {
    title: 'Context arrives with it.',
    body: 'The service graph, recent deploys, the affected SLO and matching runbooks sit beside the incident instead of across five browser tabs.',
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12.5 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </svg>
    ),
  },
  {
    title: 'A responder approves each step.',
    body: 'Triage, summaries and postmortems are stored as drafts. Nothing changes an incident or reaches a customer until a permitted responder reviews it.',
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 4.5 6v6c0 4.2 3 7.4 7.5 9 4.5-1.6 7.5-4.8 7.5-9V6L12 3Z" />
        <path d="m8.8 12.2 2.2 2.3 4.2-4.6" />
      </svg>
    ),
  },
];

/** Three claims about what happens to an alert, set as scannable cards rather than prose columns. */
export function Pillars() {
  return (
    <section id="capabilities" className="mk-section" aria-labelledby="pillars-title">
      <div className="mk-container">
        <div className="mk-section-head">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>What changes</p>
            <h2 id="pillars-title" className="mk-title" data-mk-heading aria-label="One alert. One record. One owner.">
              One alert. One record.<br /> One owner.
            </h2>
            <p className="mk-description" data-mk-reveal>
              The response stays in one place from first signal to written review.
            </p>
          </div>
          <a
            href={`${GITHUB_REPO_URL}/blob/main/docs/product/FEATURES.md`}
            className="mk-text-link mk-section-aside"
            target="_blank"
            rel="noopener noreferrer"
            data-mk-reveal
          >
            Full feature list <LinkArrow />
          </a>
        </div>

        <div className="mk-pillars" data-mk-stagger="rows">
          {PILLARS.map((pillar, index) => (
            <article key={pillar.title} className="mk-pillar">
              <div className="mk-pillar-top">
                <span className="mk-pillar-icon" aria-hidden="true">{pillar.icon}</span>
                <span className="mk-pillar-index" aria-hidden="true">0{index + 1}</span>
              </div>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
