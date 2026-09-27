import Link from 'next/link';

/** Underline tabs built from links — server-rendered, driven by `?tab=` search params. */
export function Tabs({ tabs }: { tabs: { id: string; label: string; href: string; active: boolean; count?: number }[] }) {
  return (
    <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-white/[0.07]" role="tablist">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          role="tab"
          aria-selected={tab.active}
          className={`relative shrink-0 px-3.5 pb-2.5 pt-1 text-sm font-medium transition ${
            tab.active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="ml-1.5 rounded-full bg-white/[0.07] px-1.5 py-px text-[11px] tabular-nums text-slate-400">{tab.count}</span>
          ) : null}
          {tab.active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" /> : null}
        </Link>
      ))}
    </div>
  );
}
