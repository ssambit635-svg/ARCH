import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { copilotConfig } from '@/server/ai/provider';
import { Alert, PageHeader } from '@/components/ui';
import { CodeAssist } from '@/components/code/code-assist';

export const metadata: Metadata = { title: 'Code Assist' };
export const dynamic = 'force-dynamic';

export default async function CodeAssistPage() {
  const { user, organization } = await requireDashboardContext();
  const canUse = roleHasPermission(organization.role, 'copilot.generate');
  const config = copilotConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Code Assist"
        description="Review, fix, or explain code — or use Thinker for a small boilerplate snippet plus file path and paste-risks. Native ARCH model, this server. Not a coding agent."
      />
      {!canUse ? <Alert tone="info">Your role ({organization.role}) can read incidents but cannot use Code Assist. RESPONDER or above is required.</Alert> : null}
      {!config.enabled ? <Alert tone="error">Code Assist is not available: {config.reason}</Alert> : null}
      <CodeAssist canUse={canUse && config.enabled} engineLabel={config.model} />
    </div>
  );
}
