import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/lib/env';
import { writeAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import type { Prisma } from '@/generated/prisma/client';
import { extractCausalSentences, extractMitigationSentences } from '../ai/arch-model/engine';
import { CATEGORY_IDS, type CategoryId } from '../ai/arch-model/knowledge';
import { baseArchModel, loadArchModel, type ArchModelRuntime } from '../ai/arch-model/runtime';
import { clip } from '../ai/arch-model/text';
import {
  ARCH_MODEL_FORMAT,
  decidePromotion,
  modelScore,
  trainArchModel,
  type ArchModelArtifact,
  type ArchModelMetrics,
  type TrainingDoc,
} from '../ai/arch-model/train';
import { redact } from '../ai/guardrails';
import { checkLocalLlm, isLocalEndpoint, type LocalLlmHealth } from '../ai/local-llm';
import { copilotConfig, localLlmConfig } from '../ai/provider';
import { archModelRepository } from '../repositories/archModel.repository';

/**
 * ARCH Model service — trains, registers, promotes and serves each organization's own model.
 *
 * Training set for organization X =
 *     built-in pattern library (original ARCH content, always)
 *   + public postmortems, if an operator downloaded them (npm run model:fetch-public)
 *   + code-fix knowledge (SWE-bench, ManySStuBs4J — npm run model:fetch-code)
 *   + code-review knowledge (github-codereview, CodeReviewer — npm run model:fetch-review)
 *   + X's resolved incidents: redacted title + timeline notes, final severity as the label,
 *     root cause / action items from human-approved postmortems.
 *
 * Organization Y's incidents are never part of X's model (tenant isolation, AGENTS.md §5).
 *
 * V3 lifecycle: a retrain is a BACKGROUND JOB (never inside a web request). The worker trains a
 * candidate, scores it against the active model, and promotes it only if it beats it; every run
 * is kept in the registry (arch_model_versions) and admins can roll back to any earlier version.
 * Every train/promote/rollback writes an audit entry, so the audit log shows which version was
 * serving at any point in time.
 */

export const MAX_TRAINING_INCIDENTS = 2_000;
export const TRAIN_RATE_LIMIT = { limit: 10, windowMs: 60 * 60_000 };
export const MAX_VERSIONS_IN_STATUS = 25;
/** Shared external corpora are capped so one large download cannot drown the team's own signal. */
export const MAX_PUBLIC_DOCS = 2_000;
export const MAX_CODE_DOCS = 1_000;
export const MAX_REVIEW_DOCS = 1_000;

// ---------------------------------------------------------------------------------------------
// External corpora (optional, read from disk; downloaded by scripts/arch-model/fetch-*.mjs)
// ---------------------------------------------------------------------------------------------

type CorpusCache = { file: string; mtimeMs: number; docs: TrainingDoc[] };
let publicCache: CorpusCache | null = null;
let codeCache: CorpusCache | null = null;
let reviewCache: CorpusCache | null = null;

export function publicDataFile(): string {
  return path.resolve(env.ARCH_MODEL_DATA_DIR, 'public-incidents.jsonl');
}

export function codeDataFile(): string {
  return path.resolve(env.ARCH_MODEL_DATA_DIR, 'code-corpus.jsonl');
}

export function reviewDataFile(): string {
  return path.resolve(env.ARCH_MODEL_DATA_DIR, 'review-corpus.jsonl');
}

type CorpusRow = {
  id?: string;
  source?: string;
  license?: string;
  company?: string;
  url?: string;
  title?: string;
  text?: string;
  category?: string | null;
  rootCause?: string;
  mitigation?: unknown;
  prevention?: unknown;
  language?: string;
};

/** Parse one JSONL corpus file into training docs; a malformed line never stops training. */
function readCorpusFile(file: string, source: 'public' | 'code' | 'review', cap: number): TrainingDoc[] {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }

  const docs: TrainingDoc[] = [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (docs.length >= cap || !line.trim()) return;
    try {
      const row = JSON.parse(line) as CorpusRow;
      if (!row.text || row.text.length < 30) return;
      const category = row.category && (CATEGORY_IDS as string[]).includes(row.category) ? (row.category as CategoryId) : null;
      const mitigation = Array.isArray(row.mitigation)
        ? (row.mitigation as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 4).map((item) => clip(item, 240))
        : [];
      const prevention = Array.isArray(row.prevention)
        ? (row.prevention as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 4).map((item) => clip(item, 240))
        : [];
      const doc: TrainingDoc = {
        id: `${source}:${row.id ?? index}`,
        source,
        title: row.title ? clip(row.title, 160) : `${row.company ?? source}: ${clip(row.text, 90)}`,
        text: clip(row.text, 1_200),
      };
      if (category) doc.category = category;
      if (row.url) doc.url = row.url;
      if (row.company) doc.company = row.company;
      if (row.rootCause) doc.rootCause = clip(row.rootCause, 400);
      if (mitigation.length) doc.mitigation = mitigation;
      if (prevention.length) doc.prevention = prevention;
      docs.push(doc);
    } catch {
      // Skip malformed lines.
    }
  });
  return docs;
}

