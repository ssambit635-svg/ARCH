const PRINCIPLES = [
  {
    title: 'Your infrastructure.',
    body: 'Run ARCH on your own server with PostgreSQL. Native inference stays on your CPU; no external AI subscription is required.',
  },
  {
    title: 'Your workspace.',
    body: 'Organization-scoped data and server-enforced roles keep the right information with the right people. Writes leave an audit trail.',
  },
  {
    title: 'Your decisions.',
    body: 'Explicit state transitions, reviewable drafts, and human-approved fixes. ARCH supports the responder; it doesn’t replace them.',
  },
];

export function Platform() {
  return (
    <section id="capabilities" className="mk-section mk-section--soft" aria-labelledby="principles-title">
      <div className="mk-container">
        <div className="mk-section-heading">
          <div>
            <p className="mk-eyebrow">By design</p>
            <h2 id="principles-title" className="mk-title">Built to stay in your control.</h2>
          </div>
        </div>
        <div className="mk-feature-grid">
          {PRINCIPLES.map((principle) => (
            <article key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
