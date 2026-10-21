const FACTS = [
  { value: '4 states', label: 'Explicit incident lifecycle' },
  { value: '0', label: 'External AI API calls' },
  { value: 'CPU-only', label: 'Native inference, on your host' },
  { value: 'PostgreSQL', label: 'One database you already own' },
];

/**
 * Four checkable facts, not adjectives. This strip sits directly under the hero so a visitor
 * scanning the page meets the product's constraints before its promises.
 */
export function ProofStrip() {
  return (
    <section className="mk-section mk-band--white mk-proof mk-atmos mk-atmos--mist" aria-label="ARCH at a glance">
      <div className="mk-container">
        <ul className="mk-proof-grid" data-mk-stagger="rows">
          {FACTS.map((fact) => (
            <li key={fact.label} className="mk-proof-item">
              <span className="mk-proof-value">{fact.value}</span>
              <span className="mk-proof-label">{fact.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
