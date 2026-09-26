import { requirePermission } from '@/lib/permissions';
import { CATEGORIES } from '../ai/arch-model/knowledge';
import { getOrganizationModel } from './archModel.service';
import { incidentRepository } from '../repositories/incident.repository';
import { retrieveKnowledge } from './knowledge.service';

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
