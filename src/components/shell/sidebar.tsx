'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AI_NAME } from '@/lib/brand';
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

type Item = { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode; badge?: number; ai?: boolean };

const sections: { label: string; items: Item[] }[] = [
  {
    label: 'Respond',
    items: [
      { href: '/dashboard', label: 'Overview', icon: IconOverview },
      { href: '/dashboard/incidents', label: 'Incidents', icon: IconIncident },
      { href: '/dashboard/projects', label: 'Projects & services', icon: IconServices },
      { href: '/dashboard/status', label: 'Status pages', icon: IconStatus },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/dashboard/chat', label: 'Chat with ARCH', icon: IconChat, ai: true },
      { href: '/dashboard/model', label: AI_NAME, icon: IconSpark, ai: true },
      { href: '/dashboard/code', label: 'Code Assist', icon: IconCode },
      { href: '/dashboard/knowledge', label: 'Knowledge', icon: IconBook },
      { href: '/dashboard/repos', label: 'Repositories', icon: IconRepo },
    ],
  },
  {
    label: 'Reliability',
    items: [
      { href: '/dashboard/slos', label: 'SLOs', icon: IconGauge },
      { href: '/dashboard/dependencies', label: 'Blast radius', icon: IconGraph },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/audit', label: 'Audit log', icon: IconAudit },
      { href: '/dashboard/settings', label: 'Settings', icon: IconSettings },
    ],
  },
];

export function SidebarNav({ openIncidents, onNavigate }: { openIncidents: number; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="arch-sidebar-nav" aria-label="Dashboard">
      {sections.map((section) => (
        <div key={section.label} className="arch-sidebar-section">
          <p className="arch-sidebar-section-title">{section.label}</p>
          <ul className="arch-sidebar-list">
            {section.items.map((item) => {
              const active = item.href === '/dashboard' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.href === '/dashboard/incidents' ? openIncidents : (item.badge ?? 0);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`arch-sidebar-link${active ? ' is-active' : ''}`}
                  >
                    {active ? <span className="arch-sidebar-active-mark" aria-hidden /> : null}
                    <span className={`arch-sidebar-icon${active ? ' is-active' : ''}${item.ai ? ' is-ai' : ''}`}>
                      <item.icon className="size-[17px]" />
                    </span>
                    <span className="arch-sidebar-link-label">{item.label}</span>
                    {item.ai ? <span className="arch-sidebar-ai-tag">AI</span> : null}
                    {badge > 0 ? (
                      <span className="arch-sidebar-count" title={`${badge} open incident${badge === 1 ? '' : 's'}`}>
                        {badge > 99 ? (
                          <><span aria-hidden="true">99+</span><span className="sr-only">{badge} open incidents</span></>
                        ) : badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function SidebarBrand({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <Link href="/dashboard" onClick={onNavigate} className="arch-sidebar-brand" aria-label="ARCH home">
      <Logo subtitle="Response workspace" />
    </Link>
  );
}
