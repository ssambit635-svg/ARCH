import Link from 'next/link';
import { LinkArrow } from './link-arrow';
import { PRODUCT_VERSION } from '@/lib/brand';

/**
 * The hero answers "what is this?" before it says anything clever: incident response for
 * engineering teams, self-hosted, with human-reviewed assistance. The poetry lives in the
 * subline where it cannot stand in for the product description, and the proof is a real
 * capture of the incident workspace rather than an illustration.
 */
export function Hero() {
  return (
    <section id="top" className="mk-hero" aria-labelledby="hero-title">
      <div className="mk-container mk-hero-inner">
        <div className="mk-hero-copy">
          <p className="mk-eyebrow" data-mk-reveal>Early access · v{PRODUCT_VERSION}</p>
          <h1 id="hero-title" className="mk-hero-title" data-mk-heading>
            <span className="mk-hero-nowrap">Incident response</span> for engineering teams.
            <span className="mk-hero-claim">Self-hosted.<br />Human-reviewed AI.</span>
          </h1>
          <p className="mk-hero-poetry" data-mk-reveal>Through the noise. <span>Into clarity.</span></p>
          <p className="mk-hero-lede" data-mk-reveal>Alerts, context and decisions in one workspace your team runs itself.</p>
          <div className="mk-actions" data-mk-reveal>
            <Link href="/register" className="mk-button">Get started <LinkArrow direction="right" /></Link>
            <Link href="#workspace" className="mk-text-link">See the workspace <LinkArrow /></Link>
          </div>
        </div>

        <figure className="mk-hero-figure" data-mk-reveal>
          <img
            src="/product/incident-workspace.webp"
            alt="An open ARCH incident, “Checkout latency spike in eu-west-1”: its CRITICAL severity and Monitoring state, the blast radius across the API gateway, Checkout and Web app services, the deployments that preceded it, and the response timeline."
            width={1440}
            height={900}
            className="mk-hero-shot"
            fetchPriority="high"
            decoding="async"
          />
          <figcaption className="mk-hero-caption">
            A real screen from a local ARCH workspace: one incident, its blast radius, and the
            decision trail. Sample data.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
