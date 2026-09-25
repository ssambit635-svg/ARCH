import type { Metadata } from 'next';
import { requireUser, resolveOrganization } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { formatDateTime, timeAgo } from '@/lib/format';
import { CATEGORIES, type CategoryId } from '@/server/ai/arch-model/knowledge';
import { formatDuration } from '@/server/ai/arch-model/text';
import { getModelStatus } from '@/server/services/archModel.service';
import { Alert, Badge, Card, CardBody, CardHeader, DefinitionList, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/dashboard/action-form';
import { trainModelAction } from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'ARCH Model' };
export const dynamic = 'force-dynamic';

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

function Code({ children }: { children: string }) {
  return <pre className="arch-mono overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-300">{children}</pre>;
}

export default async function ModelPage() {
  const user = await requireUser();
  const organization = await resolveOrganization(user.id);
  const status = await getModelStatus({ organizationId: organization.id, userId: user.id });
  const canTrain = roleHasPermission(organization.role, 'copilot.train');
  const { model, config } = status;
  const metrics = model.metrics;
  const severityCounts = Object.entries(metrics.team.severityCounts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ARCH Model"
        description="ARCH's own AI, trained on this workspace's incidents. It runs on your server: no OpenAI, no Anthropic, no GPU bill."
      />

      <Card>
        <CardHeader
          title="Privacy"
          description="Where Copilot and Code Assist run."
          action={config.onPremise ? <Badge tone="success">on-premise · no data leaves</Badge> : <Badge tone="danger">external</Badge>}
        />
        <CardBody>
          {!config.enabled ? <Alert tone="error">Copilot is disabled: {config.reason}</Alert> : null}
          <DefinitionList
            items={[
              { label: 'Mode', value: <span className="arch-mono">AI_PROVIDER=&quot;{config.provider}&quot;</span> },
              { label: 'Model', value: <span className="arch-mono">{config.model}</span> },
              {
                label: 'Offline lock',
                value: status.offlineOnly ? (
                  <span className="text-emerald-300">on — external AI vendors and public LLM URLs are refused</span>
                ) : (
                  <span className="text-amber-300">off — ARCH_OFFLINE_ONLY=false allows external vendors</span>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your model"
            description={model.trained ? `Version ${model.version} · trained ${timeAgo(new Date(model.trainedAt!))}` : 'Not trained yet — using the built-in base model.'}
          />
          <CardBody className="space-y-4">
            <DefinitionList
              items={[
                { label: 'Your resolved incidents', value: String(model.teamDocuments) },
                { label: 'Pattern library', value: `${metrics.documents.pattern} failure patterns (built in)` },
                { label: 'Public postmortems', value: metrics.documents.public ? String(metrics.documents.public) : 'not loaded' },
                { label: 'Vocabulary', value: `${metrics.vocabularySize.toLocaleString('en-US')} terms` },
                { label: 'Last trained', value: model.trainedAt ? formatDateTime(new Date(model.trainedAt)) : '—' },
                {
                  label: 'Auto-retrain',
                  value: status.retrainMinutes ? `every ${status.retrainMinutes} min when new incidents are resolved (npm run worker)` : 'off',
                },
              ]}
            />
            {canTrain ? (
              <ActionForm action={trainModelAction} submitLabel={model.trained ? 'Retrain now' : 'Train on our incidents'} pendingLabel="Training…" />
            ) : (
              <p className="text-xs text-slate-500">Only OWNER or ADMIN can retrain the model.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Accuracy" description="Measured on data held out from training, so it reflects unseen incidents." />
          <CardBody className="space-y-4">
            <DefinitionList
              items={[
                {
                  label: 'Severity',
                  value: metrics.severity.holdoutAccuracy !== null ? (
                    <span>
                      {pct(metrics.severity.holdoutAccuracy)} on {metrics.severity.holdoutSize} held-out incidents{' '}
                      <span className="text-slate-500">(always-the-most-common-severity baseline: {pct(metrics.severity.baseline)})</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Needs at least 10 resolved incidents to measure.</span>
                  ),
                },
                {
                  label: 'Failure category',
                  value:
                    metrics.category.holdoutAccuracy !== null ? (
                      `${pct(metrics.category.holdoutAccuracy)} on ${metrics.category.holdoutSize} held-out real postmortems (22 categories)`
                    ) : (
                      <span className="text-slate-400">Load public postmortems to measure.</span>
                    ),
                },
              ]}
            />
            {severityCounts.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">What it learned from your team</p>
                <ul className="space-y-1 text-sm text-slate-300">
                  {severityCounts.map(([severity, count]) => (
                    <li key={severity}>
                      {severity}: {count} incident{count === 1 ? '' : 's'}
                      {metrics.team.medianResolveMinutes[severity as keyof typeof metrics.team.medianResolveMinutes] !== undefined
                        ? ` · median time to resolve ${formatDuration(metrics.team.medianResolveMinutes[severity as keyof typeof metrics.team.medianResolveMinutes]!)}`
                        : ''}
                    </li>
                  ))}
                </ul>
                {metrics.team.topCategories.length ? (
                  <p className="text-sm text-slate-400">
                    Most common: {metrics.team.topCategories.map((entry) => `${CATEGORIES[entry.category as CategoryId]?.label ?? entry.category} (${entry.count})`).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Local LLM (optional)"
            description="For richer drafts and code rewrites, run an open-source model next to ARCH. The ARCH model stays as automatic fallback."
            action={
              status.localLlm ? (
                status.localLlm.reachable && status.localLlm.modelAvailable ? (
                  <Badge tone="success">connected</Badge>
                ) : status.localLlm.reachable ? (
                  <Badge tone="danger">model not pulled</Badge>
                ) : (
                  <Badge tone="danger">unreachable</Badge>
                )
              ) : (
                <Badge>not enabled</Badge>
              )
            }
          />
          <CardBody className="space-y-3">
            {status.localLlm ? (
              <DefinitionList
                items={[
                  { label: 'Server', value: <span className="arch-mono">{status.localLlm.url}</span> },
                  { label: 'Model', value: <span className="arch-mono">{status.localLlm.model}</span> },
                  { label: 'Available models', value: status.localLlm.models.length ? status.localLlm.models.join(', ') : '—' },
                ]}
              />
            ) : null}
            <p className="text-sm text-slate-400">Free, CPU-only setup (8–16 GB RAM works well with a 7B model):</p>
            <Code>{`# 1. install Ollama (https://ollama.com) or: docker compose --profile ai up -d
ollama pull qwen2.5-coder:7b          # ~4.7 GB, good at code + JSON
# smaller server? qwen2.5-coder:3b or llama3.2:3b

# 2. .env
AI_PROVIDER="arch-hybrid"
LOCAL_LLM_URL="http://127.0.0.1:11434"
LOCAL_LLM_MODEL="qwen2.5-coder:7b"`}</Code>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="More training data" description="Teach the model how the industry fails, not only your team." />
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-400">
              {status.publicCorpus.available
                ? `${status.publicCorpus.documents} public postmortems are loaded from ${status.publicCorpus.file}.`
                : 'Download ~340 public postmortems (danluu/post-mortems, icco/postmortems, Kubernetes failure stories) to this server, then retrain:'}
            </p>
            <Code>{`npm run model:fetch-public   # stored locally, git-ignored
npm run model:train          # retrain every workspace`}</Code>
            <p className="text-xs text-slate-500">
              Those corpora have no license or are GPL-3.0 — review before commercial use. ARCH keeps only short snippets and the source link.
            </p>
            <p className="text-sm text-slate-400">Want to fine-tune the local LLM on your incidents? Export a training set:</p>
            <Code>{`npm run model:export-finetune -- --org <organization-slug>`}</Code>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
