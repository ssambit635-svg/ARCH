'use client';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6">
      <h2 className="text-lg font-semibold text-rose-100">That did not work</h2>
      <p className="mt-2 text-sm text-rose-200">Could not load this page. Try again or contact support if it keeps happening.</p>
      {error.digest ? <p className="mt-1 text-xs text-rose-300/80">Reference: {error.digest}</p> : null}
      <button onClick={reset} className="mt-4 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-500">
        Try again
      </button>
    </div>
  );
}
