import { LinkArrow } from './link-arrow';
import Link from 'next/link';
import { GITHUB_REPO_URL } from '@/lib/brand';

/** The close shows where an incident ends up: the status page customers actually read. */
export function Closing() {
  return (
    <section className="mk-section mk-closing" aria-labelledby="closing-title">
      <div className="mk-container mk-closing-grid">
        <div>
          <p className="mk-eyebrow" data-mk-reveal>Take it from here</p>
          <h2 id="closing-title" className="mk-title" data-mk-heading aria-label="So good, you will break things on purpose.">So good, you’ll break<br /> things on purpose.</h2>
          <p className="mk-description" data-mk-reveal>Ready to put AI to work on your incidents? Start with ARCH and keep every decision in view.</p>
          <div className="mk-actions" data-mk-reveal>
            <Link href="/register" className="mk-button">Get started <LinkArrow direction="right" /></Link>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="mk-text-link">Explore on GitHub <LinkArrow /></a>
          </div>
        </div>
        <figure className="mk-closing-figure" data-mk-reveal>
          <img
            src="/product/status-page.webp"
            alt="A published ARCH status page for Acme Inc: a “Major outage in progress” banner with the last update time, a 90-day uptime bar at 90.0%, and per-service status for the API gateway (Degraded), Checkout (Outage) and Web app (Operational)."
            width={764}
            height={620}
            loading="lazy"
            decoding="async"
            className="mk-closing-shot"
          />
          <figcaption className="mk-closing-caption">
            Your customers read the same incident: a published status page, updated from the
            responder’s timeline. Sample data.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
