import { requirePermission } from '@/lib/permissions';
import { getOrganizationModel } from './archModel.service';
import { changeEventRepository } from '../repositories/changeEvent.repository';
import {
  CHANGE_RISK_WINDOW_MINUTES,
  changeFeatures,
  scoreChangeRisk,
  trainChangeRisk,
  type ChangeFeatures,
  type ChangeRiskModel,
  type RiskBand,
} from '../ai/arch-model/risk';

/**
 * V6 — change risk.
 *
 * Trains a small, explainable classifier on the organization's own history (change → incident
 * within an hour on the same service) and scores today's changes with it. The point is not to block
 * deploys; it is to tell a responder which service to watch, and why.
 *
 * The model is cached per process and rebuilt at most once a minute — training is cheap (a few
 * hundred examples) but there is no reason to do it on every request.
 */

const RISK_TRAINING_DAYS = 180;
const CACHE_TTL_MS = 60_000;

type CacheEntry = { trainedAt: number; model: ChangeRiskModel | null; categories: Map<string, string> };
const cache = new Map<string, CacheEntry>();

export type ChangeRiskResult = {
  changeId: string;
  title: string;
  type: string;
  serviceName: string | null;
  author: string | null;
  occurredAt: string;
  risk: {
    probability: number;
    band: RiskBand;
    drivers: { feature: string; value: string; lift: number }[];
    fallback: boolean;
  };
};

export type ChangeRiskSummary = {
  trained: boolean;
  examples: number;
  incidents: number;
  windowMinutes: number;
  changes: ChangeRiskResult[];
};

function metadataFiles(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const files = (metadata as Record<string, unknown>).filesChanged;
  return typeof files === 'number' && Number.isFinite(files) ? files : null;
}

async function riskModel(organizationId: string): Promise<{ model: ChangeRiskModel | null; categories: Map<string, string> }> {
  const cached = cache.get(organizationId);
  if (cached && Date.now() - cached.trainedAt < CACHE_TTL_MS) return { model: cached.model, categories: cached.categories };

  const since = new Date(Date.now() - RISK_TRAINING_DAYS * 86_400_000);
  const [changes, incidents, categoryTitles] = await Promise.all([
    changeEventRepository.listForRisk(organizationId, since),
    changeEventRepository.listIncidentStarts(organizationId, since),
    changeEventRepository.categoryByService(organizationId),
  ]);

  // The failure category per service comes from the ARCH model reading that service's incident
  // titles — the same classifier the Copilot uses, so the two agree.
  const model = await getOrganizationModel(organizationId);
  const categories = new Map<string, string>();
  for (const [serviceId, titles] of categoryTitles) categories.set(serviceId, model.classifyCategory(titles).category);

  const examples = changes.map((change) => {
    const windowEnd = new Date(change.occurredAt.getTime() + CHANGE_RISK_WINDOW_MINUTES * 60_000);
    const incident = incidents.some(
      (row) => row.serviceId === change.serviceId && row.startedAt >= change.occurredAt && row.startedAt <= windowEnd,
    );
    return {
      features: changeFeatures({
        type: change.type,
        serviceName: change.service?.name ?? null,
        serviceCategory: change.serviceId ? ((categories.get(change.serviceId) as ChangeFeatures['serviceCategory']) ?? null) : null,
        author: change.author,
        occurredAt: change.occurredAt,
        filesChanged: metadataFiles(change.metadata),
        commitMessage: change.title,
      }),
      incident,
      // Balance the classes: incidents are rare, so each one counts for more.
      weight: incident ? 3 : 1,
    };
  });

  const trained = trainChangeRisk(examples);
  cache.set(organizationId, { trainedAt: Date.now(), model: trained, categories });
  return { model: trained, categories };
}

export function resetChangeRiskCache(): void {
  cache.clear();
}

/** Score one change. */
export async function scoreChange(params: {
  organizationId: string;
  userId: string;
  change: {
    id?: string;
    type: string;
    serviceId?: string | null;
    serviceName?: string | null;
    author?: string | null;
    occurredAt?: Date;
    filesChanged?: number | null;
    commitMessage: string;
  };
}): Promise<ChangeRiskResult['risk']> {
  await requirePermission(params.organizationId, params.userId, 'change.read');
  const { model, categories } = await riskModel(params.organizationId);
  const risk = scoreChangeRisk(model, {
    type: params.change.type,
    serviceName: params.change.serviceName ?? null,
    serviceCategory: params.change.serviceId ? ((categories.get(params.change.serviceId) as ChangeFeatures['serviceCategory']) ?? null) : null,
    author: params.change.author ?? null,
    occurredAt: params.change.occurredAt ?? new Date(),
    filesChanged: params.change.filesChanged ?? null,
    commitMessage: params.change.commitMessage,
  });
  return risk;
}

/**
 * The recent changes of a workspace (optionally one service), riskiest first. This is what the
 * incident form shows: "here is what changed recently on this service, and what to watch".
 */
export async function changeRiskReport(params: {
  organizationId: string;
  userId: string;
  serviceId?: string;
  take?: number;
}): Promise<ChangeRiskSummary> {
  await requirePermission(params.organizationId, params.userId, 'change.read');
  const { model, categories } = await riskModel(params.organizationId);
  const rows = await changeEventRepository.listRecent(params.organizationId, { serviceId: params.serviceId, take: params.take ?? 8 });

  const changes: ChangeRiskResult[] = rows.map((row) => ({
    changeId: row.id,
    title: row.title,
    type: row.type,
    serviceName: row.service?.name ?? null,
    author: row.author,
    occurredAt: row.occurredAt.toISOString(),
    risk: scoreChangeRisk(model, {
      type: row.type,
      serviceName: row.service?.name ?? null,
      serviceCategory: row.serviceId ? ((categories.get(row.serviceId) as ChangeFeatures['serviceCategory']) ?? null) : null,
      author: row.author,
      occurredAt: row.occurredAt,
      filesChanged: metadataFiles(row.metadata),
      commitMessage: row.title,
    }),
  }));

  return {
    trained: Boolean(model && model.examples >= 20),
    examples: model?.examples ?? 0,
    incidents: model?.incidents ?? 0,
    windowMinutes: CHANGE_RISK_WINDOW_MINUTES,
    changes: changes.sort((a, b) => b.risk.probability - a.risk.probability),
  };
}
