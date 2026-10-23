'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Make snapshot freshness explicit instead of labelling a server-rendered page "live". */
export function WorkspaceRefresh({
  refreshedAt,
  compact = false,
}: {
  refreshedAt: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div
      className={`workspace-data-refresh${compact ? ' workspace-data-refresh--compact' : ''}`}
      aria-label="Data freshness"
    >
      <span>
        <span className="workspace-data-label">Snapshot </span>
        <time dateTime={refreshedAt} title={refreshedAt}>
          {new Date(refreshedAt).toISOString().slice(11, 16)} UTC
        </time>
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        aria-label="Refresh workspace data"
        aria-busy={pending}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M13.6 6A5.5 5.5 0 1 0 13 11M13.6 2.8V6h-3.2" />
        </svg>
        {pending ? 'Refreshing…' : 'Refresh'}
      </button>
      <span className="sr-only" role="status">
        {pending ? 'Refreshing workspace data.' : 'Workspace data loaded.'}
      </span>
    </div>
  );
}
