import { LinkArrow } from './link-arrow';
import Link from 'next/link';
import { AmbientVideo } from './ambient-video';

/** The original mountain reveal, without badges, glowing buttons or scroll pinning. */
export function Hero() {
  return (
    <section id="top" className="mk-hero" aria-labelledby="hero-title">
      <div className="mk-hero-media" aria-hidden="true">
        <AmbientVideo
          src="/arch-mountain-reveal.mp4"
          poster="/arch-mountain-poster.jpg"
          playOnce
          className="mk-hero-video absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="mk-hero-shade" aria-hidden="true" />

      <div className="mk-container mk-hero-copy">
        <h1 id="hero-title">When things break,<br />find your way forward.</h1>
        <p>Bring alerts, context, and your team together.<br className="mk-desktop-break" /> Stay focused on what comes next.</p>
        <div className="mk-actions">
          <Link href="/register" className="mk-button">Create a workspace <LinkArrow direction="right" /></Link>
          <a href="#workspace" className="mk-text-link">Take a closer look <LinkArrow /></a>
        </div>
      </div>

      <a href="#intelligence" className="mk-scroll-cue" aria-label="Explore ARCH">
        Explore <LinkArrow direction="down" />
      </a>
    </section>
  );
}
