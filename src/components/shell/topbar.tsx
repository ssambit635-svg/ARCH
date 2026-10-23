'use client';

import { useId, type RefObject } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShortcutKeys } from '@/components/ui/workspace-shortcut';
import { showGlobalIncidentAction } from '@/lib/workspace-shortcuts';
import { OrgSelector } from '@/components/organization/org-selector';
import { statusPageDestination, type PublishedStatusPage } from '@/lib/workspace-view';
import { IconExternal, IconPlus, IconSearch, IconSidebar } from './icons';
import { UserMenu } from './user-menu';
import { ThemeToggle } from './workspace-theme';

const titles: Record<string, string> = {
  incidents: 'Incidents',
  projects: 'Projects & services',
  services: 'Service',
  status: 'Status pages',
  chat: 'Ask ARCH',
  model: 'Model & training',
  code: 'Code Assist',
  knowledge: 'Knowledge',
  repos: 'Repositories',
  slos: 'Service objectives',
  dependencies: 'Dependencies',
  audit: 'Audit log',
  settings: 'Settings',
  new: 'Declare incident',
};

export function WorkspaceBreadcrumbs({ pathname }: { pathname: string }) {
  const trail = pathname.split('/').filter(Boolean).slice(1);
  return (
    <nav aria-label="Breadcrumb" className="arch-breadcrumb">
      {trail.length ? (
        <Link href="/dashboard" className="arch-breadcrumb-link">
          Overview
        </Link>
      ) : (
        <span className="arch-breadcrumb-current" aria-current="page">
          Overview
        </span>
      )}
      {trail.slice(0, 2).map((segment, i) => {
        const label =
          titles[segment] ?? (trail[0] === 'incidents' ? 'Incident details' : 'Details');
        const href = `/dashboard/${trail.slice(0, i + 1).join('/')}`;
        const last = i === Math.min(trail.length, 2) - 1;
        return (
          <span key={`${segment}-${i}`} className="arch-breadcrumb-step">
            <span className="arch-breadcrumb-slash" aria-hidden="true">
              /
            </span>
            {last ? (
              <span className="arch-breadcrumb-current" aria-current="page">
                {label}
              </span>
            ) : (
              <Link href={href} className="arch-breadcrumb-link">
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
  statusPage,
  canDeclareIncident,
  user,
  role,
  sidebarVisible,
  onToggleSidebar,
  mobileMenuOpen,
  mobileMenuButtonRef,
  onMenu,
  onSearch,
  onShortcuts,
}: {
  organizations: { id: string; name: string; role: string }[];
  currentOrg: string;
  statusPage: PublishedStatusPage;
  canDeclareIncident: boolean;
  user: { email: string; name: string | null };
  role: string;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  mobileMenuOpen: boolean;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
  onMenu: () => void;
  onSearch: () => void;
  onShortcuts: () => void;
}) {
  const pathname = usePathname();
  const searchLabelId = useId();
  const searchHintId = useId();
  const status = statusPageDestination(statusPage);
  return (
    <header className="arch-product-topbar">
      <div className="arch-product-topbar-row">
        <button
          type="button"
          ref={mobileMenuButtonRef}
          onClick={onMenu}
          aria-label="Open navigation"
          aria-expanded={mobileMenuOpen}
          aria-controls={mobileMenuOpen ? 'arch-mobile-navigation' : undefined}
          aria-haspopup="dialog"
          className="arch-mobile-menu-button"
        >
          <svg
            viewBox="0 0 20 20"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
          aria-expanded={sidebarVisible}
          aria-controls={sidebarVisible ? 'arch-desktop-navigation' : undefined}
          aria-keyshortcuts="Control+B Meta+B"
          title={`${sidebarVisible ? 'Hide' : 'Show'} sidebar · Ctrl+B / ⌘B`}
          className={`arch-desktop-sidebar-toggle${sidebarVisible ? '' : ' is-hidden'}`}
        >
          <IconSidebar className="size-[19px]" />
        </button>
        <OrgSelector organizations={organizations} current={currentOrg} />
        <div className="arch-topbar-divider" aria-hidden="true" />
        <WorkspaceBreadcrumbs pathname={pathname} />
        <div className="arch-topbar-actions">
          <button
            type="button"
            onClick={onSearch}
            aria-labelledby={`${searchLabelId} ${searchHintId}`}
            aria-keyshortcuts="Control+K Meta+K"
            className="arch-topbar-search"
          >
            <IconSearch className="size-4" />
            <span id={searchLabelId}>Search workspace</span>{' '}
            <span id={searchHintId} className="arch-topbar-search-keys" aria-hidden="true">
              <ShortcutKeys letter="K" />
            </span>
          </button>
          <button
            type="button"
            onClick={onSearch}
            aria-label="Search workspace"
            className="arch-topbar-search-icon"
          >
            <IconSearch className="size-4" />
          </button>
          {status.public ? (
            <Link
              href={status.href}
              prefetch={false}
              title={`${status.label} (opens in a new tab)`}
              target="_blank"
              rel="noopener noreferrer"
              className="arch-topbar-status-link"
            >
              <IconExternal className="size-4" />
              <span>Status page</span>
            </Link>
          ) : null}
          <div className="workspace-topbar-theme">
            <ThemeToggle compact />
          </div>
          {showGlobalIncidentAction(pathname, canDeclareIncident) ? (
            <Link
              href="/dashboard/incidents/new"
              aria-label="Declare incident"
              title="Declare incident"
              className="arch-topbar-declare-link"
            >
              <IconPlus className="size-4" />
              <span>Declare incident</span>
            </Link>
          ) : null}
          <UserMenu user={user} role={role} statusPage={statusPage} onShortcuts={onShortcuts} />
        </div>
      </div>
    </header>
  );
}
