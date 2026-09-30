import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#050608] text-white flex flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-30" aria-hidden />

      <header className="relative z-10 border-b border-[#222]">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="ARCH home">
            <Logo subtitle="Incident Platform" />
          </Link>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <Link href="/status/arch" className="hover:text-white transition-colors flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-ok-400 animate-pulse-dot" />
              System status
            </Link>
            <span className="text-zinc-700">·</span>
            <Link href="/" className="hover:text-white transition-colors font-mono">
              ← Back to overview
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 grid lg:grid-cols-12 mx-auto w-full max-w-7xl border-x border-[#222]">
        <aside className="hidden lg:flex lg:col-span-6 flex-col justify-between p-12 border-r border-[#222] bg-[#08090c]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222] bg-[#0d0e12] px-3 py-1 font-mono text-[11px] font-medium text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3b8ef4]" />
              ARCH Platform · Native Intelligence V1.1
            </div>
            <h1 className="mt-6 font-orbitron text-3xl font-bold tracking-tight text-white leading-[1.15]">
              When production breaks at 03:00, clarity beats heroics.
            </h1>
            <p className="mt-3 font-mono text-sm text-zinc-400 leading-relaxed max-w-md">
              A single operational plane for alert deduplication, on-call routing, live collaboration, native AI root-cause hypotheses, and public status telemetry.
            </p>

            <div className="mt-8 rounded-xl border border-[#222] bg-[#050608] overflow-hidden shadow-[0_24px_72px_-48px_rgb(0,0,0),inset_0_1px_0_rgba(255,255,255,0.043)]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] bg-[#0c0d11]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-crit-400 animate-pulse-dot" />
                  <span className="font-mono text-[11px] text-white font-semibold">INC-204</span>
                  <span className="text-[11px] text-zinc-400 truncate">
                    Checkout latency &gt; 4.2s p99 · eu-central-1
                  </span>
                </div>
                <span className="font-mono text-[10px] rounded bg-crit-500/15 text-crit-400 border border-crit-500/30 px-1.5 py-0.5">
                  SEV-1 · INVESTIGATING
                </span>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-mono text-[10px] text-zinc-500 tnum">03:12:04</span>
                  <div className="text-zinc-300">
                    Alert deduplicated <span className="font-mono text-zinc-400">(14 events → 1 incident)</span> · routed to{' '}
                    <span className="text-white font-medium">@primary-oncall</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-mono text-[10px] text-zinc-500 tnum">03:12:19</span>
                  <div className="rounded-lg border border-[#222] bg-[#0d0e13] px-3 py-2 text-zinc-200 flex-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#3b8ef4] uppercase tracking-wider">
                      <span>ARCH V1.1 · Root-Cause Hypothesis</span>
                      <span>87% confidence</span>
                    </div>
                    <p className="mt-1 text-zinc-200 leading-relaxed">
                      Connection pool saturation on <span className="font-mono text-white">pg-primary-02</span> following deploy{' '}
                      <span className="font-mono text-white">v2.18.4</span>. Recommend rolling back migration #418.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-mono text-[10px] text-zinc-500 tnum">03:14:02</span>
                  <div className="text-zinc-300">
                    Status page updated · <span className="text-ok-400 font-medium">Mitigation verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#222] text-xs">
            <div>
              <div className="font-orbitron text-lg font-bold text-white tnum">&lt; 180ms</div>
              <div className="font-mono text-zinc-500 text-[11px] mt-0.5">Webhook ingest p99</div>
            </div>
            <div>
              <div className="font-orbitron text-lg font-bold text-white tnum">99.98%</div>
              <div className="font-mono text-zinc-500 text-[11px] mt-0.5">90-day uptime ledger</div>
            </div>
            <div>
              <div className="font-orbitron text-lg font-bold text-[#3b8ef4] tnum">SHA-256</div>
              <div className="font-mono text-zinc-500 text-[11px] mt-0.5">Append-only audit log</div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </main>
    </div>
  );
}
