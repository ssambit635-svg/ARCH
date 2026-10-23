export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer min-w-0 max-w-full rounded-lg ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div
      className="workspace-page-skeleton min-w-0 max-w-full space-y-6"
      role="status"
      aria-label="Loading workspace"
    >
      <p className="workspace-muted text-sm">Loading workspace…</p>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
