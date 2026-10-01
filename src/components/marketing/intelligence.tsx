const FEATURES = [
  {
    title: 'Less noise. One clear signal.',
    body: 'Signed webhook intake and incident fingerprinting bring repeated alerts into a single response. Your team works from the same context.',
  },
  {
    title: 'Context, without the hunt.',
    body: 'Keep the timeline, affected services, related changes, and useful runbooks close to the work. Spend less time piecing things together.',
  },
  {
    title: 'Assistance. Not autopilot.',
    body: 'Native tools help with triage and drafts. A responder reviews every suggestion before it changes an incident or reaches a customer.',
  },
];

export function Intelligence() {
  return (
    <section id="intelligence" className="mk-section mk-intro" aria-labelledby="intelligence-title">
      <div id="library-map" className="mk-anchor" />
      <div className="mk-container">
        <h2 id="intelligence-title" className="mk-eyebrow">A clearer way to work</h2>
        <div className="mk-feature-grid">
          {FEATURES.map((feature, index) => (
            <article key={feature.title}>
              <span className="mk-feature-number" aria-hidden="true">0{index + 1}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
