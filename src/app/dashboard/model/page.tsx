import type { Metadata } from 'next';
import { requireDashboardContext } from '@/lib/session';
import { roleHasPermission } from '@/lib/permissions';
import { formatDateTime, timeAgo } from '@/lib/format';
import { CATEGORIES, type CategoryId } from '@/server/ai/arch-model/knowledge';
import { formatDuration } from '@/server/ai/arch-model/text';
import { getModelStatus, type VersionSummary } from '@/server/services/archModel.service';
import { feedbackSummary } from '@/server/services/modelLearning.service';
import { listKnowledgeSources } from '@/server/services/knowledge.service';
import { Alert, Badge, Card, CardBody, CardHeader, DefinitionList, PageHeader } from '@/components/ui';
import { ButtonLink } from '@/components/ui/button';
import { ActionForm } from '@/components/dashboard/action-form';
import { RefreshWhile } from '@/components/dashboard/refresh-while';
import { activateModelVersionAction, rollbackModelAction, trainModelAction } from '@/app/dashboard/actions';

export const metadata: Metadata = { title: 'ARCH V1.1' };
export const dynamic = 'force-dynamic';

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

function Code({ children }: { children: string }) {
  return <pre className="arch-mono overflow-x-auto rounded-lg border border-white/[0.07] bg-abyss-950/80 p-3 text-xs leading-relaxed text-slate-300">{children}</pre>;
}

const STATUS_TONE: Record<VersionSummary['status'], 'success' | 'neutral' | 'danger'> = {
  ACTIVE: 'success',
  SUPERSEDED: 'neutral',
  REJECTED: 'danger',
};

const STATUS_HINT: Record<VersionSummary['status'], string> = {
  ACTIVE: 'serving now',
  SUPERSEDED: 'was active',
  REJECTED: 'lost evaluation',
};