function cachedCorpus(cache: CorpusCache | null, file: string, load: () => TrainingDoc[]): TrainingDoc[] {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }
  if (cache && cache.file === file && cache.mtimeMs === stat.mtimeMs) return cache.docs;
  return load();
}

/** Rows written by scripts/arch-model/fetch-public-incidents.mjs. Missing file → no public docs. */
export function loadPublicDocs(file = publicDataFile()): TrainingDoc[] {
  const docs = cachedCorpus(publicCache, file, () => readCorpusFile(file, 'public', MAX_PUBLIC_DOCS));
  publicCache = { file, mtimeMs: safeMtimeMs(file), docs };
  return docs;
}

/** Rows written by scripts/arch-model/fetch-code-corpus.mjs (SWE-bench, ManySStuBs4J). */
export function loadCodeDocs(file = codeDataFile()): TrainingDoc[] {
  const docs = cachedCorpus(codeCache, file, () => readCorpusFile(file, 'code', MAX_CODE_DOCS));
  codeCache = { file, mtimeMs: safeMtimeMs(file), docs };
  return docs;
}

/** Rows written by scripts/arch-model/fetch-review-corpus.mjs (github-codereview, CodeReviewer). */
export function loadReviewDocs(file = reviewDataFile()): TrainingDoc[] {
  const docs = cachedCorpus(reviewCache, file, () => readCorpusFile(file, 'review', MAX_REVIEW_DOCS));
  reviewCache = { file, mtimeMs: safeMtimeMs(file), docs };
  return docs;
}

