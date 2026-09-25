import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/lib/env';
import { writeAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';
import type { Prisma } from '@/generated/prisma/client';
import { extractCausalSentences, extractMitigationSentences } from '../ai/arch-model/engine';
import { CATEGORY_IDS, type CategoryId } from '../ai/arch-model/knowledge';
import { baseArchModel, loadArchModel, type ArchModelRuntime } from '../ai/arch-model/runtime';
import { clip } from '../ai/arch-model/text';
import { ARCH_MODEL_FORMAT, trainArchModel, type ArchModelMetrics, type TrainingDoc } from '../ai/arch-model/train';
import { redact } from '../ai/guardrails';
import { checkLocalLlm, isLocalEndpoint, type LocalLlmHealth } from '../ai/local-llm';
import { copilotConfig, localLlmConfig } from '../ai/provider';
import { archModelRepository } from '../repositories/archModel.repository';

/**
 * ARCH Model service — trains, stores and serves each organization's own model.
 *
 * Training set for organization X =
 *     built-in pattern library (original ARCH content, always)
 *   + public postmortems, if an operator downloaded them (npm run model:fetch-public)
 *   + X's resolved incidents: redacted title + timeline notes, final severity as the label,
 *     root cause / action items from human-approved postmortems.
 *
 * Organization Y's incidents are never part of X's model (tenant isolation, AGENTS.md §5).
 */

export const MAX_TRAINING_INCIDENTS = 2_000;
export const TRAIN_RATE_LIMIT = { limit: 10, windowMs: 60 * 60_000 };

// ---------------------------------------------------------------------------------------------
// Public corpus (optional, read from disk)
// ---------------------------------------------------------------------------------------------

let publicCache: { file: string; mtimeMs: number; docs: TrainingDoc[] } | null = null;

export function publicDataFile(): string {
  return path.resolve(env.ARCH_MODEL_DATA_DIR, 'public-incidents.jsonl');
}

/** Rows written by scripts/arch-model/fetch-public-incidents.mjs. Missing file → no public docs. */
export function loadPublicDocs(file = publicDataFile()): TrainingDoc[] {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }
  if (publicCache && publicCache.file === file && publicCache.mtimeMs === stat.mtimeMs) return publicCache.docs;

  const docs: TrainingDoc[] = [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const row = JSON.parse(line) as { source?: string; company?: string; url?: string; text?: string; category?: string | null };
      if (!row.text || row.text.length < 30) return;
      const category = row.category && (CATEGORY_IDS as string[]).includes(row.category) ? (row.category as CategoryId) : null;
      docs.push({
        id: `public:${index}`,
        source: 'public',
        title: `${row.company ?? 'Public postmortem'}: ${clip(row.text, 90)}`,
        text: clip(row.text, 1_200),
        category,
        ...(row.url ? { url: row.url } : {}),
        ...(row.company ? { company: row.company } : {}),
      });
    } catch {
      // A malformed line should not stop training.
    }
  });
  publicCache = { file, mtimeMs: stat.mtimeMs, docs };
  return docs;
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
// Training
// ---------------------------------------------------------------------------------------------

export type TrainResult = { version: number; trainedAt: Date; teamDocuments: number; totalDocuments: number; metrics: ArchModelMetrics };

