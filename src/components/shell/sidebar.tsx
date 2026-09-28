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
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{section.label}</p>
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
                    className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition ${
                      active ? 'bg-white/[0.07] text-white shadow-[0_1px_8px_rgb(0_0_0/0.35)] ring-1 ring-inset ring-white/[0.08]' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                    }`}
                  >
                    {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" aria-hidden /> : null}
                    <span className={active ? 'text-indigo-300' : item.ai ? 'text-violet-400/90' : 'text-slate-500 group-hover:text-slate-300'}>
                      <item.icon />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.ai ? (
                      <span className="rounded-md bg-gradient-to-r from-indigo-500/25 to-violet-500/25 px-1.5 py-px text-[10px] font-bold tracking-wide text-violet-200 ring-1 ring-inset ring-violet-500/30">
                        AI
                      </span>
                    ) : null}
                    {badge > 0 ? (
                      <span className="min-w-5 rounded-full bg-rose-500/20 px-1.5 py-px text-center text-[11px] font-bold tabular-nums text-rose-300 ring-1 ring-inset ring-rose-500/30">
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
