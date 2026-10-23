import Link from 'next/link';

/** Underline tabs built from links — server-rendered, driven by `?tab=` search params. */
export function Tabs({
  tabs,
  variant = 'underline',
  label = 'Page sections',
}: {
  variant?: 'underline' | 'sidebar';
  label?: string;
  tabs: { id: string; label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <nav
      className={`workspace-section-links${variant === 'sidebar' ? ' workspace-settings-section-links' : ''} scroll-thin flex flex-wrap gap-1 border-b border-white/[0.07]`}
      aria-label={label}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={`relative shrink-0 px-3.5 pb-2.5 pt-1 text-sm font-medium transition ${
            tab.active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="ml-1.5 rounded-full bg-white/[0.07] px-1.5 py-px text-[11px] tabular-nums text-slate-400">
              {tab.count}
            </span>
          ) : null}
          {tab.active ? (
            <span
              aria-hidden="true"
              className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
            />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
