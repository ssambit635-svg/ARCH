'use client';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg animate-rise py-16 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-2xl">⚠</div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-white">That page didn&apos;t load</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Something went wrong on our side. Your data is safe — try again, or head back to the overview.
      </p>
      {error.digest ? <p className="arch-mono mt-3 text-xs text-slate-600">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2.5">
        <button
          onClick={reset}
          className="rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:from-indigo-400 hover:to-indigo-500"
        >
          Try again
        </button>
        <a href="/dashboard" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]">
          Overview
        </a>
      </div>
    </div>
  );
}
