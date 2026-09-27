import { requirePermission } from '@/lib/permissions';
import { CATEGORIES } from '../ai/arch-model/knowledge';
import { extractCausalSentences, extractMitigationSentences } from '../ai/arch-model/engine';
import { getOrganizationModel } from './archModel.service';
import { incidentRepository } from '../repositories/incident.repository';
import { retrieveKnowledge } from './knowledge.service';
import { alertFingerprint } from './incident-fingerprint';

/**
 * V6 — insights the model can produce but nobody asked for yet.
 *
 *  1. `similarIncidents` — "have we seen this before?" Uses the same dense+sparse retrieval the
 *     Copilot uses, so a responder opening an incident immediately sees the past incidents that
 *     look like it (and what fixed them).
 *  2. `recurringReport` — which failures keep coming back, with the fix that worked last time.
 *     This is the feature that turns a pile of resolved incidents into an engineering backlog.
 *  3. `changeRisk` — which of the recent changes is most likely to page you tonight.
 *
 * All three are read-only and tenant-scoped. None of them changes anything.
 */

export type SimilarIncident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  serviceName: string | null;
  startedAt: string;
  resolvedAt: string | null;
  similarity: number;
  /** What fixed it last time, when the model knows. */
  fix: string[] | null;
  rootCause: string | null;
  source: 'your_team' | 'pattern_library' | 'public_postmortem' | 'knowledge';
};

export type SimilarIncidentsResult = {
  query: string;
  incidents: SimilarIncident[];
  /** Runbook passages that describe this failure, if the organization indexed any. */
  runbooks: { sourceName: string; heading: string | null; text: string; url: string | null; similarity: number }[];
  /** How many times this failure has happened before, per the model's retrieval. */
  seenBefore: number;
};

/** Similar incidents + runbooks for one incident (or for a free-text description). */
export async function similarIncidents(params: {
  organizationId: string;
  userId: string;
  incidentId?: string;
  query?: string;
  k?: number;
}): Promise<SimilarIncidentsResult> {
  await requirePermission(params.organizationId, params.userId, 'incident.read');

  let query = params.query?.trim() ?? '';
  if (params.incidentId) {
    const incident = await incidentRepository.findByIdWithTimeline(params.organizationId, params.incidentId);
    if (!incident) return { query: '', incidents: [], runbooks: [], seenBefore: 0 };
    query = query || [incident.title, incident.service?.name ?? '', ...incident.events.map((event) => event.body ?? '')].filter(Boolean).join('. ');
  }
  if (!query) return { query: '', incidents: [], runbooks: [], seenBefore: 0 };

  const model = await getOrganizationModel(params.organizationId);
  const excludeIds = params.incidentId ? [`team:${params.incidentId}`] : [];
  const hits = model.similarDense(query, {
    k: params.k ?? 5,
    sources: ['team', 'pattern', 'public', 'knowledge'],
    excludeIds,
    minScore: 0.15,
  });

  const teamIds = hits.filter((hit) => hit.doc.source === 'team').map((hit) => hit.doc.id.replace(/^team:/, ''));
  const rows = teamIds.length ? await incidentRepository.findByIds(params.organizationId, teamIds) : [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  const incidents: SimilarIncident[] = [];
  for (const hit of hits) {
    if (hit.doc.source !== 'team') continue;
    const row = byId.get(hit.doc.id.replace(/^team:/, ''));
    if (!row) continue;
    incidents.push({
      id: row.id,
      title: row.title,
      severity: row.severity,
      status: row.status,
      serviceName: row.service?.name ?? null,
      startedAt: row.startedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      similarity: hit.score,
      source: 'your_team',
      fix: hit.doc.mitigation?.length ? hit.doc.mitigation : null,
      rootCause: hit.doc.rootCause ?? null,
    });
  }

  let runbooks: SimilarIncidentsResult['runbooks'] = [];
  try {
    runbooks = (await retrieveKnowledge({ organizationId: params.organizationId, query, k: 3 })).map((chunk) => ({
      sourceName: chunk.sourceName,
      heading: chunk.heading,
      text: chunk.text.slice(0, 400),
      url: chunk.url ?? null,
      similarity: chunk.similarity,
    }));
  } catch {
    runbooks = [];
  }

  return { query: query.slice(0, 200), incidents, runbooks, seenBefore: incidents.length };
}

// ---------------------------------------------------------------------------------------------
// Recurring failures
// ---------------------------------------------------------------------------------------------

export type RecurringPattern = {
  category: string;
  categoryLabel: string;
  occurrences: number;
  /** Median time to resolve, in minutes, across the occurrences. */
  medianResolveMinutes: number | null;
  lastSeenAt: string;
  exampleTitles: string[];
  /** What fixed it most recently, when the model knows. */
  lastFix: string[] | null;
  /** True when this failure has happened three or more times — worth a ticket, not a page. */
  repeat: boolean;
};

/**
 * Group resolved incidents by the failure category the model predicts, so "the database pool keeps
 * exhausting" shows up as one recurring pattern instead of nine separate incidents.
 */
export async function recurringReport(params: { organizationId: string; userId: string; sinceDays?: number }): Promise<RecurringPattern[]> {
  await requirePermission(params.organizationId, params.userId, 'incident.read');
  const model = await getOrganizationModel(params.organizationId);
  const sinceDays = params.sinceDays ?? 90;
  const since = new Date(Date.now() - sinceDays * 86_400_000);

  const incidents = await incidentRepository.listResolvedSince(params.organizationId, since, 500);
  const groups = new Map<string, { rows: typeof incidents; titles: string[]; lastFix: string[] | null; lastAt: Date }>();

  for (const incident of incidents) {
    const text = [incident.title, incident.service?.name ?? '', ...incident.events.map((event) => event.body ?? '')].filter(Boolean).join('. ');
    const category = model.classifyCategory(text).category;
    const existing = groups.get(category);
    if (existing) {
      existing.rows.push(incident);
      existing.titles.push(incident.title);
      if (incident.resolvedAt && incident.resolvedAt > existing.lastAt) {
        existing.lastAt = incident.resolvedAt;
        existing.lastFix = null; // filled below from the model's retrieval
      }
    } else {
      groups.set(category, { rows: [incident], titles: [incident.title], lastFix: null, lastAt: incident.resolvedAt ?? incident.startedAt });
    }
  }

  const patterns: RecurringPattern[] = [];
  for (const [category, group] of groups) {
    const minutes = group.rows
      .map((row) => (row.resolvedAt ? Math.round((row.resolvedAt.getTime() - row.startedAt.getTime()) / 60_000) : null))
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);
    const similar = model.similarDense(group.titles.join('. '), { k: 1, sources: ['team'], minScore: 0.1 });
    patterns.push({
      category,
      categoryLabel: CATEGORIES[category as keyof typeof CATEGORIES]?.label ?? category,
      occurrences: group.rows.length,
      medianResolveMinutes: minutes.length ? minutes[Math.floor(minutes.length / 2)]! : null,
      lastSeenAt: group.lastAt.toISOString(),
      exampleTitles: [...new Set(group.titles)].slice(0, 3),
      lastFix: similar[0]?.doc.mitigation?.slice(0, 3) ?? null,
      repeat: group.rows.length >= 3,
    });
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, 12);
}

