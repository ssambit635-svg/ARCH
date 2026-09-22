import Link from 'next/link';

/**
 * Marketing landing page — static, SEO-friendly, no session required.
 * The flow shown here is the actual product flow (features.md → "the five lines").
 */

const steps = [
  {
    title: 'Ingest',
    body: 'Your existing tools POST an HMAC-signed webhook. Invalid signatures are rejected and recorded; valid ones become incidents.',
  },
  {
    title: 'Respond',
    body: 'Incidents move through INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED, with every comment and change on the timeline.',
  },
  {
    title: 'Publish',
    body: 'Customers read a status page instead of filing tickets. Publish, unpublish, and it is cached at the edge.',
  },
  {
    title: 'Prove',
    body: 'Every security- and data-relevant change lands in an immutable audit log, filterable and paginated.',
  },
];

const notList = ['an AI model', 'an IDE', 'a code generator', 'a debugger', 'a hosting platform', 'CI/CD', 'a billing system'];

export default function MarketingHome() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm">A</span>
          ARCH
        </span>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800" href="/login">
            Sign in
          </Link>
          <Link className="rounded-lg bg-indigo-600 px-3.5 py-2 font-medium text-white hover:bg-indigo-500" href="/register">
            Start free
          </Link>
        </nav>
      </header>

      <section className="mt-20 max-w-3xl">
        <p className="text-sm font-medium text-indigo-400">Incident management + public status pages</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          ARCH is where your team goes when your application breaks.
        </h1>
        <p className="mt-5 text-lg text-slate-300">
          One alert comes in and ARCH carries it all the way through: incident created, assigned to a responder,
          timeline collaboration, resolution, status page updated, audit trail preserved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500" href="/register">
            Create your organization
          </Link>
          <Link className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-200 hover:bg-slate-800" href="/status/demo">
            See a live status page
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <span className="arch-mono text-xs text-indigo-400">0{index + 1}</span>
            <h2 className="mt-2 text-base font-semibold text-white">{step.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">What v1 ships</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>• Email/password auth, organizations, 4 roles with server-side permission checks</li>
            <li>• Projects, services and an incident state machine enforced in one place</li>
            <li>• Public status pages with publish/unpublish and cached anonymous reads</li>
            <li>• HMAC-verified webhook ingestion with idempotency and a delivery log</li>
            <li>• Transactional notification outbox (email) with retries</li>
            <li>• Audit log for every write, admin-only, paginated</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">What ARCH is not</h2>
          <p className="mt-3 text-sm text-slate-400">
            Deliberately out of scope, so the product stays fast and honest:
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {notList.map((item) => (
              <span key={item} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-400">
            Also: no real-time chat, no Kubernetes, no multi-region, no mobile apps — not in v1.
          </p>
        </div>
      </section>

      <footer className="mt-20 border-t border-slate-800 pt-6 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>ARCH · v0.1.0 · pre-launch</span>
          <span className="flex gap-4">
            <Link className="hover:text-slate-300" href="/login">
              Sign in
            </Link>
            <Link className="hover:text-slate-300" href="/register">
              Register
            </Link>
            <a className="hover:text-slate-300" href="/api/health">
              Status of ARCH itself
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}
