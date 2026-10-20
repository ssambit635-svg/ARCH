import Link from 'next/link';
import { LinkArrow } from './link-arrow';
import { PRODUCT_VERSION } from '@/lib/brand';

/**
 * The hero states what ARCH is before anything else: incident response for engineering teams,
 * self-hosted, with human-reviewed assistance. The proof beside it is a real capture of the
 * incident workspace, framed like a product window rather than an illustration.
 */
export function Hero() {
  return (
    <section id="top" className="mk-hero" aria-labelledby="hero-title">
      <div className="mk-container mk-hero-inner">
        <div className="mk-hero-copy">
          <p className="mk-eyebrow" data-mk-reveal>Early access · v{PRODUCT_VERSION}</p>
          <h1 id="hero-title" className="mk-hero-title">
            <span className="mk-hero-nowrap">Incident response</span> for engineering teams.
            <span className="mk-hero-claim">Self-hosted.<br />Human-reviewed AI.</span>
          </h1>
          <p className="mk-hero-poetry" data-mk-reveal>Through the noise. <span>Into clarity.</span></p>
          <p className="mk-hero-lede" data-mk-reveal>
            Alerts, context and decisions in one workspace your team runs itself.
          </p>
          <ul className="mk-hero-points" data-mk-reveal>
            <li className="mk-hero-point">Runs on your server</li>
            <li className="mk-hero-point">No external AI calls</li>
            <li className="mk-hero-point">Every write audited</li>
          </ul>
          <div className="mk-actions" data-mk-reveal>
            <Link href="/register" className="mk-button mk-button--large">Get started <LinkArrow direction="right" /></Link>
            <Link href="#product" className="mk-button mk-button--large mk-button--ghost">
              See the workspace
            </Link>
          </div>
        </div>

        <figure className="mk-hero-figure">
          <div className="mk-hero-frame">
            <div className="mk-window-bar" aria-hidden="true">
              <span className="mk-window-dots"><span className="mk-window-dot" /><span className="mk-window-dot" /><span className="mk-window-dot" /></span>
              <span className="mk-window-url">app.arch.dev / incidents / inc-204</span>
              <span className="mk-window-tools"><span /><span /><span /></span>
            </div>
            <div className="mk-shot-frame">
              <img
                src="/product/incident-workspace.webp"
                alt="An open ARCH incident, “Checkout latency spike in eu-west-1”: its CRITICAL severity and Monitoring state, the blast radius across the API gateway, Checkout and Web app services, the deployments that preceded it, and the response timeline."
                width={1440}
                height={900}
                className="mk-shot"
                fetchPriority="high"
                decoding="async"
              />
            </div>
            <span className="mk-hero-chip" aria-hidden="true">
              <span className="mk-hero-chip-dot" />
              CRITICAL · Monitoring
            </span>
            <span className="mk-hero-chip mk-hero-chip--trail" aria-hidden="true">
              <span className="mk-hero-chip-dot" />
              Timeline · decision trail
            </span>
          </div>
          <figcaption className="mk-hero-caption">
            A real screen from a local ARCH workspace. Sample data.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