// ---------------------------------------------------------------------------------------------
// Incident correlation & dedup — V7
// -------------------------------------------------------------------------------------------------------------

export type CorrelationRepeat = {
  id: string;
  title: string;
  severity: string;
  status: string;
  serviceName: string | null;
  source: string;
  startedAt: string;
  resolvedAt: string | null;
  /** True for the incident this report was requested for. */
  current: boolean;
};

export type SharedRootCause = {
  /** Failure family the classifier sees in this incident's text. */
  category: string | null;
  categoryLabel: string | null;
  confidence: number;
  /** How strong the "same root cause" claim is. */
  evidence: 'shared_alert_signature' | 'same_failure_family' | 'none';
  fromIncidentId: string | null;
  fromIncidentTitle: string | null;
  rootCause: string | null;
  fix: string[] | null;
  note: string;
};

export type IncidentCorrelationResult = {
  incidentId: string;
  fingerprint: string;
  totalOccurrences: number;
  openOccurrences: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  repeats: CorrelationRepeat[];
  sharedRootCause: SharedRootCause;
};

/**
 * V7 — "is this a repeat?" — the correlation view of one incident.
 *
 * Two evidence levels, always labelled so nobody confuses them:
 *   1. SHARED ALERT SIGNATURE (strong): incidents whose content fingerprint matches — the same
 *      alert re-firing, possibly from a different host or with different numbers in the title.
 *      When one of those repeats is resolved and recorded a cause, that cause (and its fix) is
 *      offered as "same root cause" with a link back to the incident it came from.
 *   2. SAME FAILURE FAMILY (probable): no fingerprint twin, but the team's own history has a
 *      resolved incident of the same failure family with a recorded root cause. Labeled a
 *      hypothesis — never stated as fact.
 *
 * Read-only and tenant-scoped. Fingerprints of incidents created before V7 are computed lazily
 * and stored once, so historical incidents still join their correlation groups.
 */
