import { ControlLattice } from './control-lattice';

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
    body: 'Explicit state transitions, reviewable drafts and human-approved fixes. ARCH supports the responder; it doesn’t replace them.',
  },
];

/**
 * One incident, three surfaces. The terminal is the infrastructure you own, the channel window is
 * the workspace your team shares, and the phone is the decision a responder makes. The scene is
 * decorative HTML/CSS — no screenshots to go stale — and the three principles underneath carry the
 * accessible copy.
 */
export function Control() {
  return (
    <section id="control" className="mk-section mk-control" aria-labelledby="principles-title">
      <div className="mk-container">
        <div className="mk-section-head">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>By design</p>
            <h2 id="principles-title" className="mk-title" data-mk-heading aria-label="Built to stay in your control.">
              Built to stay<br /> in your control.
            </h2>
            <p className="mk-description" data-mk-reveal>
              One incident, three surfaces — all of it running on hardware you own.
            </p>
          </div>
        </div>

        <div className="mk-stage" data-mk-panel aria-hidden="true">
          <div className="mk-stage-menubar">
            <span className="mk-stage-brand">
              <img src="/dragon-mark.webp" alt="" aria-hidden="true" width={16} height={16} />
              ARCH
            </span>
            <span className="mk-stage-pill"><i /> INC-204 · live 03:18</span>
            <span className="mk-stage-time">Thu 8 Oct · 3:18 AM</span>
          </div>

          <div className="mk-stage-board">
            <ControlLattice variant="field" />
            <span className="mk-stage-ring mk-stage-ring--1" />
            <span className="mk-stage-ring mk-stage-ring--2" />
            <span className="mk-stage-ring mk-stage-ring--3" />
            <span className="mk-stage-node mk-stage-node--a">checkout-api</span>
            <span className="mk-stage-node mk-stage-node--b">postgres-primary</span>
            <span className="mk-stage-node mk-stage-node--c">webhook-worker</span>
          </div>

          {/* Phone — the decision */}
          <div className="mk-pane mk-pane--phone">
            <span className="mk-pane-tag">Your decisions</span>
            <div className="mk-phone-status"><span>3:18</span><span>▮▮▮ ⌁</span></div>
            <p className="mk-phone-id">‹ INC-204</p>
            <p className="mk-phone-title">Checkout API latency is elevated</p>
            <div className="mk-phone-tabs">
              <span className="is-active">Review</span><span>Details</span><span>Updates</span>
            </div>
            <p className="mk-phone-label">Suggested fix · draft</p>
            <p className="mk-phone-body">
              Roll back migration 0412 and restore the previous pool limit. Matches two earlier
              pool-saturation incidents.
            </p>
            <div className="mk-phone-actions">
              <span className="mk-approve">Approve fix</span>
              <span className="mk-reject">Request changes</span>
            </div>
            <p className="mk-phone-note">Nothing ships without a responder’s sign-off.</p>
          </div>

          {/* Terminal — the infrastructure */}
          <div className="mk-pane mk-pane--terminal mk-pane--dark">
            <span className="mk-pane-tag">Your infrastructure</span>
            <div className="mk-pane-bar">
              <span className="mk-window-dots"><span className="mk-window-dot" /><span className="mk-window-dot" /><span className="mk-window-dot" /></span>
              <span className="mk-pane-bar-title">arch@your-server — ssh</span>
            </div>
            <pre className="mk-term-body">
              <span className="cmd">$ docker compose up -d</span>{'\n'}
              <span className="ok">✔</span> postgres · ready{'\n'}
              <span className="ok">✔</span> arch-core · listening :3000{'\n'}
              <span className="ok">✔</span> native inference · CPU only{'\n'}
              <span className="dim">no external AI calls · 0 egress</span>{'\n'}
              <span className="cmd">$ <span className="caret">▋</span></span>
            </pre>
          </div>

          {/* Channel window — the shared workspace */}
          <div className="mk-pane mk-pane--chat">
            <span className="mk-pane-tag">Your workspace</span>
            <div className="mk-pane-bar">
              <span className="mk-window-dots"><span className="mk-window-dot" /><span className="mk-window-dot" /><span className="mk-window-dot" /></span>
              <span className="mk-pane-bar-title"># inc-204-checkout-api-latency</span>
            </div>
            <div className="mk-chat-body">
              <div className="mk-msg">
                <span className="mk-msg-avatar mk-msg-avatar--arch">A</span>
                <div>
                  <p className="mk-msg-meta"><strong>ARCH</strong> <em>APP</em> 03:15</p>
                  <p className="mk-msg-text">
                    Latency on <code>POST /api/checkout</code> tracks a <code>pool_saturation</code>{' '}
                    alert. Candidate cause: lock in <code>migration 0412</code>. Draft fix ready for
                    review.
                  </p>
                </div>
              </div>
              <div className="mk-msg">
                <span className="mk-msg-avatar">AM</span>
                <div>
                  <p className="mk-msg-meta"><strong>Alex Mercer</strong> 03:16</p>
                  <p className="mk-msg-text">@arch what do the checkout logs show since the deploy?</p>
                </div>
              </div>
              <p className="mk-chat-typing">Pulling checkout-api logs…</p>
            </div>
            <div className="mk-chat-foot">
              <span>Org-scoped</span>
              <span>every write lands in the audit trail</span>
            </div>
          </div>

          <span className="mk-pane mk-pane--audit">
            <i /> Audit trail is recording
          </span>
        </div>

        <div className="mk-principles" data-mk-stagger="rows">
          {PRINCIPLES.map((principle) => (
            <article key={principle.title} className="mk-principle">
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
