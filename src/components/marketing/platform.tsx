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
    body: 'Explicit state transitions, reviewable drafts, and human-approved fixes. ARCH supports the responder; it doesn’t replace them.',
  },
];

/**
 * One incident, three surfaces — a composed desktop scene in the style of the
 * incident.io hero collage. Every window is real HTML/CSS (no screenshots), each
 * one standing for a control principle: the terminal is your infrastructure, the
 * channel window is your workspace, the phone is your decisions. The scene is
 * decorative; the three principles below carry the accessible copy.
 */
export function Platform() {
  return (
    <section id="capabilities" className="mk-section mk-control" aria-labelledby="principles-title">
      {/* Living lattice behind the whole frame: nodes and travelling signals,
          decoration only. It freezes to one frame under reduced motion. */}
      <ControlLattice variant="field" />
      <div className="mk-container">
        <div className="mk-section-heading mk-control-heading">
          <div>
            <p className="mk-eyebrow" data-mk-reveal>By design</p>
            <h2 id="principles-title" className="mk-title" data-mk-heading aria-label="Built to stay in your control.">Built to stay<br /> in your control.</h2>
            <p className="mk-description" data-mk-reveal>One incident, three surfaces — all of it running on hardware you own.</p>
          </div>
        </div>
      </div>

      <div className="mk-control-stage" data-mk-panel aria-hidden="true">
        {/* Desktop menu bar */}
        <div className="mk-control-menubar">
          <span className="mk-control-menubar-brand">● ARCH</span>
          <span className="mk-control-menubar-pill">INC-204 · live 03:18</span>
          <span className="mk-control-menubar-clock">Thu Oct 8 · 3:18 AM</span>
        </div>

        {/* Backdrop application window */}
        <div className="mk-control-backdrop">
          <div className="mk-control-titlebar">
            <span className="mk-control-dots"><i /><i /><i /></span>
            <span className="mk-control-titlebar-label">ARCH — Incident workspace</span>
          </div>
          <div className="mk-control-backdrop-body">
            <ControlLattice variant="topology" />
            <span className="mk-control-ring mk-control-ring--1" />
            <span className="mk-control-ring mk-control-ring--2" />
            <span className="mk-control-ring mk-control-ring--3" />
            <span className="mk-control-node mk-control-node--1">checkout-api</span>
            <span className="mk-control-node mk-control-node--2">postgres-primary</span>
            <span className="mk-control-node mk-control-node--3">webhook-worker</span>
          </div>
        </div>

        {/* Phone — Your decisions */}
        <div className="mk-control-phone">
          <span className="mk-control-tag">Your decisions</span>
          <div className="mk-control-phone-status"><span>3:18</span><span>●●● ⌁</span></div>
          <p className="mk-control-phone-id">‹ INC-204</p>
          <p className="mk-control-phone-title">Checkout API latency is elevated</p>
          <div className="mk-control-phone-tabs">
            <span className="is-active">Review</span><span>Details</span><span>Updates</span>
          </div>
          <p className="mk-control-phone-label">Suggested fix · draft</p>
          <p className="mk-control-phone-body">
            Roll back migration 0412 and restore the previous pool limit. Matches two
            earlier pool-saturation incidents.
          </p>
          <div className="mk-control-phone-actions">
            <span className="mk-control-approve">Approve fix</span>
            <span className="mk-control-reject">Request changes</span>
          </div>
          <p className="mk-control-phone-note">Nothing ships without a responder’s sign-off.</p>
        </div>

        {/* Channel window — Your workspace */}
        <div className="mk-control-chat">
          <span className="mk-control-tag">Your workspace</span>
          <div className="mk-control-titlebar">
            <span className="mk-control-dots"><i /><i /><i /></span>
            <span className="mk-control-titlebar-label"># inc-204-checkout-api-latency</span>
          </div>
          <div className="mk-control-chat-body">
            <div className="mk-control-msg">
              <span className="mk-control-msg-avatar mk-control-msg-avatar--arch">A</span>
              <div>
                <p className="mk-control-msg-meta"><strong>ARCH</strong> <em>APP</em> 03:15</p>
                <p className="mk-control-msg-text">
                  Latency on <code>POST /api/checkout</code> tracks a <code>pool_saturation</code> alert.
                  Root cause candidate: lock introduced in <code>migration 0412</code> — see
                  <code> db/pool.ts:142</code>. Severity <strong>High</strong>; draft fix ready for review.
                </p>
              </div>
            </div>
            <div className="mk-control-msg">
              <span className="mk-control-msg-avatar">AM</span>
              <div>
                <p className="mk-control-msg-meta"><strong>Alex Mercer</strong> 03:16</p>
                <p className="mk-control-msg-text">@arch what do the checkout logs show since the deploy?</p>
              </div>
            </div>
            <p className="mk-control-typing">Pulling checkout-api logs…</p>
          </div>
          <p className="mk-control-chat-foot">Org-scoped · every write lands in the audit trail</p>
        </div>

        {/* Terminal — Your infrastructure */}
        <div className="mk-control-terminal">
          <span className="mk-control-tag">Your infrastructure</span>
          <div className="mk-control-titlebar mk-control-titlebar--dark">
            <span className="mk-control-dots"><i /><i /><i /></span>
            <span className="mk-control-titlebar-label">arch@your-server — ssh</span>
          </div>
          <pre className="mk-control-terminal-body">
            <span className="cmd">$ docker compose up -d</span>{'\n'}
            <span className="ok">✔</span> postgres · ready{'\n'}
            <span className="ok">✔</span> arch-core · listening :3000{'\n'}
            <span className="ok">✔</span> native inference · CPU only{'\n'}
            <span className="dim">no external AI calls · 0 egress</span>{'\n'}
            <span className="cmd">$ <span className="caret">▋</span></span>
          </pre>
        </div>

        {/* Scribe-style pill */}
        <div className="mk-control-scribe">
          <span className="mk-control-scribe-dot" />
          Audit trail is recording…
          <span className="mk-control-scribe-avatars">
            <img src="/avatars/rohit.png" alt="" width={22} height={22} loading="lazy" />
            <img src="/avatars/shinji.jpg" alt="" width={22} height={22} loading="lazy" />
          </span>
        </div>
      </div>

      <div className="mk-container">
        <div className="mk-feature-grid mk-control-pillars" data-mk-stagger="rows">
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
