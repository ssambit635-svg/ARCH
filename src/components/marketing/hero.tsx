import { AmbientVideo } from './ambient-video';

/** The supplied wwm film owns the hero without copy or shade overlays. */
export function Hero() {
  return (
    <section id="top" className="mk-hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="mk-sr-only">ARCH incident operations</h1>
      <div className="mk-hero-media" aria-hidden="true">
        <AmbientVideo
          src="/wwm.mp4"
          poster="/wwm-poster.jpg"
          playOnce
          className="mk-hero-video absolute inset-0 h-full w-full object-contain"
        />
      </div>
    </section>
  );
}
