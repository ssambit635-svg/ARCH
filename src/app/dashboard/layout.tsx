import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, resolveOrganization } from '@/lib/session';
import { listOrganizations } from '@/server/services/organization.service';
import { incidentRepository } from '@/server/repositories/incident.repository';
import { OrganizationSwitcher } from '@/components/dashboard/org-switcher';
import { DashboardNav } from '@/components/dashboard/nav';
import { logoutAction } from '@/app/(auth)/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect('/login?callbackUrl=/dashboard');

  const organizations = await listOrganizations(user.id);
  if (organizations.length === 0) redirect('/register');

  const organization = await resolveOrganization(user.id);
  const openIncidents = await incidentRepository.count(organization.id, { open: true });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900/40 p-4 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-1 text-base font-semibold text-white">
          <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-xs">A</span>
          ARCH
        </Link>
        <DashboardNav openIncidents={openIncidents} />
        <div className="mt-auto space-y-3 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <p>
            Signed in as
            <br />
            <span className="text-slate-300">{user.email}</span>
          </p>
          <form action={logoutAction}>
            <button type="submit" className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-200 lg:hidden">ARCH</span>
            <OrganizationSwitcher
              organizations={organizations.map((organization) => ({ id: organization.id, name: organization.name, role: organization.role }))}
              current={organization.id}
            />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-500" href="/dashboard/incidents/new">
              Declare incident
            </Link>
            <Link className="text-slate-400 hover:text-slate-200" href={`/status/${organization.slug}`} prefetch={false}>
              Status page
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
