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
    <nav className="flex-1 space-y-5 overflow-y-auto scroll-thin px-3 pb-4" aria-label="Dashboard">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="arch-mono px-2.5 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ash-700">{section.label}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === '/dashboard' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.href === '/dashboard/incidents' ? openIncidents : (item.badge ?? 0);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-200 ${
                      active ? 'bg-white/[0.055] text-bone ring-1 ring-inset ring-white/[0.09]' : 'text-ash-400 hover:bg-white/[0.035] hover:text-bone'
                    }`}
                  >
                    {active ? (
                      <span className="absolute -left-3 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-signal-500" aria-hidden />
                    ) : null}
                    <span className={active ? 'text-signal-400' : item.ai ? 'text-signal-500/80' : 'text-ash-600 group-hover:text-ash-300'}>
                      <item.icon />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.ai ? (
                      <span className="arch-mono rounded-[4px] border border-signal-500/25 bg-signal-500/[0.08] px-1.5 py-px text-[9px] font-bold tracking-[0.1em] text-signal-300">
                        AI
                      </span>
                    ) : null}
                    {badge > 0 ? (
                      <span className="arch-mono min-w-5 rounded-[4px] border border-sev-critical/30 bg-sev-critical/[0.12] px-1.5 py-px text-center text-[10.5px] font-bold tabular-nums text-sev-critical">
                        {badge}
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

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center px-5 pb-5 pt-5" aria-label="ARCH home">
      <Logo />
    </Link>
  );
}
