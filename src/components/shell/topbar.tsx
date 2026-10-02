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
  chat: 'Chat with ARCH',
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
    <nav aria-label="Breadcrumb" className="arch-breadcrumb">
      <Link href="/dashboard" className="arch-breadcrumb-link">
        Overview
      </Link>
      {trail.slice(0, 2).map((segment, i) => {
        const label = titles[segment] ?? (segment.length > 12 ? `${segment.slice(0, 8)}…` : segment);
        const href = `/dashboard/${trail.slice(0, i + 1).join('/')}`;
        const last = i === Math.min(trail.length, 2) - 1 && trail.length <= 2;
        return (
          <span key={`${segment}-${i}`} className="arch-breadcrumb-step">
            <span className="arch-breadcrumb-slash" aria-hidden> / </span>
            {last ? (
              <span className="arch-breadcrumb-current" aria-current="page">{label}</span>
            ) : (
              <Link href={href} className="arch-breadcrumb-link">{label}</Link>
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
    <header className="arch-product-topbar">
      <div className="arch-product-topbar-row">
        <button type="button" onClick={onMenu} aria-label="Open navigation" className="arch-mobile-menu-button">
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          </svg>
        </button>

        <OrgSelector organizations={organizations} current={currentOrg} />
        <div className="arch-topbar-divider" aria-hidden />
        <Breadcrumbs />

        <div className="arch-topbar-actions">
          <button type="button" onClick={onSearch} aria-label="Open command search" className="arch-topbar-search">
            <IconSearch className="size-4" />
            <span>Search anything…</span>
            <span className="arch-topbar-search-keys"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
          </button>
          <button type="button" onClick={onSearch} aria-label="Search" className="arch-topbar-search-icon">
            <IconSearch className="size-4" />
          </button>

          <Link href={`/status/${statusSlug}`} prefetch={false} title="Open public status page" className="arch-topbar-status-link">
            <IconExternal className="size-4" />
            <span>Status page</span>
          </Link>

          <Link href="/dashboard/incidents/new" className="arch-topbar-declare-link">
            <IconPlus className="size-4" />
            <span>Declare incident</span>
          </Link>

          <UserMenu user={user} role={role} statusSlug={statusSlug} />
        </div>
      </div>
    </header>
  );
}
