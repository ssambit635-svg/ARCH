import { AmbientVideo } from './ambient-video';

/** The supplied alpine illustration is allowed to own the hero without copy or shade overlays. */
export function Hero() {
  return (
    <section id="top" className="mk-hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="mk-sr-only">ARCH incident operations</h1>
      <div className="mk-hero-media" aria-hidden="true">
        <AmbientVideo
          src="/arch-alpine-reveal.mp4"
          poster="/arch-alpine-poster.jpg"
          playOnce
          className="mk-hero-video absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>
  );
}
