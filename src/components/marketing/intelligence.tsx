const FEATURES = [
  {
    title: 'Repeats fold into one incident.',
    body: 'Signed webhook intake and alert fingerprinting group the same failure into a single response, so two responders are not working one outage twice.',
  },
  {
    title: 'Context arrives with the alert.',
    body: 'The service graph, recent deployments, an SLO, and matching runbooks sit beside the incident instead of across five browser tabs.',
  },
  {
    title: 'A responder approves each draft.',
    body: 'Native triage and drafts are stored as drafts. Nothing changes an incident or reaches a customer until a permitted responder reviews it.',
  },
];

export function Intelligence() {
  return (
    <section id="intelligence" className="mk-section mk-intro" aria-labelledby="intelligence-title">
      <div id="library-map" className="mk-anchor" />
      <div className="mk-container">
        <h2 id="intelligence-title" className="mk-eyebrow" data-mk-reveal>What ARCH does with an alert</h2>
        <div className="mk-feature-grid" data-mk-stagger="rows">
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