/** Train and store the model for one organization. No permission check — callers do that. */
export async function trainOrganizationModel(organizationId: string, options: { actorId?: string | null; reason?: string } = {}): Promise<TrainResult> {
  const incidents = await archModelRepository.listResolvedIncidentsForTraining(organizationId, MAX_TRAINING_INCIDENTS);
  const postmortems = await archModelRepository.listApprovedPostmortems(
    organizationId,
    incidents.map((incident) => incident.id),
  );
  const postmortemByIncident = new Map<string, { rootCause?: unknown; actionItems?: unknown }>();
  for (const row of postmortems) if (!postmortemByIncident.has(row.incidentId)) postmortemByIncident.set(row.incidentId, row.output as Record<string, unknown>);

  const teamDocs = incidents.map((incident) => incidentToTrainingDoc(incident, postmortemByIncident.get(incident.id)));
  const artifact = trainArchModel([...loadPublicDocs(), ...teamDocs]);

  const saved = await archModelRepository.upsert(organizationId, {
    name: artifact.name,
    format: ARCH_MODEL_FORMAT,
    trainedAt: new Date(artifact.trainedAt),
    teamDocuments: artifact.metrics.documents.team,
    totalDocuments: artifact.docs.length,
    metrics: artifact.metrics as unknown as Prisma.InputJsonValue,
    artifact: artifact as unknown as Prisma.InputJsonValue,
    trainedById: options.actorId ?? null,
  });
  cache.set(organizationId, { version: saved.version, runtime: loadArchModel(artifact) ?? baseArchModel() });

  await writeAudit({
    organizationId,
    actorId: options.actorId ?? null,
    actorLabel: options.actorId ? null : 'system:arch-model',
    action: 'arch_model.train',
    entityType: 'arch_model',
    entityId: saved.id,
    metadata: {
      version: saved.version,
      reason: options.reason ?? 'manual',
      teamDocuments: saved.teamDocuments,
      totalDocuments: saved.totalDocuments,
      severityAccuracy: artifact.metrics.severity.holdoutAccuracy,
      categoryAccuracy: artifact.metrics.category.holdoutAccuracy,
      trainingMs: artifact.metrics.trainingMs,
    },
  });

  return { version: saved.version, trainedAt: saved.trainedAt, teamDocuments: saved.teamDocuments, totalDocuments: saved.totalDocuments, metrics: artifact.metrics };
}

/** Dashboard / API entry point: OWNER or ADMIN, rate-limited per organization. */
export async function trainModel(params: { organizationId: string; userId: string }): Promise<TrainResult> {
  await requirePermission(params.organizationId, params.userId, 'copilot.train');
  enforceRateLimit(`arch-model-train:${params.organizationId}`, TRAIN_RATE_LIMIT);
  return trainOrganizationModel(params.organizationId, { actorId: params.userId, reason: 'manual' });
}

/** Worker entry point: retrain every organization with resolutions newer than its model. */
export async function retrainStaleModels(): Promise<{ trained: string[]; failed: string[] }> {
  const organizations = await archModelRepository.listOrganizationsNeedingTraining();
  const trained: string[] = [];
  const failed: string[] = [];
  for (const organizationId of organizations) {
    try {
      await trainOrganizationModel(organizationId, { reason: 'scheduled' });
      trained.push(organizationId);
    } catch (error) {
      failed.push(organizationId);
      console.error(`[arch-model] training failed for ${organizationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { trained, failed };
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
}

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
  };
  publicCorpus: { available: boolean; documents: number; file: string };
  localLlm: (LocalLlmHealth & { url: string; model: string; api: string; private: boolean }) | null;
  retrainMinutes: number;
};

export async function getModelStatus(params: { organizationId: string; userId: string; checkLlm?: boolean }): Promise<ModelStatus> {
  await requirePermission(params.organizationId, params.userId, 'copilot.read');
  const summary = await archModelRepository.findSummary(params.organizationId);
  const base = baseArchModel();
  const config = copilotConfig();
  const llm = localLlmConfig();
  const publicDocs = loadPublicDocs();

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
      metrics: (summary?.metrics as ArchModelMetrics | undefined) ?? base.artifact.metrics,
    },
    publicCorpus: { available: publicDocs.length > 0, documents: publicDocs.length, file: path.relative(process.cwd(), publicDataFile()) },
    localLlm:
      env.AI_PROVIDER === 'arch-hybrid' || params.checkLlm
        ? { ...(await checkLocalLlm(llm)), url: llm.baseUrl, model: llm.model, api: llm.api, private: isLocalEndpoint(llm.baseUrl) }
        : null,
    retrainMinutes: env.ARCH_MODEL_RETRAIN_MINUTES,
  };
}
