import Link from 'next/link';
import { DotGrid } from './dot-grid';
import { LinkArrow } from './link-arrow';
import { PRODUCT_VERSION } from '@/lib/brand';

/**
 * The hero follows the Aceternity "Hero With Background And Navbar" block (see DESIGN (6).md):
 * a full-viewport painted dawn that fades into the page paper at every edge, four hairline
 * scale lines framing the stage, the navigation floating over the sky, and the copy anchored
 * to the bottom-left in a 96px Inter headline with an ink action and a plain text link.
 *
 * The headline is the brand line — downtime's ARCH-nemesis, with ARCH picked out in ember —
 * and the lede directly under it carries the literal description, so a first-time visitor
 * still learns what ARCH is within the first screen. The real product capture sits in a
 * full-width window directly under the stage, so the first viewport stays pure atmosphere
 * while the proof is still one scroll away.
 */
export function Hero() {
  return (
    <section id="top" className="mk-hero" aria-labelledby="hero-title">
      <div className="mk-hero-stage">
        <img
          src="/marketing/hero-dawn.jpg"
          alt=""
          aria-hidden="true"
          className="mk-hero-bg"
          fetchPriority="high"
          decoding="async"
        />
        <div className="mk-hero-shade" aria-hidden="true" />
        <div className="mk-hero-scales" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="mk-container mk-hero-inner">
          <div className="mk-hero-copy">
            <p className="mk-eyebrow mk-hero-badge" data-mk-reveal>Early access · v{PRODUCT_VERSION}</p>
            <h1 id="hero-title" className="mk-hero-title">
              Meet downtime’s<br />
              <span className="mk-hero-arch">ARCH</span>-nemesis.
              <span className="mk-hero-claim">Self-hosted. Human-reviewed AI.</span>
            </h1>
            <p className="mk-hero-poetry" data-mk-reveal>Through the noise. <span>Into clarity.</span></p>
            <p className="mk-hero-lede" data-mk-reveal>
              Incident response for engineering teams — alerts, context and decisions in one workspace your team runs itself.
            </p>
            <div className="mk-actions" data-mk-reveal>
              <Link href="/register" className="mk-button mk-button--ink">
                <DotGrid />
                Get started
              </Link>
              <Link href="#product" className="mk-text-link mk-hero-doclink">
                See the workspace <LinkArrow direction="right" />
              </Link>
            </div>
            <ul className="mk-hero-points" data-mk-reveal>
              <li className="mk-hero-point">Runs on your server</li>
              <li className="mk-hero-point">No external AI calls</li>
              <li className="mk-hero-point">Every write audited</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mk-container mk-hero-shotwrap">
        <figure className="mk-hero-figure" data-mk-reveal>
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
