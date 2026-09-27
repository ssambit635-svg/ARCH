import Link from 'next/link';
import type { Metadata } from 'next';
import { AI_NAME } from '@/lib/brand';
import { Logo } from '@/components/ui/logo';

export const metadata: Metadata = {
  title: 'ARCH — incident management for developer teams',
  description:
    'Ingest alerts, run the response, publish a status page, keep the audit trail — with ARCH V1.1, native on-call intelligence that runs on your server.',
};

/**
 * Marketing landing page — static, SEO-friendly, no session required.
 * The flow shown here is the actual product flow (features.md → "the five lines").
 */

const steps = [
  {
    title: 'Ingest',
    body: 'Your tools POST an HMAC-signed webhook. Bad signatures are rejected and logged; valid ones become incidents — duplicates collapse automatically.',
  },
  {
    title: 'Respond',
    body: 'Incidents move INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED, with every comment, assignment and change on one timeline.',
  },
  {
    title: 'Publish',
    body: 'Customers read a status page instead of filing tickets. Publish or unpublish in one click; drafts 404 for everyone.',
  },
  {
    title: 'Prove',
    body: 'Every write lands in an immutable audit log in the same transaction — it can never disagree with the data.',
  },
];

const features = [
  {
    title: 'Incident state machine',
    body: 'Legal transitions only, enforced server-side. Stale tabs get a 409 with a human message — never a corrupt state.',
  },
  {
    title: 'Public status pages',
    body: 'Per-service components, 90-day uptime bars, active + past incidents. Statically rendered, revalidated on every write.',
  },
  {
    title: 'Webhook ingestion',
    body: 'Grafana, Sentry, GitHub — anything that POSTs JSON. HMAC verification, idempotency keys, and a full delivery log.',
  },
  {
    title: 'RBAC that holds up',
    body: 'OWNER / ADMIN / RESPONDER / VIEWER. One permission matrix, checked on every request — the UI only hides buttons.',
  },
  {
    title: 'SLOs & blast radius',
    body: 'Error budgets that warn before they burn, and a dependency map that shows exactly what a deploy can break.',
  },
  {
    title: 'Verified Fix Loop',
    body: `Patches proposed against your pinned commit, tested in an isolated sandbox, opened as a draft PR — only after a human approves.`,
  },
];

const v11 = [
  { title: 'Triage in one click', body: 'Severity + assignee suggestions from your own incident history — approve to apply.' },
  { title: 'Summaries & postmortems', body: 'Five-bullet briefs for whoever joins next; postmortems drafted from the real timeline.' },
  { title: 'Ask anything', body: '“What’s the status?”, “database slow hai, kya karu?” — answers with clickable evidence.' },
  { title: 'Code fixes with proof', body: 'Stack trace in, tested patch out. Sandbox evidence bundle attached to every fix.' },
];

const stats = [
  { value: '5 min', label: 'from signup to first status page' },
  { value: '100%', label: 'of writes covered by the audit log' },
  { value: '$0', label: 'marginal AI cost — it runs on your server' },
  { value: '0', label: 'incident bytes sent to AI vendors' },
];

