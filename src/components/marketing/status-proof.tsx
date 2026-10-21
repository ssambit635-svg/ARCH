import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';
import { LinkArrow } from './link-arrow';

const CHECKS = [
  {
    title: 'One page a customer can read.',
    body: 'Current status, the latest update and a 90-day uptime bar, written from the responder’s timeline.',
  },
  {
    title: 'No account, no JavaScript.',
    body: 'A public URL renders on the server. If a customer is anxious, the page still loads.',
  },
  {
    title: 'Updated before they ask.',
    body: 'Publishing is a deliberate responder action, and every update keeps its timestamp and zone.',
  },
];

/**
 * The response ends in public: the status page a customer actually reads. Showing it next to the
 * checks that produced it closes the story the hero opened.
 */
export function StatusProof() {
  return (
    <section className="mk-section mk-band--white mk-dawn--status" aria-labelledby="status-title">
      <div className="mk-container mk-status-grid">
        <div className="mk-status-copy">
          <p className="mk-eyebrow" data-mk-reveal>Where it ends</p>
          <h2 id="status-title" className="mk-title" data-mk-heading aria-label="A calm page for a bad day.">
            A calm page<br /> for a bad day.
          </h2>
          <p className="mk-description" data-mk-reveal>
            The same incident, written for the people waiting on it.
          </p>
          <ul className="mk-check-list" data-mk-reveal>
            {CHECKS.map((check) => (
              <li key={check.title} className="mk-check-item">
                <div>
                  <strong>{check.title}</strong>
                  <span>{check.body}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mk-actions" data-mk-reveal>
            <Link href="/register" className="mk-button">Publish your first page</Link>
            <a
              href={`${GITHUB_REPO_URL}/blob/main/docs/product/FEATURES.md`}
              className="mk-text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              How status pages work <LinkArrow />
            </a>
          </div>
        </div>

        <figure className="mk-status-figure" data-mk-reveal>
          <div className="mk-status-frame">
            <img
              src="/product/status-page.webp"
              alt="A published ARCH status page for Acme Inc: a “Major outage in progress” banner with the last update time, a 90-day uptime bar at 90.0%, and per-service status for the API gateway (Degraded), Checkout (Outage) and Web app (Operational)."
              width={764}
              height={620}
              loading="lazy"
              decoding="async"
              className="mk-status-shot"
            />
          </div>
          <figcaption className="mk-status-caption">
            Your customers read the same incident: a published status page, updated from the
            responder’s timeline. Sample data.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