export async function incidentCorrelation(params: { organizationId: string; userId: string; incidentId: string }): Promise<IncidentCorrelationResult> {
  await requirePermission(params.organizationId, params.userId, 'incident.read');

  const incident = await incidentRepository.findByIdWithTimeline(params.organizationId, params.incidentId);
  if (!incident) {
    return {
      incidentId: params.incidentId,
      fingerprint: '',
      totalOccurrences: 0,
      openOccurrences: 0,
      firstSeenAt: null,
      lastSeenAt: null,
      repeats: [],
      sharedRootCause: { category: null, categoryLabel: null, confidence: 0, evidence: 'none', fromIncidentId: null, fromIncidentTitle: null, rootCause: null, fix: null, note: 'Incident not found.' },
    };
  }

  // Legacy rows (created before fingerprints existed) are fingerprinted on first read.
  const fingerprint =
    incident.fingerprint ??
    alertFingerprint({
      source: incident.source,
      serviceKey: incident.service?.name ?? null,
      title: incident.title,
      description: incident.description,
    });
  if (!incident.fingerprint) {
    try {
      await incidentRepository.update(incident.id, { fingerprint });
    } catch {
      /* correlation is read-mostly — a failed backfill must not break the page */
    }
  }

  const rows = await incidentRepository.findByFingerprint(params.organizationId, fingerprint);
  const repeats: CorrelationRepeat[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    serviceName: row.service?.name ?? null,
    source: row.source,
    startedAt: row.startedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    current: row.id === incident.id,
  }));

  const openOccurrences = rows.filter((row) => row.status !== 'RESOLVED').length;

  // Same root cause — strong evidence first: a resolved fingerprint twin that recorded a cause.
  let shared: SharedRootCause = {
    category: null,
    categoryLabel: null,
    confidence: 0,
    evidence: 'none',
    fromIncidentId: null,
    fromIncidentTitle: null,
    rootCause: null,
    fix: null,
    note: 'No repeat of this alert signature yet — ARCH will link one the next time the same alert fires.',
  };

  const corpus = [incident.title, incident.description ?? '', ...incident.events.map((event) => event.body ?? '')].filter(Boolean).join('. ');
  let category: { category: string; confidence: number } | null = null;
  try {
    const model = await getOrganizationModel(params.organizationId);
    category = model.classifyCategory(corpus);
  } catch {
    /* classifier unavailable — correlation still works off fingerprints */
  }
  const categoryLabel = category && category.category in CATEGORIES ? CATEGORIES[category.category as keyof typeof CATEGORIES].label : null;

  const resolvedTwin = rows.find((row) => row.id !== incident.id && row.status === 'RESOLVED');
  if (resolvedTwin) {
    const twin = await incidentRepository.findByIdWithTimeline(params.organizationId, resolvedTwin.id);
    const twinTexts = (twin?.events ?? []).map((event) => event.body ?? '');
    const cause = extractCausalSentences(twinTexts)[0] ?? null;
    const fix = extractMitigationSentences(twinTexts).slice(0, 3);
    shared = {
      category: category?.category ?? null,
      categoryLabel,
      confidence: Math.max(category?.confidence ?? 0, 0.8),
      evidence: 'shared_alert_signature',
      fromIncidentId: resolvedTwin.id,
      fromIncidentTitle: resolvedTwin.title,
      rootCause: cause,
      fix: fix.length ? fix : null,
      note: cause
        ? `This alert signature was resolved before — the recorded root cause is offered as the likely cause here too. Verify before stating publicly.`
        : 'This alert signature has fired before and was resolved, but no root cause was recorded on it.',
    };
  } else if (category && category.confidence >= 0.3) {
    // Probable: a resolved incident of the same failure family with a recorded cause.
    try {
      const model = await getOrganizationModel(params.organizationId);
      const similar = model
        .similarDense(corpus, { k: 5, sources: ['team'], excludeIds: [`team:${incident.id}`], minScore: 0.12 })
        .filter((hit) => hit.doc.rootCause && (hit.doc.resolvedMinutes ?? 99999) >= 0);
      const best = similar[0];
      if (best) {
        shared = {
          category: category.category,
          categoryLabel,
          confidence: category.confidence,
          evidence: 'same_failure_family',
          fromIncidentId: best.doc.id.replace(/^team:/, ''),
          fromIncidentTitle: best.doc.title,
          rootCause: best.doc.rootCause ?? null,
          fix: best.doc.mitigation?.slice(0, 3) ?? null,
          note: `Same failure family (${(category.confidence * 100).toFixed(0)}% match) as a resolved incident — a hypothesis, not a confirmed shared root cause.`,
        };
      } else {
        shared = {
          ...shared,
          category: category.category,
          categoryLabel,
          confidence: category.confidence,
          note: `Looks like "${categoryLabel}" (${(category.confidence * 100).toFixed(0)}% confidence), but no resolved incident with a recorded cause matches yet.`,
        };
      }
    } catch {
      /* fall through to the fingerprint-only report */
    }
  }

  return {
    incidentId: incident.id,
    fingerprint,
    totalOccurrences: rows.length,
    openOccurrences,
    firstSeenAt: rows.length ? rows[rows.length - 1]!.startedAt.toISOString() : null,
    lastSeenAt: rows.length ? rows[0]!.startedAt.toISOString() : null,
    repeats,
    sharedRootCause: shared,
  };
}
