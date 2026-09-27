import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { listRepoConnections } from '@/server/services/repo.service';
import { describeGithubConfig } from '@/server/services/github.service';
import { roleHasPermission } from '@/lib/permissions';
import { timeAgo } from '@/lib/format';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui';
import { ConnectRepoForm, RepoConnectionsList } from '@/components/dashboard/repo-connections';
import { GithubConnectionPanel } from '@/components/dashboard/github-connection';
import { RepoInsight } from '@/components/dashboard/repo-insight';

export const metadata: Metadata = { title: 'Repositories' };
export const dynamic = 'force-dynamic';

export default async function ReposPage() {
  const { user, organization } = await requireDashboardContext();

  const canManage = roleHasPermission(organization.role, 'repo.manage');
  const github = describeGithubConfig();
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
        description="Connect a GitHub repo. Insight only reads (explain, security, how-tos). Verified Fix may open a draft PR after a human approves — Insight never will."
      />

      <Card>
        <CardHeader title="Connected repositories" description={`${views.length} repo${views.length === 1 ? '' : 's'} · RBAC enforced: OWNER/ADMIN manage, all roles read.`} />
        <CardBody className="space-y-4">
          <RepoConnectionsList connections={views} />
          {canManage ? (
            <ConnectRepoForm />
          ) : (
            <p className="text-sm text-slate-400">Only OWNER/ADMIN can connect repositories.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Repo Insight (read-only)"
          description="Ask how to make the repo private, where secrets might be, or what the tree looks like. ARCH will not push, branch, or add features."
        />
        <CardBody>
          <RepoInsight repos={views.filter((row) => row.isActive).map((row) => ({ id: row.id, fullName: row.fullName }))} />
        </CardBody>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader
            title="GitHub token"
            description="Approve & create PR pushes to GitHub only when a token is configured. Test it here, before an approval is the first thing that touches the network."
          />
          <CardBody>
            <GithubConnectionPanel config={github} />
          </CardBody>
        </Card>
      ) : null}

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
