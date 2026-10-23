'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import {
  IconAudit,
  IconBook,
  IconChat,
  IconCode,
  IconGauge,
  IconGraph,
  IconIncident,
  IconOverview,
  IconRepo,
  IconServices,
  IconSettings,
  IconSpark,
  IconStatus,
} from './icons';

type Item = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactNode;
  auditOnly?: boolean;
};
const response: Item[] = [
  { href: '/dashboard', label: 'Overview', icon: IconOverview },
  { href: '/dashboard/incidents', label: 'Incidents', icon: IconIncident },
  { href: '/dashboard/projects', label: 'Projects & services', icon: IconServices },
  { href: '/dashboard/status', label: 'Status pages', icon: IconStatus },
];
const resources: Item[] = [
  { href: '/dashboard/chat', label: 'Ask ARCH', icon: IconChat },
  { href: '/dashboard/knowledge', label: 'Runbooks & knowledge', icon: IconBook },
  { href: '/dashboard/slos', label: 'Service objectives', icon: IconGauge },
  { href: '/dashboard/dependencies', label: 'Dependencies & changes', icon: IconGraph },
];
const tools: Item[] = [
  { href: '/dashboard/repos', label: 'Repositories', icon: IconRepo },
  { href: '/dashboard/code', label: 'Code Assist', icon: IconCode },
  { href: '/dashboard/model', label: 'Model & training', icon: IconSpark },
  { href: '/dashboard/audit', label: 'Audit log', icon: IconAudit, auditOnly: true },
];

export function SidebarNav({
  openIncidents,
  canReadAudit,
  onNavigate,
}: {
  openIncidents: number;
  canReadAudit: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const renderItem = (item: Item) => {
    const active =
      isActive(item.href) ||
      (item.href === '/dashboard/projects' && pathname.startsWith('/dashboard/services/'));
    const badge = item.href === '/dashboard/incidents' ? openIncidents : 0;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={`arch-sidebar-link${active ? ' is-active' : ''}`}
        >
          <span className={`arch-sidebar-icon${active ? ' is-active' : ''}`}>
            <item.icon className="size-[18px]" />
          </span>
          <span className="arch-sidebar-link-label">{item.label}</span>
          {badge > 0 ? (
            <span className="arch-sidebar-count" aria-label={`${badge} open incidents`}>
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };
  const visibleTools = tools.filter((item) => !item.auditOnly || canReadAudit);
  return (
    <nav className="arch-sidebar-nav" aria-label="Workspace">
      <div className="arch-sidebar-section">
        <p className="arch-sidebar-section-title">Response</p>
        <ul className="arch-sidebar-list">{response.map(renderItem)}</ul>
      </div>
      <div className="arch-sidebar-section">
        <p className="arch-sidebar-section-title">Resources</p>
        <ul className="arch-sidebar-list">{resources.map(renderItem)}</ul>
      </div>
      <details
        key={pathname}
        className="workspace-tools"
        open={visibleTools.some((item) => isActive(item.href))}
      >
        <summary>
          Tools & administration <span aria-hidden="true">⌄</span>
        </summary>
        <ul className="arch-sidebar-list">{visibleTools.map(renderItem)}</ul>
      </details>
      <ul className="arch-sidebar-list workspace-settings-link">
        {renderItem({ href: '/dashboard/settings', label: 'Settings', icon: IconSettings })}
      </ul>
    </nav>
  );
}

export function SidebarBrand({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="arch-sidebar-brand"
      title="Workspace home"
    >
      <Logo subtitle="Incident response" />
    </Link>
  );
}
