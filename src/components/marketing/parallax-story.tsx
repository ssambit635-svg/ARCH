/** Static-first interlude: scroll motion is owned and cleaned up by MarketingMotion. */
export function ParallaxStory() {
  return (
    <section className="mk-story" data-mk-story aria-labelledby="story-title">
      <div className="mk-story-stage">
        <div className="mk-story-orbit mk-story-orbit-back" data-mk-depth="back" aria-hidden="true" />
        <div className="mk-story-orbit mk-story-orbit-front" data-mk-depth="front" aria-hidden="true" />
        <div className="mk-container mk-story-copy" data-mk-depth="copy">
          <p className="mk-eyebrow">From first alert to all clear</p>
          <h2 id="story-title">Through the noise.<br /><span>Into clarity.</span></h2>
          <p className="mk-story-description">One workspace. Shared context. A clearer path from incident to resolution.</p>
          <a className="mk-text-link" href="#intelligence">Explore the workflow <span aria-hidden="true">↘</span></a>
        </div>
        <span className="mk-story-coordinate" aria-hidden="true">01 / SIGNAL → RESOLUTION</span>
      </div>
    </section>
  );
}
