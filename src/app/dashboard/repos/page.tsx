import type { Metadata } from 'next';
import { requireUser, resolveOrganization } from '@/lib/session';
import { listRepoConnections } from '@/server/services/repo.service';
import { roleHasPermission } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui';
import { ConnectRepoForm, RepoConnectionsList } from '@/components/dashboard/repo-connections';

export const metadata: Metadata = { title: 'Repositories' };
export const dynamic = 'force-dynamic';

export default async function ReposPage() {
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);

  const canManage = roleHasPermission(organization.role, 'repo.manage');
  const connections = await listRepoConnections({ organizationId: organization.id, userId: user.id, includeInactive: true }).catch(() => []);

  const views = connections.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    owner: c.owner,
    repo: c.repo,
    defaultBranch: c.defaultBranch,
    pinnedCommitSha: c.pinnedCommitSha,
    isActive: c.isActive,
    createdAgo: timeAgo(c.createdAt),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="GitHub Repositories"
        description="M1: GitHub repo connect + org permission + commit pinning. Connected repos are used for Verified Fix Loop (repo@commit checkout)."
      />

      <Card>
        <CardHeader title="Connected repositories" description={`${views.length} repo${views.length === 1 ? '' : 's'} · RBAC enforced: OWNER/ADMIN manage, all roles read.`} />
        <CardBody className="space-y-4">
          <RepoConnectionsList connections={views} />
          {canManage ? <ConnectRepoForm /> : <p className="text-sm text-slate-400">Only OWNER/ADMIN can connect repositories.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How Verified Fix Loop uses repos" description="M1 → M2 → M3 → M4 → M5" />
        <CardBody>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>
              <strong>M1:</strong> Connect GitHub repo (this page). RBAC enforced, commit pinned (repo@commit).
            </li>
            <li>
              <strong>M2:</strong> Incident + stack trace + code context → proposed patch (never auto-apply). Generated in incident page.
            </li>
            <li>
              <strong>M3:</strong> Isolated sandbox me patch + tests chalao — no prod credentials, temporary container, timeout.
            </li>
            <li>
              <strong>M4:</strong> UI shows diff + test results + evidence bundle → human approve → PR create → audit log.
            </li>
            <li>
              <strong>M5:</strong> Safeguards: unsafe fix detection, timeout, sandbox escape prevention, regression suite.
            </li>
          </ol>
          <p className="mt-4 text-xs text-slate-500">
            Why unique: incident.io/Rootly sirf diagnose karte hain ya bina test ke PR draft karte hain. ARCH ka promise: "Fix tested against your code, with proof" — evidence bundle ke saath.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
