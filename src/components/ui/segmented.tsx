import Link from 'next/link';

/**
 * Segmented control built from links — server-rendered, no JS needed.
 * Each option carries its full href; `active` marks the current one.
 */
export function SegmentedControl({
  options,
  size = 'md',
}: {
  options: { label: string; href: string; active: boolean; count?: number | null }[];
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter"
      className={`inline-flex max-w-full items-center gap-1 overflow-x-auto scroll-thin rounded-xl border border-white/[0.08] bg-abyss-900/80 p-1 ${size === 'sm' ? 'text-xs' : 'text-[13px]'}`}
    >
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          role="tab"
          aria-selected={option.active}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
            option.active
              ? 'bg-white/[0.09] text-white shadow-[0_1px_8px_rgb(0_0_0/0.4)] ring-1 ring-inset ring-ink-1000/10'
              : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
          }`}
        >
          {option.label}
          {option.count !== null && option.count !== undefined ? (
            <span
              className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${
                option.active ? 'bg-white/10 text-slate-200' : 'bg-white/[0.06] text-slate-500'
              }`}
            >
              {option.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