/** CSS-only product mock — the dashboard overview, shrunk into the hero. */
function ProductMock() {
  return (
    <div className="layer-shadow overflow-hidden rounded-2xl border border-white/10 bg-abyss-900/95 text-left" aria-hidden="true">
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-rose-500/70" />
        <span className="size-2.5 rounded-full bg-amber-500/70" />
        <span className="size-2.5 rounded-full bg-emerald-500/70" />
        <span className="arch-mono ml-3 rounded-md bg-white/[0.05] px-2.5 py-0.5 text-[10px] text-slate-500">app.arch.dev/dashboard</span>
      </div>
      <div className="flex">
        <div className="hidden w-36 shrink-0 space-y-1 border-r border-white/[0.06] p-3 sm:block">
          {['Overview', 'Incidents', 'Services', 'ARCH V1.1', 'Status pages', 'Settings'].map((item, i) => (
            <div
              key={item}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${i === 1 ? 'bg-white/[0.08] text-white' : 'text-slate-500'}`}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-3.5 py-2.5">
            <span className="size-2 animate-pulse-dot rounded-full bg-rose-400" />
            <p className="truncate text-xs font-semibold text-rose-200">2 open incidents · checkout-api degraded</p>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { title: 'Checkout latency spike in eu-west', sev: 'CRITICAL', sevClass: 'bg-rose-500/15 text-rose-300', status: 'Investigating' },
              { title: 'Webhook retries backing up', sev: 'HIGH', sevClass: 'bg-orange-500/15 text-orange-300', status: 'Monitoring' },
              { title: 'Slow query on invoices table', sev: 'MEDIUM', sevClass: 'bg-amber-500/15 text-amber-200', status: 'Identified' },
            ].map((row) => (
              <div key={row.title} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5">
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200">{row.title}</p>
                <span className={`hidden rounded px-1.5 py-0.5 text-[10px] font-bold sm:inline ${row.sevClass}`}>{row.sev}</span>
                <span className="hidden text-[11px] text-slate-500 md:inline">{row.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-violet-500/25 bg-gradient-to-r from-indigo-500/[0.12] to-violet-500/[0.1] px-3.5 py-2.5">
            <span className="rounded-md bg-gradient-to-r from-indigo-500/30 to-violet-500/30 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
              {AI_NAME}
            </span>
            <p className="truncate text-[11px] text-slate-300">Triage draft ready — severity HIGH → CRITICAL, assign to Ada</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingHome() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="arch-backdrop pointer-events-none fixed inset-0" aria-hidden />

      {/* Nav */}
      <header className="glass sticky top-0 z-40 border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Site">
            {(
              [
                ['How it works', '#how-it-works'],
                [AI_NAME, '#ai'],
                ['Features', '#features'],
                ['Live demo', '/status/demo'],
              ] as [string, string][]
            ).map(([label, href]) => (
              <Link key={label} href={href} prefetch={false} className="rounded-lg px-3 py-1.5 text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgb(99_102_241/0.6)] ring-1 ring-inset ring-white/10 transition hover:from-indigo-400 hover:to-indigo-500"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pb-14 pt-16 text-center sm:pt-24">
          <Link
            href="#ai"
            className="inline-flex animate-rise items-center gap-2 rounded-full border border-violet-500/30 bg-gradient-to-r from-indigo-500/15 to-violet-500/15 px-3.5 py-1.5 text-[13px] font-medium text-violet-200 transition hover:border-violet-500/50"
          >
            <span className="size-1.5 animate-pulse-dot rounded-full bg-violet-400" aria-hidden />
            New · {AI_NAME} — on-call intelligence on your server
          </Link>
          <h1 className="mt-6 animate-rise text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl" style={{ animationDelay: '80ms' }}>
            Where your team goes <span className="text-gradient">when the app breaks.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-rise text-pretty text-base leading-relaxed text-slate-400 sm:text-lg" style={{ animationDelay: '160ms' }}>
            One alert comes in and ARCH carries it all the way through: incident created, responder
            assigned, timeline collaboration, resolution, status page updated, audit trail preserved.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap justify-center gap-3" style={{ animationDelay: '240ms' }}>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_32px_-8px_rgb(99_102_241/0.7)] ring-1 ring-inset ring-white/10 transition hover:from-indigo-400 hover:to-indigo-500 active:scale-[0.98]"
            >
              Create your organization
            </Link>
            <Link
              href="/status/demo"
              prefetch={false}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-[15px] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              See a live status page
            </Link>
          </div>
          <p className="mt-4 animate-rise text-xs text-slate-600" style={{ animationDelay: '300ms' }}>
            Free to start · no credit card · your data stays on your server
          </p>
        </section>

        {/* Product mock */}
        <section className="animate-rise" style={{ animationDelay: '350ms' }} aria-label="Product preview">
          <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-96 w-[42rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[130px]" aria-hidden />
          <ProductMock />
        </section>

        {/* Stats */}
        <section className="mt-14 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Highlights">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-5 py-4 text-center">
              <p className="text-gradient text-2xl font-semibold tracking-tight sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[13px]">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mt-24 scroll-mt-24">
          <p className="arch-mono text-xs uppercase tracking-[0.2em] text-indigo-400">How it works</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Alert to audit trail, without the swivel chair.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="card-lift rounded-2xl border border-white/[0.07] bg-abyss-850/80 p-5">
                <span className="arch-mono text-xs font-semibold text-indigo-400">0{index + 1}</span>
                <h3 className="mt-2 text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ARCH V1.1 */}
        <section id="ai" className="mt-24 scroll-mt-24">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-indigo-500/[0.1] via-abyss-850 to-violet-500/[0.08] p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-violet-600/20 blur-[110px]" aria-hidden />
            <div className="relative grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/25 to-violet-500/25 px-3 py-1 text-xs font-bold tracking-wide text-violet-200 ring-1 ring-inset ring-violet-500/40">
                  {AI_NAME} · NATIVE INTELLIGENCE
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  An on-call brain trained on <span className="text-gradient">your incidents.</span>
                </h2>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-400">
                  No OpenAI key. No per-seat AI upsell. No incident data leaving your infrastructure.
                  ARCH V1.1 runs on your server, learns from every resolved incident, and every draft
                  waits for a human approve — nothing auto-applies, ever.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_-8px_rgb(139_92_246/0.7)] transition hover:brightness-110"
                  >
                    Try {AI_NAME} free
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
              <ul className="space-y-3">
                {v11.map((item) => (
                  <li key={item.title} className="rounded-2xl border border-white/[0.08] bg-abyss-950/60 p-4 backdrop-blur">
                    <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-24 scroll-mt-24">
          <p className="arch-mono text-xs uppercase tracking-[0.2em] text-indigo-400">Everything included</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The whole incident lifecycle, in one place.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card-lift rounded-2xl border border-white/[0.07] bg-abyss-850/80 p-5">
                <h3 className="text-[15px] font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Honest scope */}
        <section className="mt-24 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-abyss-850/80 p-6">
            <h2 className="text-lg font-semibold text-white">What ships today</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-300">
              {[
                'Email/password + GitHub auth, organizations, 4 roles with server-side checks',
                'Projects, services and an incident state machine enforced in one place',
                'Public status pages with publish/unpublish and cached anonymous reads',
                'HMAC-verified webhook ingestion with idempotency and a delivery log',
                'Transactional notification outbox with retries',
                'Audit log for every write, admin-only, paginated',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-300">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-abyss-850/80 p-6">
            <h2 className="text-lg font-semibold text-white">What ARCH is not</h2>
            <p className="mt-3 text-sm text-slate-400">Deliberately out of scope, so the product stays fast and honest:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['an AI model vendor', 'an IDE', 'a code generator', 'a hosting platform', 'CI/CD', 'a billing system', 'real-time chat', 'Kubernetes'].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              No multi-region, no mobile apps, no per-seat AI tax — the intelligence is native and free with the product.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-600/[0.15] via-abyss-850 to-abyss-850 p-8 text-center sm:p-12">
          <h2 className="mx-auto max-w-xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The next incident is coming. Be the team that was ready.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-slate-400">
            Five minutes from now you can have a status page, a webhook endpoint, and an on-call trail.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_32px_-8px_rgb(99_102_241/0.7)] ring-1 ring-inset ring-white/10 transition hover:from-indigo-400 hover:to-indigo-500"
            >
              Start free — no credit card
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative mt-20 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-slate-500">
          <span className="flex items-center gap-2.5">
            <Logo />
          </span>
          <span className="flex flex-wrap gap-5">
            <Link className="transition hover:text-slate-200" href="/login">Sign in</Link>
            <Link className="transition hover:text-slate-200" href="/register">Register</Link>
            <Link className="transition hover:text-slate-200" href="/status/demo" prefetch={false}>Live demo</Link>
            <a className="transition hover:text-slate-200" href="/api/health">API health</a>
          </span>
        </div>
        <p className="mx-auto max-w-6xl px-5 pb-6 text-xs text-slate-700">ARCH · incident management + status pages + {AI_NAME}</p>
      </footer>
    </div>
  );
}