function VersionRegistry({ versions, activeVersionId, canManage }: { versions: VersionSummary[]; activeVersionId: string | null; canManage: boolean }) {
  if (versions.length === 0) {
    return <p className="text-sm text-slate-400">No training runs yet. The first trained model becomes active automatically.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3 font-medium">Version</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Trained</th>
            <th className="py-2 pr-3 font-medium">Trigger</th>
            <th className="py-2 pr-3 font-medium">Docs</th>
            <th className="py-2 pr-3 font-medium">Severity / category</th>
            <th className="py-2 font-medium">Evaluation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]/70">
          {versions.map((version) => (
            <tr key={version.id} className="align-top text-slate-300">
              <td className="py-2 pr-3 font-medium">v{version.version}</td>
              <td className="py-2 pr-3">
                <Badge tone={STATUS_TONE[version.status]}>{version.status.toLowerCase()}</Badge>
                <p className="mt-1 text-xs text-slate-500">{STATUS_HINT[version.status]}</p>
              </td>
              <td className="py-2 pr-3 text-xs text-slate-400">{timeAgo(new Date(version.trainedAt))}</td>
              <td className="py-2 pr-3 text-xs text-slate-400">{version.trigger}</td>
              <td className="py-2 pr-3 text-xs text-slate-400">
                {version.teamDocuments} team
                <br />
                <span className="text-slate-500">{version.totalDocuments} total</span>
              </td>
              <td className="py-2 pr-3 text-xs text-slate-400">
                {pct(version.severityAccuracy)} / {pct(version.categoryAccuracy)}
              </td>
              <td className="py-2 text-xs text-slate-400">
                {version.reason || `score ${version.score}`}
                {canManage && version.id !== activeVersionId ? (
                  <ActionForm action={activateModelVersionAction} submitLabel="Activate" variant="secondary" inline className="mt-1">
                    <input type="hidden" name="versionId" value={version.id} />
                  </ActionForm>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ModelPage() {
  const { user, organization } = await requireDashboardContext();
  const status = await getModelStatus({ organizationId: organization.id, userId: user.id });
  const canTrain = roleHasPermission(organization.role, 'copilot.train');
  const { model, config, jobs } = status;
  const metrics = model.metrics;
  const severityCounts = Object.entries(metrics.team.severityCounts);
  const jobInProgress = jobs.open > 0;
  const lastJob = jobs.last;
  const drift = status.drift;

  // V6 — what the model is learning beyond resolved incidents: human corrections and the
  // knowledge base ARCH V1.1 cites. Both are best-effort so the page never fails on them.
  const [feedback, knowledgeSources] = await Promise.all([
    feedbackSummary(organization.id).catch(() => null),
    listKnowledgeSources({ organizationId: organization.id, userId: user.id }).catch(() => []),
  ]);
  const knowledgeChunks = knowledgeSources.reduce((sum, source) => sum + source.chunkCount, 0);
  const corrections = feedback ? (feedback.byKind.SEVERITY_CORRECTED ?? 0) + (feedback.byKind.CATEGORY_CORRECTED ?? 0) : 0;

  return (
    <div className="animate-rise space-y-6">
      <RefreshWhile active={jobInProgress} />
      {drift ? (
        <Alert tone="info">
          Version {drift.version} regressed on {drift.metric === 'severityAccuracy' ? 'severity' : 'category'} accuracy:{' '}
          {pct(drift.previous)} → {pct(drift.current)} ({pct(drift.drop)} drop, detected{' '}
          {timeAgo(new Date(drift.detectedAt))}). It was kept in the registry but never promoted — retrain with more
          data, or roll back to the previous version below.
        </Alert>
      ) : null}
      <PageHeader
        eyebrow="Intelligence"
        title="ARCH V1.1"
        description="ARCH's own AI, trained on this workspace's incidents. It runs on your server: no OpenAI, no Anthropic, no GPU bill."
        action={<ButtonLink href="/dashboard/chat" variant="ai" size="sm">Chat with ARCH</ButtonLink>}
      />

      <Card>
        <CardHeader
          title="Privacy"
          description="Where ARCH V1.1 and Code Assist run."
          action={config.onPremise ? <Badge tone="success">on-premise · no data leaves</Badge> : <Badge tone="danger">external</Badge>}
        />
        <CardBody>
          {!config.enabled ? <Alert tone="error">ARCH V1.1 is disabled: {config.reason}</Alert> : null}
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
                { label: 'Code-fix knowledge', value: metrics.documents.code ? `${metrics.documents.code} real bug fixes` : 'not loaded' },
                { label: 'Code-review knowledge', value: metrics.documents.review ? `${metrics.documents.review} review comments` : 'not loaded' },
                { label: 'Vocabulary', value: `${metrics.vocabularySize.toLocaleString('en-US')} terms` },
                { label: 'Last trained', value: model.trainedAt ? formatDateTime(new Date(model.trainedAt)) : '—' },
                {
                  label: 'Auto-retrain',
                  value: status.retrainMinutes ? `every ${status.retrainMinutes} min when new incidents are resolved (npm run worker)` : 'off',
                },
              ]}
            />
            {jobInProgress ? (
              <Alert tone="info">Training job {jobs.open === 1 ? 'is' : 's are'} running in the background — this page refreshes automatically until it finishes.</Alert>
            ) : lastJob ? (
              lastJob.status === 'FAILED' ? (
                <Alert tone="error">Last training job failed: {lastJob.error ?? 'unknown error'}</Alert>
              ) : lastJob.status === 'COMPLETED' && lastJob.finishedAt ? (
                <p className="text-xs text-slate-500">Last training job completed {timeAgo(lastJob.finishedAt)}.</p>
              ) : null
            ) : null}
            {canTrain ? (
              <div className="space-y-2">
                <ActionForm action={trainModelAction} submitLabel={model.trained ? 'Retrain now' : 'Train on our incidents'} pendingLabel="Queueing…" />
                <p className="text-xs text-slate-500">
                  Retraining runs as a background job: queue → train → evaluate → promote only if the new model beats the current one. Nothing is applied in the
                  web request.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Only OWNER or ADMIN can retrain the model.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Learning & knowledge"
            description="What the model is learning from besides resolved incidents — your corrections and your own docs."
            action={
              feedback && feedback.total > 0 ? (
                <Badge tone="neutral">{feedback.total} feedback signals</Badge>
              ) : (
                <Badge tone="neutral">no feedback yet</Badge>
              )
            }
          />
          <CardBody className="space-y-4">
            <DefinitionList
              items={[
                { label: 'Drafts approved', value: String(feedback?.byKind.DRAFT_APPROVED ?? 0) },
                { label: 'Drafts edited', value: String(feedback?.byKind.DRAFT_EDITED ?? 0) },
                { label: 'Drafts dismissed', value: String(feedback?.byKind.DRAFT_DISMISSED ?? 0) },
                {
                  label: 'Corrections',
                  value: `${corrections} (severity + category — these train at 3× weight)`,
                },
                {
                  label: 'Knowledge base',
                  value:
                    knowledgeSources.length === 0 ? (
                      <span className="text-amber-300">empty — ARCH V1.1 has nothing to cite yet</span>
                    ) : (
                      `${knowledgeSources.length} source${knowledgeSources.length === 1 ? '' : 's'} · ${knowledgeChunks} retrievable chunk${knowledgeChunks === 1 ? '' : 's'}`
                    ),
                },
                {
                  label: 'Severity calibration',
                  value:
                    metrics.severity.calibration && metrics.severity.calibration.holdoutSize > 0
                      ? `temperature ${metrics.severity.calibration.temperature.toFixed(2)} — reported confidence now matches measured accuracy`
                      : 'not fitted yet (needs ≥10 held-out incidents)',
                },
              ]}
            />
            <p className="text-xs text-slate-500">
              Approving a draft tells the model it was right; editing or dismissing one tells it what was wrong. Both
              are folded in on the next training run, and corrections count three times as much — that is how a
              workspace converges on its own severity scale.
            </p>
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

      <Card>
        <CardHeader
          title="Model registry"
          description="Every training run is kept. A new version serves only if it beats the active one; anything older can be reactivated (rollback). Every activation is written to the audit log."
          action={
            canTrain && status.versions.some((version) => version.status === 'SUPERSEDED') ? (
              <ActionForm action={rollbackModelAction} submitLabel="Roll back to previous" variant="secondary" inline />
            ) : undefined
          }
        />
        <CardBody>
          <VersionRegistry versions={status.versions} activeVersionId={model.activeVersionId} canManage={canTrain} />
        </CardBody>
      </Card>

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
          <CardHeader title="More training data" description="Teach the model how the industry fails — postmortems, real bug fixes and human code reviews." />
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-400">
              {status.publicCorpus.available
                ? `${status.publicCorpus.documents} public postmortems are loaded from ${status.publicCorpus.file}.`
                : 'Download public postmortems (danluu/post-mortems, awesome-postmortem, icco/postmortems, Kubernetes failure stories) to this server:'}
            </p>
            <Code>{`npm run model:fetch-public   # postmortems → ${status.publicCorpus.file}`}</Code>
            <p className="text-sm text-slate-400">
              {status.codeCorpus.available
                ? `${status.codeCorpus.documents} real bug-fix cases are loaded (SWE-bench, ManySStuBs4J).`
                : 'Download real bug-fix knowledge (SWE-bench Verified · MIT, ManySStuBs4J · Apache-2.0) for code-fix suggestions:'}
            </p>
            <Code>{`npm run model:fetch-code     # stack trace → patch knowledge`}</Code>
            <p className="text-sm text-slate-400">
              {status.reviewCorpus.available
                ? `${status.reviewCorpus.documents} code-review examples are loaded (github-codereview, CodeReviewer).`
                : 'Download human code-review knowledge (github-codereview · MIT, Microsoft CodeReviewer · Apache-2.0) for Code Assist:'}
            </p>
            <Code>{`npm run model:fetch-review   # review comment ↔ code-change pairs`}</Code>
            <p className="text-xs text-slate-500">
              Downloads run on your server into a git-ignored folder; nothing third-party is committed or redistributed — ARCH keeps short snippets and source
              links only. Licenses: docs/legal/TRAINING-DATA-LICENSES.md. Then retrain above.
            </p>
            <p className="text-sm text-slate-400">Want to fine-tune the local LLM on your incidents? Export a training set:</p>
            <Code>{`npm run model:export-finetune -- --org <organization-slug>`}</Code>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
