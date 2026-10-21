import { AI_NAME, GITHUB_REPO_URL } from '@/lib/brand';
import { LinkArrow } from './link-arrow';

const SIGNALS = [
  {
    label: 'Classification',
    value: 'category + severity',
    strength: 86,
    note: 'Small classifiers rank an alert against your organization’s own history.',
  },
  {
    label: 'Retrieval',
    value: 'similar incidents',
    strength: 74,
    note: 'Matching incidents and runbooks from the knowledge sources you connected.',
  },
  {
    label: 'Drafting',
    value: 'templates',
    strength: 62,
    note: 'Summaries, status updates and postmortems — always stored as drafts.',
  },
  {
    label: 'Code Assist',
    value: 'heuristics',
    strength: 44,
    note: 'Static checks and small snippets. Not an autonomous coding agent.',
  },
];

const DISCLOSURES = [
  {
    title: 'What it helps with',
    body: 'Suggesting category and severity, finding similar incidents and runbooks, and drafting summaries and postmortems from supplied context. Code Assist adds heuristic checks and small template-based snippets.',
  },
  {
    title: 'How it learns',
    body: 'Training uses your organization’s resolved incidents and explicit corrections, alongside built-in examples and optional public corpora. Runbooks enrich retrieval. Chat ratings do not automatically fine-tune the model.',
  },
  {
    title: 'Where it stops',
    body: 'This is not a general-purpose language model or an autonomous coding agent. Suggestions can be repetitive, incomplete or wrong. It cannot guarantee a root cause or replace your on-call engineer. Verify every suggestion.',
  },
];

/**
 * The engine section is deliberately dark: it is the one part of the page that runs on the
 * visitor's own hardware. The card shows the four signals the native engine actually computes,
 * with copy that keeps every limitation in view.
 */
export function Engine() {
  return (
    <section id="engine" className="mk-section mk-band--dark mk-on-dark mk-engine mk-atmos mk-atmos--night" aria-labelledby="engine-title">
      <div className="mk-container mk-engine-grid">
        <div className="mk-engine-copy">
          <p className="mk-eyebrow" data-mk-reveal>The native engine</p>
          <h2 id="engine-title" className="mk-title" data-mk-heading aria-label="Small model. Useful by design.">
            Small model.<br /> Useful by design.
          </h2>
          <p className="mk-description" data-mk-reveal>
            Practical help with incidents. A human still in charge.
          </p>
          <p className="mk-description" data-mk-reveal>
            ARCH uses small classifiers, similarity search, rules and templates. It runs on your
            server’s CPU — no external LLM API and no AI API key.
          </p>
          <ul className="mk-engine-facts" data-mk-reveal>
            <li>CPU-only</li>
            <li>Organization-scoped</li>
            <li>Human-reviewed</li>
          </ul>

          <div className="mk-disclosures" data-mk-reveal>
            {DISCLOSURES.map((item, index) => (
              <details key={item.title} className="mk-disclosure" open={index === 0}>
                <summary>{item.title}</summary>
                <p>{item.body}</p>
              </details>
            ))}
          </div>

          <p className="mk-footnote" data-mk-reveal>
            Native inference does not call an AI vendor. Optional document fetching and configured
            integrations can still use the network.
          </p>
        </div>

        <div className="mk-engine-card" data-mk-panel aria-label="Signals the native engine computes">
          <div className="mk-engine-card-bar">
            <span>{AI_NAME} · engine</span>
            <span className="mk-engine-flag">on-device</span>
          </div>
          <div className="mk-engine-rows">
            {SIGNALS.map((signal) => (
              <div key={signal.label} className="mk-engine-row">
                <div className="mk-engine-row-head">
                  <span className="mk-engine-row-label">{signal.label}</span>
                  <span className="mk-engine-row-value">{signal.value}</span>
                </div>
                <span className="mk-engine-meter" aria-hidden="true">
                  <span className="mk-engine-meter-fill" style={{ width: `${signal.strength}%` }} />
                </span>
                <p className="mk-engine-row-note">{signal.note}</p>
              </div>
            ))}
          </div>
          <div className="mk-engine-foot">
            <p>Inference stays on your host. Nothing leaves it.</p>
            <a
              href={`${GITHUB_REPO_URL}/blob/main/docs/engineering/ARCH-MODEL.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Technical notes <LinkArrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
