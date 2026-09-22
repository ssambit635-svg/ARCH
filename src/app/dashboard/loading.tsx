export default function DashboardLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-xl bg-slate-800/60" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-800/60" />
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
