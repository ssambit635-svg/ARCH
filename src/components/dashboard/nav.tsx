'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/incidents', label: 'Incidents' },
  { href: '/dashboard/projects', label: 'Projects & services' },
  { href: '/dashboard/status', label: 'Status pages' },
  { href: '/dashboard/audit', label: 'Audit log' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function DashboardNav({ openIncidents }: { openIncidents: number }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1" aria-label="Dashboard">
      {items.map((item) => {
        const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
              active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <span>{item.label}</span>
            {item.href === '/dashboard/incidents' && openIncidents > 0 ? (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300">{openIncidents}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
