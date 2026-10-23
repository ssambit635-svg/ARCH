import { cookies } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import { roleHasPermission } from '@/lib/permissions';
import { statusPageRepository } from '@/server/repositories/statusPage.repository';
import { readWorkspaceTheme, WORKSPACE_THEME_COOKIE } from '@/components/shell/theme-preferences';
import '@/components/shell/workspace.css';
import { redirect } from 'next/navigation';
import { requireUser, resolveOrganization } from '@/lib/session';
import { isSidebarVisible, SIDEBAR_PREFERENCE_COOKIE } from '@/components/shell/sidebar-preferences';
import { listOrganizations } from '@/server/services/organization.service';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { serviceRepository } from '@/server/repositories/service.repository';
import { Shell } from '@/components/shell/shell';
import type { PaletteEntry } from '@/components/shell/command-palette';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#151718' },
  ],
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect('/login?callbackUrl=/dashboard');

  const organizations = await listOrganizations(user.id);
  if (organizations.length === 0) redirect('/onboarding');

  const organization = await resolveOrganization(user.id);
  const cookieStore = await cookies();
  const initialSidebarVisible = isSidebarVisible(cookieStore.get(SIDEBAR_PREFERENCE_COOKIE)?.value);
  const canDeclareIncident = roleHasPermission(organization.role, 'incident.write');
  const canReadAudit = roleHasPermission(organization.role, 'audit.read');
  const [openIncidents, recentIncidents, services, statusPage] = await Promise.all([
    incidentRepository.count(organization.id, { open: true }),
    incidentRepository.findRecent(organization.id, 8),
    serviceRepository.list(organization.id),
    statusPageRepository.firstPublished(organization.id),
  ]);

  const paletteEntries: PaletteEntry[] = [
    ...(canDeclareIncident
      ? [
          {
            kind: 'action' as const,
            label: 'Declare incident',
            hint: 'Start a response',
            href: '/dashboard/incidents/new',
          },
        ]
      : []),
    ...recentIncidents.map(
      (incident): PaletteEntry => ({
        kind: 'incident',
        label: incident.title,
        hint: `${incident.project.name}${incident.service ? ` · ${incident.service.name}` : ''} · ${incident.status}`,
        href: `/dashboard/incidents/${incident.id}`,
        severity: incident.severity,
        status: incident.status,
      }),
    ),
    ...services.slice(0, 12).map(
      (service): PaletteEntry => ({
        kind: 'service',
        label: service.name,
        hint: `${service.project.name}`,
        href: `/dashboard/services/${service.id}`,
        status: service.status,
      }),
    ),
    { kind: 'page', label: 'Overview', hint: 'Org health at a glance', href: '/dashboard' },
    {
      kind: 'page',
      label: 'Incidents',
      hint: 'Every incident, filterable',
      href: '/dashboard/incidents',
    },
    {
      kind: 'page',
      label: 'Projects & services',
      hint: 'Projects and recorded service status',
      href: '/dashboard/projects',
    },
    {
      kind: 'page',
      label: 'Status pages',
      hint: 'Publish customer-facing pages',
      href: '/dashboard/status',
    },
    {
      kind: 'page',
      label: 'Chat with ARCH',
      hint: 'Talk to ARCH about incidents, history and runbooks',
      href: '/dashboard/chat',
    },
    {
      kind: 'page',
      label: 'Model & training',
      hint: 'Native assistance, versions, training',
      href: '/dashboard/model',
    },
    { kind: 'page', label: 'Code Assist', hint: 'Review, fix, explain', href: '/dashboard/code' },
    {
      kind: 'page',
      label: 'Knowledge',
      hint: 'Runbooks and RAG sources',
      href: '/dashboard/knowledge',
    },
    { kind: 'page', label: 'Repositories', hint: 'GitHub insight', href: '/dashboard/repos' },
    { kind: 'page', label: 'SLOs', hint: 'Error budgets', href: '/dashboard/slos' },
    {
      kind: 'page',
      label: 'Blast radius',
      hint: 'Dependencies and changes',
      href: '/dashboard/dependencies',
    },
    ...(canReadAudit
      ? [
          {
            kind: 'page' as const,
            label: 'Audit log',
            hint: 'Recorded workspace changes',
            href: '/dashboard/audit',
          },
        ]
      : []),
    {
      kind: 'page',
      label: 'Settings',
      hint: 'People, tokens, webhooks',
      href: '/dashboard/settings',
    },
  ];

  return (
    <Shell
      organizations={organizations.map((org) => ({ id: org.id, name: org.name, role: org.role }))}
      currentOrg={organization.id}
      statusPage={statusPage}
      canDeclareIncident={canDeclareIncident}
      canReadAudit={canReadAudit}
      initialTheme={readWorkspaceTheme(cookieStore.get(WORKSPACE_THEME_COOKIE)?.value)}
      user={{ email: user.email, name: user.name }}
      role={organization.role}
      openIncidents={openIncidents}
      paletteEntries={paletteEntries}
      initialSidebarVisible={initialSidebarVisible}
    >
      {children}
    </Shell>
  );
}