function safeMtimeMs(file: string): number {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

/** Fill defaults into metrics stored before the code/review corpora existed. */
export function normalizeMetrics(raw: unknown): ArchModelMetrics {
  const metrics = (raw ?? {}) as Partial<ArchModelMetrics>;
  const documents: Partial<ArchModelMetrics['documents']> = metrics.documents ?? {};
  return {
    documents: {
      team: documents.team ?? 0,
      pattern: documents.pattern ?? 0,
      public: documents.public ?? 0,
      code: documents.code ?? 0,
      review: documents.review ?? 0,
    },
    severity: metrics.severity ?? { trainedOn: 0, holdoutAccuracy: null, holdoutSize: 0, baseline: null },
    category: metrics.category ?? { trainedOn: 0, holdoutAccuracy: null, holdoutSize: 0 },
    team: metrics.team ?? { severityCounts: {}, medianResolveMinutes: {}, topCategories: [] },
    vocabularySize: metrics.vocabularySize ?? 0,
    trainingMs: metrics.trainingMs ?? 0,
  };
}

// ---------------------------------------------------------------------------------------------
// Team documents
// ---------------------------------------------------------------------------------------------

type TrainingIncident = Awaited<ReturnType<typeof archModelRepository.listResolvedIncidentsForTraining>>[number];

function isCopilotEvent(metadata: unknown): boolean {
  return Boolean(metadata && typeof metadata === 'object' && (metadata as Record<string, unknown>).source === 'copilot');
}

export function incidentToTrainingDoc(incident: TrainingIncident, approvedPostmortem?: { rootCause?: unknown; actionItems?: unknown }): TrainingDoc {
  // Human-written notes only: approved Copilot drafts are excluded so the model learns from the
  // team, not from its own previous output.
  const notes = incident.events
    .filter((event) => event.body?.trim() && !isCopilotEvent(event.metadata))
    .map((event) => redact(event.body!.trim()));
  const title = redact(incident.title);
  const text = clip([title, incident.service?.name ?? '', ...notes].filter(Boolean).join('. '), 4_000);

  const approvedCause = typeof approvedPostmortem?.rootCause === 'string' && !/^not yet confirmed/i.test(approvedPostmortem.rootCause) ? redact(approvedPostmortem.rootCause) : null;
  const rootCause = approvedCause ?? extractCausalSentences(notes, 2).join(' ');
  const mitigation = extractMitigationSentences(notes, 3);
  const prevention = Array.isArray(approvedPostmortem?.actionItems)
    ? (approvedPostmortem.actionItems as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 4).map((item) => redact(item))
    : [];

  const doc: TrainingDoc = {
    id: `team:${incident.id}`,
    source: 'team',
    title: clip(title, 160),
    text,
    severity: incident.severity,
    service: incident.service?.name ?? null,
    occurredAt: incident.startedAt.toISOString().slice(0, 10),
  };
  if (rootCause) doc.rootCause = rootCause;
  if (mitigation.length) doc.mitigation = mitigation;
  if (prevention.length) doc.prevention = prevention;
  if (incident.resolvedAt) doc.resolvedMinutes = Math.max(0, Math.round((incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 60_000));
  return doc;
}

// ---------------------------------------------------------------------------------------------
// Training — train → evaluate → promote only if it beats the active model
// ---------------------------------------------------------------------------------------------

export type TrainTrigger = 'manual' | 'scheduled' | 'cli';

export type TrainingRunResult = {
  versionId: string;
  version: number;
  /** True when this run became the model serving the organization. */
  promoted: boolean;
  reason: string;
  score: number;
  /** Version number of the model now serving (the candidate's when promoted). */
  activeVersion: number;
  trainedAt: Date;
  teamDocuments: number;
  totalDocuments: number;
  metrics: ArchModelMetrics;
};

/** Assemble the organization's training corpus (tenant-scoped team data + shared read-only corpora). */
export async function buildTrainingCorpus(organizationId: string): Promise<TrainingDoc[]> {
  const incidents = await archModelRepository.listResolvedIncidentsForTraining(organizationId, MAX_TRAINING_INCIDENTS);
  const postmortems = await archModelRepository.listApprovedPostmortems(
    organizationId,
    incidents.map((incident) => incident.id),
  );
  const postmortemByIncident = new Map<string, { rootCause?: unknown; actionItems?: unknown }>();
  for (const row of postmortems) if (!postmortemByIncident.has(row.incidentId)) postmortemByIncident.set(row.incidentId, row.output as Record<string, unknown>);

  const teamDocs = incidents.map((incident) => incidentToTrainingDoc(incident, postmortemByIncident.get(incident.id)));
  return [...loadPublicDocs(), ...loadCodeDocs(), ...loadReviewDocs(), ...teamDocs];
}

/**
 * One full training run for one organization: train a candidate, score it, register the version,
 * promote it only when it beats the active model. No permission check — callers do that.
 */
export async function trainOrganizationModel(organizationId: string, options: { actorId?: string | null; trigger?: TrainTrigger } = {}): Promise<TrainingRunResult> {
  const trigger = options.trigger ?? 'manual';
  const docs = await buildTrainingCorpus(organizationId);
  const artifact = trainArchModel(docs);

  const incumbent = await archModelRepository.findActiveVersion(organizationId);
  const decision = decidePromotion(
    { metrics: artifact.metrics, teamDocuments: artifact.metrics.documents.team, totalDocuments: artifact.docs.length },
    incumbent ? { version: incumbent.version, score: modelScore(normalizeMetrics(incumbent.metrics)), teamDocuments: incumbent.teamDocuments } : null,
  );

  const version = await archModelRepository.nextVersionNumber(organizationId);
  const evaluation = {
    score: decision.score,
    promoted: decision.promote,
    reason: decision.reason,
    ...(incumbent ? { incumbentVersion: incumbent.version, incumbentScore: modelScore(normalizeMetrics(incumbent.metrics)) } : {}),
  };
  const saved = await archModelRepository.createVersion({
    organizationId,
    version,
    status: decision.promote ? 'ACTIVE' : 'REJECTED',
    name: artifact.name,
    format: ARCH_MODEL_FORMAT,
    trainedAt: new Date(artifact.trainedAt),
    teamDocuments: artifact.metrics.documents.team,
    totalDocuments: artifact.docs.length,
    metrics: artifact.metrics as unknown as Prisma.InputJsonValue,
    artifact: artifact as unknown as Prisma.InputJsonValue,
    evaluation: evaluation as unknown as Prisma.InputJsonValue,
    trigger,
    trainedById: options.actorId ?? null,
  });

  if (decision.promote) {
    // `incumbent` was captured BEFORE the new version row existed, so superseding it cannot
    // accidentally pick the just-created ACTIVE row.
    await activateVersionArtifact(organizationId, saved.id, artifact, saved.version, options.actorId ?? null, incumbent?.id ?? null);
  }

  await writeAudit({
    organizationId,
    actorId: options.actorId ?? null,
    actorLabel: options.actorId ? null : 'system:arch-model',
    action: 'arch_model.train',
    entityType: 'arch_model',
    entityId: saved.id,
    metadata: {
      version: saved.version,
      versionId: saved.id,
      trigger,
      promoted: decision.promote,
      reason: decision.reason,
      score: decision.score,
      ...(incumbent ? { previousVersion: incumbent.version, previousScore: evaluation.incumbentScore } : {}),
      teamDocuments: saved.teamDocuments,
      totalDocuments: saved.totalDocuments,
      severityAccuracy: artifact.metrics.severity.holdoutAccuracy,
      categoryAccuracy: artifact.metrics.category.holdoutAccuracy,
      trainingMs: artifact.metrics.trainingMs,
    },
  });

  return {
    versionId: saved.id,
    version: saved.version,
    promoted: decision.promote,
    reason: decision.reason,
    score: decision.score,
    activeVersion: decision.promote ? saved.version : (incumbent?.version ?? saved.version),
    trainedAt: saved.trainedAt,
    teamDocuments: saved.teamDocuments,
    totalDocuments: saved.totalDocuments,
    metrics: artifact.metrics,
  };
}

/**
 * Point the organization's active model at a registry version's artifact and refresh the cache.
 * `supersedeVersionId` is the registry row that was active before this activation (captured by
 * the caller while it was still the only ACTIVE row).
 */
async function activateVersionArtifact(
  organizationId: string,
  versionId: string,
  artifact: ArchModelArtifact,
  versionNumber: number,
  trainedById: string | null,
  supersedeVersionId: string | null,
): Promise<void> {
  const saved = await archModelRepository.upsert(organizationId, {
    version: versionNumber,
    name: artifact.name,
    format: ARCH_MODEL_FORMAT,
    trainedAt: new Date(artifact.trainedAt),
    teamDocuments: artifact.metrics.documents.team,
    totalDocuments: artifact.docs.length,
    metrics: artifact.metrics as unknown as Prisma.InputJsonValue,
    artifact: artifact as unknown as Prisma.InputJsonValue,
    trainedById,
    activeVersionId: versionId,
  });
  if (supersedeVersionId && supersedeVersionId !== versionId) await archModelRepository.setVersionStatus(supersedeVersionId, 'SUPERSEDED');
  cache.set(organizationId, { version: saved.version, runtime: loadArchModel(artifact) ?? baseArchModel() });
}

// ---------------------------------------------------------------------------------------------
// Background jobs — the web request only enqueues; the worker trains (AGENTS-V2.md V3 rule 2)
// ---------------------------------------------------------------------------------------------

export type TrainJobSummary = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  trigger: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
  versionId: string | null;
};

function toJobSummary(job: {
  id: string;
  status: string;
  trigger: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
  versionId: string | null;
}): TrainJobSummary {
  return { ...job, status: job.status as TrainJobSummary['status'] };
}

/** Queue a training run. One open job per organization is enough — duplicates are folded. */
export async function enqueueModelTraining(params: { organizationId: string; userId?: string | null; trigger?: TrainTrigger }): Promise<TrainJobSummary> {
  if (await archModelRepository.hasOpenJob(params.organizationId)) {
    const open = await archModelRepository.listJobs(params.organizationId, 1);
    return toJobSummary(open[0]!);
  }
  const job = await archModelRepository.createJob({
    organizationId: params.organizationId,
    trigger: params.trigger ?? 'manual',
    requestedById: params.userId ?? null,
  });
  return toJobSummary(job);
}

/**
 * Dashboard / API entry point: OWNER or ADMIN, rate-limited per organization. Returns the queued
 * job immediately — the actual training happens in the worker, never inside the web request.
 */
export async function trainModel(params: { organizationId: string; userId: string }): Promise<TrainJobSummary> {
  await requirePermission(params.organizationId, params.userId, 'copilot.train');
  enforceRateLimit(`arch-model-train:${params.organizationId}`, TRAIN_RATE_LIMIT);
  return enqueueModelTraining({ organizationId: params.organizationId, userId: params.userId, trigger: 'manual' });
}

/** Worker entry point: claim and run queued training jobs, oldest first. */
export async function processTrainingJobs(options: { limit?: number } = {}): Promise<{ processed: number; promoted: number; rejected: number; failed: number }> {
  const limit = options.limit ?? 10;
  const result = { processed: 0, promoted: 0, rejected: 0, failed: 0 };
  while (result.processed < limit) {
    const job = await archModelRepository.findNextPendingJob();
    if (!job) break;
    const claimed = await archModelRepository.claimJob(job.id);
    if (!claimed) continue; // another worker beat us to it
    result.processed += 1;
    try {
      const run = await trainOrganizationModel(job.organizationId, { actorId: job.requestedById, trigger: (job.trigger as TrainTrigger) || 'manual' });
      await archModelRepository.completeJob(job.id, run.versionId);
      if (run.promoted) result.promoted += 1;
      else result.rejected += 1;
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[arch-model] training job ${job.id} failed for ${job.organizationId}: ${message}`);
      await archModelRepository.failJob(job.id, message).catch(() => undefined);
    }
  }
  return result;
}

/**
 * Worker entry point: enqueue a training job for every organization that resolved incidents since
 * its last training. The jobs themselves run through `processTrainingJobs` on the same tick.
 */
export async function retrainStaleModels(): Promise<{ enqueued: string[]; skipped: string[] }> {
  const organizations = await archModelRepository.listOrganizationsNeedingTraining();
  const enqueued: string[] = [];
  const skipped: string[] = [];
  for (const organizationId of organizations) {
    try {
      if (await archModelRepository.hasOpenJob(organizationId)) {
        skipped.push(organizationId);
        continue;
      }
      await enqueueModelTraining({ organizationId, trigger: 'scheduled' });
      enqueued.push(organizationId);
    } catch (error) {
      skipped.push(organizationId);
      console.error(`[arch-model] enqueue failed for ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { enqueued, skipped };
}

// ---------------------------------------------------------------------------------------------
// Registry — activate any previous version (manual promotion or rollback), fully audited
// ---------------------------------------------------------------------------------------------

export type ActivateResult = { versionId: string; version: number; previousVersion: number | null; reason: string };

/**
 * Put a specific registry version in service (OWNER/ADMIN). This is both the manual-promotion and
 * the rollback path. Cross-tenant version ids return 404 like every other scoped lookup.
 */
export async function activateModelVersion(params: { organizationId: string; userId: string; versionId: string; reason?: string }): Promise<ActivateResult> {
  await requirePermission(params.organizationId, params.userId, 'copilot.train');
  enforceRateLimit(`arch-model-train:${params.organizationId}`, TRAIN_RATE_LIMIT);

  const version = await archModelRepository.findVersion(params.organizationId, params.versionId);
  if (!version) throw AppError.notFound('Model version not found.');
  if (version.format !== ARCH_MODEL_FORMAT) throw AppError.badRequest('That model version uses an unsupported artifact format.');

  const current = await archModelRepository.findActiveVersion(params.organizationId);
  if (current?.id === version.id) throw AppError.conflict(`Version v${version.version} is already the active model.`);

  const artifact = loadArchModel(version.artifact);
  if (!artifact) throw AppError.conflict('That model version could not be loaded.');

  await archModelRepository.setVersionStatus(version.id, 'ACTIVE');
  await archModelRepository.upsert(params.organizationId, {
    version: version.version,
    name: version.name,
    format: version.format,
    trainedAt: version.trainedAt,
    teamDocuments: version.teamDocuments,
    totalDocuments: version.totalDocuments,
    metrics: version.metrics as Prisma.InputJsonValue,
    artifact: version.artifact as Prisma.InputJsonValue,
    trainedById: version.trainedById,
    activeVersionId: version.id,
  });
  if (current) await archModelRepository.setVersionStatus(current.id, 'SUPERSEDED');
  cache.set(params.organizationId, { version: version.version, runtime: artifact });

  const reason = params.reason ?? 'manual';
  await writeAudit({
    organizationId: params.organizationId,
    actorId: params.userId,
    action: 'arch_model.activate',
    entityType: 'arch_model',
    entityId: version.id,
    metadata: {
      version: version.version,
      versionId: version.id,
      fromVersion: current?.version ?? null,
      fromVersionId: current?.id ?? null,
      reason,
    },
  });

  return { versionId: version.id, version: version.version, previousVersion: current?.version ?? null, reason };
}

/** Roll back to the most recently superseded version (the model that served before the current one). */
export async function rollbackModel(params: { organizationId: string; userId: string }): Promise<ActivateResult> {
  await requirePermission(params.organizationId, params.userId, 'copilot.train');
  const previous = await archModelRepository.findLatestSupersededVersion(params.organizationId);
  if (!previous) throw AppError.badRequest('Nothing to roll back to — no earlier version was ever active.');
  return activateModelVersion({ ...params, versionId: previous.id, reason: 'rollback' });
}

// ---------------------------------------------------------------------------------------------
// Serving
// ---------------------------------------------------------------------------------------------

const cache = new Map<string, { version: number; runtime: ArchModelRuntime }>();

/**
 * The organization's trained model, or the built-in base model when it has none yet. Loading is
 * cached per process and invalidated by the row's version, so several web processes stay in sync.
 */
export async function getOrganizationModel(organizationId: string): Promise<ArchModelRuntime> {
  const summary = await archModelRepository.findSummary(organizationId);
  if (!summary || summary.format !== ARCH_MODEL_FORMAT) return baseArchModel();
  const cached = cache.get(organizationId);
  if (cached?.version === summary.version) return cached.runtime;

  const row = await archModelRepository.findWithArtifact(organizationId);
  const runtime = row ? loadArchModel(row.artifact) : null;
  if (!runtime) return baseArchModel();
  cache.set(organizationId, { version: row!.version, runtime });
  return runtime;
}

export function resetArchModelCache(): void {
  cache.clear();
  publicCache = null;
  codeCache = null;
  reviewCache = null;
}

export type VersionSummary = {
  id: string;
  version: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'REJECTED';
  trigger: string;
  trainedAt: string;
  teamDocuments: number;
  totalDocuments: number;
  score: number;
  severityAccuracy: number | null;
  categoryAccuracy: number | null;
  promoted: boolean;
  reason: string;
};

export type ModelStatus = {
  config: ReturnType<typeof copilotConfig>;
  offlineOnly: boolean;
  model: {
    trained: boolean;
    version: number | null;
    name: string;
    trainedAt: string | null;
    teamDocuments: number;
    totalDocuments: number;
    metrics: ArchModelMetrics;
    activeVersionId: string | null;
  };
  publicCorpus: { available: boolean; documents: number; file: string };
  codeCorpus: { available: boolean; documents: number; file: string };
  reviewCorpus: { available: boolean; documents: number; file: string };
  jobs: { open: number; last: TrainJobSummary | null };
  versions: VersionSummary[];
  localLlm: (LocalLlmHealth & { url: string; model: string; api: string; private: boolean }) | null;
  retrainMinutes: number;
};

function summarizeVersion(row: {
  id: string;
  version: number;
  status: string;
  trigger: string;
  trainedAt: Date;
  teamDocuments: number;
  totalDocuments: number;
  metrics: unknown;
  evaluation: unknown;
}): VersionSummary {
  const metrics = normalizeMetrics(row.metrics);
  const evaluation = (row.evaluation ?? {}) as { score?: number; promoted?: boolean; reason?: string };
  return {
    id: row.id,
    version: row.version,
    status: row.status as VersionSummary['status'],
    trigger: row.trigger,
    trainedAt: row.trainedAt.toISOString(),
    teamDocuments: row.teamDocuments,
    totalDocuments: row.totalDocuments,
    score: typeof evaluation.score === 'number' ? evaluation.score : modelScore(metrics),
    severityAccuracy: metrics.severity.holdoutAccuracy,
    categoryAccuracy: metrics.category.holdoutAccuracy,
    promoted: evaluation.promoted ?? row.status !== 'REJECTED',
    reason: evaluation.reason ?? '',
  };
}

export async function getModelStatus(params: { organizationId: string; userId: string; checkLlm?: boolean }): Promise<ModelStatus> {
  await requirePermission(params.organizationId, params.userId, 'copilot.read');
  const summary = await archModelRepository.findSummary(params.organizationId);
  const base = baseArchModel();
  const config = copilotConfig();
  const llm = localLlmConfig();
  const publicDocs = loadPublicDocs();
  const codeDocs = loadCodeDocs();
  const reviewDocs = loadReviewDocs();
  const [jobs, versions] = await Promise.all([
    archModelRepository.listJobs(params.organizationId, 5),
    archModelRepository.listVersions(params.organizationId, MAX_VERSIONS_IN_STATUS),
  ]);

  return {
    config,
    offlineOnly: env.ARCH_OFFLINE_ONLY,
    model: {
      trained: Boolean(summary),
      version: summary?.version ?? null,
      name: summary?.name ?? base.name,
      trainedAt: summary?.trainedAt.toISOString() ?? null,
      teamDocuments: summary?.teamDocuments ?? 0,
      totalDocuments: summary?.totalDocuments ?? base.artifact.docs.length,
      metrics: normalizeMetrics(summary?.metrics ?? base.artifact.metrics),
      activeVersionId: summary?.activeVersionId ?? null,
    },
    publicCorpus: { available: publicDocs.length > 0, documents: publicDocs.length, file: path.relative(process.cwd(), publicDataFile()) },
    codeCorpus: { available: codeDocs.length > 0, documents: codeDocs.length, file: path.relative(process.cwd(), codeDataFile()) },
    reviewCorpus: { available: reviewDocs.length > 0, documents: reviewDocs.length, file: path.relative(process.cwd(), reviewDataFile()) },
    jobs: {
      open: jobs.filter((job) => job.status === 'PENDING' || job.status === 'RUNNING').length,
      last: (() => {
        const last = jobs.find((job) => job.status === 'COMPLETED' || job.status === 'FAILED') ?? jobs[0];
        return last ? toJobSummary(last) : null;
      })(),
    },
    versions: versions.map(summarizeVersion),
    localLlm:
      env.AI_PROVIDER === 'arch-hybrid' || params.checkLlm
        ? { ...(await checkLocalLlm(llm)), url: llm.baseUrl, model: llm.model, api: llm.api, private: isLocalEndpoint(llm.baseUrl) }
        : null,
    retrainMinutes: env.ARCH_MODEL_RETRAIN_MINUTES,
  };
}
