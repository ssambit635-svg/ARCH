'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Kbd } from '@/components/ui/kbd';
import { OrgSelector } from '@/components/organization/org-selector';
import { IconExternal, IconPlus, IconSearch } from './icons';
import { UserMenu } from './user-menu';

const titles: Record<string, string> = {
  dashboard: 'Overview',
  incidents: 'Incidents',
  projects: 'Projects & services',
  services: 'Service',
  status: 'Status pages',
  model: 'ARCH V1.1',
  code: 'Code Assist',
  knowledge: 'Knowledge',
  repos: 'Repositories',
  slos: 'SLOs',
  dependencies: 'Blast radius',
  audit: 'Audit log',
  settings: 'Settings',
  new: 'New',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'dashboard') return null;
  const trail = segments.slice(1);

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
      <Link href="/dashboard" className="shrink-0 text-slate-500 transition hover:text-slate-200">
        Overview
      </Link>
      {trail.slice(0, 2).map((segment, i) => {
        const label = titles[segment] ?? (segment.length > 12 ? `${segment.slice(0, 8)}…` : segment);
        const href = `/dashboard/${trail.slice(0, i + 1).join('/')}`;
        const last = i === Math.min(trail.length, 2) - 1 && trail.length <= 2;
        return (
          <span key={`${segment}-${i}`} className="flex min-w-0 items-center gap-1.5">
            <span className="text-slate-700" aria-hidden>
              /
            </span>
            {last ? (
              <span className="truncate font-medium text-slate-200" aria-current="page">
                {label}
              </span>
            ) : (
              <Link href={href} className="shrink-0 text-slate-500 transition hover:text-slate-200">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function Topbar({
  organizations,
  currentOrg,
  statusSlug,
  user,
  role,
  onMenu,
  onSearch,
}: {
  organizations: { id: string; name: string; role: string }[];
  currentOrg: string;
  statusSlug: string;
  user: { email: string; name: string | null };
  role: string;
  onMenu: () => void;
  onSearch: () => void;
}) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-white/[0.06]">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100 lg:hidden"
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          </svg>
        </button>

        <OrgSelector organizations={organizations} current={currentOrg} />
        <div className="hidden h-5 w-px bg-white/[0.08] xl:block" aria-hidden />
        <Breadcrumbs />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="hidden items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-3 pr-2 text-[13px] text-slate-500 transition hover:border-white/15 hover:text-slate-300 sm:flex sm:w-52 lg:w-64"
          >
            <IconSearch className="size-4" />
            <span className="flex-1 truncate text-left">Search…</span>
            <span className="flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <button
            type="button"
            onClick={onSearch}
            aria-label="Search"
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-slate-400 transition hover:text-slate-200 sm:hidden"
          >
            <IconSearch className="size-4" />
          </button>

          <Link
            href={`/status/${statusSlug}`}
            prefetch={false}
            title="Open public status page"
            className="hidden items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100 md:flex"
          >
            <IconExternal className="size-4" />
            Status page
          </Link>

          <Link
            href="/dashboard/incidents/new"
            className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_-4px_rgb(244_63_94/0.6)] ring-1 ring-inset ring-white/10 transition hover:from-rose-400 hover:to-rose-500 active:scale-[0.98] sm:inline-flex"
          >
            <IconPlus className="size-4" />
            Declare incident
          </Link>

          <UserMenu user={user} role={role} statusSlug={statusSlug} />
        </div>
      </div>
    </header>
  );
}
