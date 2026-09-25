import type { IncidentSeverity } from '@/generated/prisma/client';
import type { CopilotContext, CopilotKnowledge, CopilotTimelineEntry, SimilarIncidentHint } from '../context';
import { LIMITS } from '../guardrails';
import type { CopilotTask } from '../provider';
import { analyzeCode, type CodeAnalysis } from '../code/analyzer';
import { CATEGORIES, type CategoryId } from './knowledge';
import { baseArchModel, type ArchModelRuntime } from './runtime';
import { clip, formatDuration, sentences } from './text';
import { SEVERITIES, type TrainingSource } from './train';

/**
 * ARCH engine — drafts every Copilot output from the incident context plus the organization's
 * trained ARCH model, with no language model at all.
 *
 * It is extractive and rule-guided on purpose: it only restates facts that are in the timeline,
 * labels hypotheses as hypotheses, and borrows fixes / action items from the most similar past
 * incidents. Output follows exactly the JSON contracts in schemas.ts, so it goes through the same
 * validation, approval and audit path as any other provider.
 */

const SOURCE_LABEL: Record<TrainingSource, SimilarIncidentHint['source']> = {
  team: 'your_team',
  pattern: 'pattern_library',
  public: 'public_postmortem',
  code: 'code_corpus',
  review: 'review_corpus',
};

function comments(context: CopilotContext): CopilotTimelineEntry[] {
  return context.timeline.filter((entry) => entry.text && (entry.type === 'COMMENT' || entry.type === 'STATUS_CHANGED' || entry.type === 'CREATED'));
}

/** The text the model reasons over: title, service, and what responders wrote. */
export function incidentCorpus(context: CopilotContext): string {
  return [context.incident.title, context.incident.affectedService ?? '', ...comments(context).map((entry) => entry.text!)].join('. ');
}

// ---------------------------------------------------------------------------------------------
// Knowledge (retrieval + classification) — computed by the service, reused by every provider
// ---------------------------------------------------------------------------------------------

export function buildKnowledge(model: ArchModelRuntime, context: CopilotContext, options: { excludeIds?: string[]; includeCodeCorpus?: boolean } = {}): CopilotKnowledge {
  // A pasted stack trace / snippet (CODE_FIX) is searched by what it MEANS ("connection refused"),
  // not by its file paths, so similar incidents match the failure rather than the incident title.
  const diagnosed = context.attachment ? analyzeCode(context.attachment.text).diagnoses.map((diagnosis) => `${diagnosis.title}. ${diagnosis.explanation}`) : [];
  const corpus = [incidentCorpus(context), ...diagnosed, ...diagnosed].join('. ');
  const category = model.classifyCategory(corpus);
  const severity = model.classifySeverity(corpus);

  // Prefer the team's own history, then fill with the pattern library / public postmortems.
  const team = model.similar(corpus, { k: 3, sources: ['team'], excludeIds: options.excludeIds, minScore: 0.15 });
  const general = model.similar(corpus, { k: 3, sources: ['pattern', 'public'], excludeIds: options.excludeIds });
  const picked = [...team, ...general].slice(0, LIMITS.maxSimilarIncidents);

  // Code tasks additionally consult the downloaded bug-fix / code-review corpora (SWE-bench,
  // ManySStuBs4J, github-codereview, CodeReviewer). Incident tasks never do, so the four V2
  // outputs (summary/triage/status/postmortem) keep their exact behaviour.
  if (options.includeCodeCorpus) {
    const codeKnowledge = model.similar(corpus, { k: 3, sources: ['code', 'review'], excludeIds: options.excludeIds, minScore: 0.12 });
    picked.push(...codeKnowledge.filter((candidate) => !picked.some((existing) => existing.doc.id === candidate.doc.id)));
  }

  return {
    model: model.name,
    likelyCategory: category.category,
    categoryLabel: CATEGORIES[category.category].label,
    categoryConfidence: category.confidence,
    predictedSeverity: severity.severity,
    severityConfidence: Math.round(severity.probabilities[severity.severity] * 1000) / 1000,
    similarIncidents: picked.map(({ doc, score }) => {
      const hint: SimilarIncidentHint = {
        source: SOURCE_LABEL[doc.source],
        title: doc.source === 'public' && doc.company ? `${doc.company}: ${clip(doc.snippet, 110)}` : doc.title,
        category: doc.category,
        similarity: score,
      };
      if (doc.severity) hint.severity = doc.severity;
      if (typeof doc.resolvedMinutes === 'number') hint.resolvedInMinutes = doc.resolvedMinutes;
      if (doc.rootCause) hint.rootCause = clip(doc.rootCause, 300);
      if (doc.mitigation?.length) hint.fix = doc.mitigation.slice(0, 3);
      if (doc.prevention?.length) hint.prevention = doc.prevention.slice(0, 3);
      return hint;
    }),
  };
}

/** Similar incidents worth citing: the team's own history, or strong matches from elsewhere. */
function relevantReferences(knowledge: CopilotKnowledge): string[] {
  return knowledge.similarIncidents
    .filter((hint) => hint.source === SOURCE_LABEL.team || hint.similarity >= 0.15)
    .slice(0, 3)
    .map((hint) => clip(hint.title, 200));
}

function knowledgeFor(context: CopilotContext, model?: ArchModelRuntime): CopilotKnowledge {
  return context.knowledge ?? buildKnowledge(model ?? baseArchModel(), context);
}

function categoryOf(knowledge: CopilotKnowledge): CategoryId | null {
  // Below ~35% the classifier is guessing; saying nothing beats saying something wrong.
  return knowledge.categoryConfidence >= 0.35 && knowledge.likelyCategory in CATEGORIES ? (knowledge.likelyCategory as CategoryId) : null;
}

// ---------------------------------------------------------------------------------------------
// Signal extraction from the timeline
// ---------------------------------------------------------------------------------------------

const CAUSE_CUE = /\b(root cause|caused by|because|due to|the cause|was triggered by|triggered by|culprit|turned out|traced (it )?to|started (right )?after|introduced (in|by))\b/i;
const MITIGATION_CUE = /\b(rolled back|roll(ed|ing)? back|revert(ed)?|restart(ed)?|scaled (up|out)|failover|failed over|fixed|patched|mitigated|disabled|flushed|drained|hotfix|increased|raised|added capacity|blocked)\b/i;
const FINDING_CUE = /\b(error rate|latency|p99|cpu|memory|connections?|5\d\d|timeouts?|failing|exhausted|pinned|spike|dropped|backlog|lag|queue)\b/i;
const METRIC = /\b\d{1,3}(?:\.\d+)?\s?%|\bp9\d\b[^.]{0,30}|\b[1-5]\d\d\b(?: errors?)?/gi;

function scoreFinding(text: string): number {
  let score = 0;
  if (CAUSE_CUE.test(text)) score += 3;
  if (MITIGATION_CUE.test(text)) score += 2;
  if (FINDING_CUE.test(text)) score += 1;
  if (METRIC.test(text)) score += 1;
  METRIC.lastIndex = 0;
  return score;
}

/** Sentences that state a cause ("caused by", "root cause", "started right after …"). */
export function extractCausalSentences(texts: string[], max = 3): string[] {
  const found: string[] = [];
  for (const text of texts) for (const sentence of sentences(text)) if (CAUSE_CUE.test(sentence)) found.push(clip(sentence, 260));
  return [...new Set(found)].slice(0, max);
}

/** Sentences that describe what fixed it ("rolled back", "restarted", "failed over" …). */
export function extractMitigationSentences(texts: string[], max = 3): string[] {
  const found: string[] = [];
  for (const text of texts) for (const sentence of sentences(text)) if (MITIGATION_CUE.test(sentence)) found.push(clip(sentence, 220));
  return [...new Set(found)].slice(0, max);
}

function causalStatements(context: CopilotContext): string[] {
  return extractCausalSentences(comments(context).map((entry) => entry.text!));
}

function mitigationStatements(context: CopilotContext): string[] {
  return extractMitigationSentences(comments(context).map((entry) => entry.text!));
}

function metrics(context: CopilotContext): string[] {
  const out = new Set<string>();
  for (const entry of comments(context)) {
    for (const sentence of sentences(entry.text!)) {
      METRIC.lastIndex = 0;
      if (METRIC.test(sentence) && FINDING_CUE.test(sentence)) out.add(clip(sentence, 160));
    }
  }
  METRIC.lastIndex = 0;
  return [...out].slice(0, 2);
}

function hhmm(iso: string): string {
  return `${iso.slice(11, 16)} UTC`;
}

function describe(entry: CopilotTimelineEntry): string {
  const who = entry.actor === 'integration' ? 'An alert' : entry.actor === 'system' ? 'ARCH' : 'A responder';
  switch (entry.type) {
    case 'CREATED':
      return `${who} opened the incident${entry.change ? ` (${entry.change})` : ''}${entry.text ? `: ${clip(entry.text, 90)}` : ''}`;
    case 'STATUS_CHANGED':
      return `Status changed ${entry.change ?? ''}${entry.text ? `: ${clip(entry.text, 100)}` : ''}`.trim();
    case 'SEVERITY_CHANGED':
      return `Severity changed ${entry.change ?? ''}`.trim();
    case 'ASSIGNED':
      return `Incident ${entry.change ?? 'assignment updated'}`;
    case 'LINKED':
      return 'Affected service updated';
    case 'COMMENT':
    default:
      return entry.text ? `${who}: ${clip(entry.text, 140)}` : `${who} posted an update`;
  }
}

function teamHints(knowledge: CopilotKnowledge): SimilarIncidentHint[] {
  return knowledge.similarIncidents.filter((hint) => hint.source === 'your_team');
}

/** Matches from the downloaded bug-fix / code-review corpora (code tasks only). */
function codeHints(knowledge: CopilotKnowledge): SimilarIncidentHint[] {
  return knowledge.similarIncidents.filter((hint) => hint.source === 'code_corpus' || hint.source === 'review_corpus');
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// ---------------------------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------------------------

function summary(context: CopilotContext, knowledge: CopilotKnowledge) {
  const { incident } = context;
  const category = categoryOf(knowledge);
  const where = incident.affectedService ? ` on ${incident.affectedService}` : '';
  const bullets: string[] = [
    clip(`${incident.severity} incident${where}: "${incident.title}"${category ? ` — looks like ${CATEGORIES[category].label.toLowerCase()} (${percent(knowledge.categoryConfidence)} confidence).` : '.'}`, 199),
    incident.resolvedAt
      ? `Resolved after ${formatDuration(incident.durationMinutes)}; ${context.timeline.length} timeline entries.`
      : `Currently ${incident.status.toLowerCase()}, open for ${formatDuration(incident.durationMinutes)}; ${context.timeline.length} timeline entries.`,
  ];

  const ranked = comments(context)
    .map((entry, index) => ({ entry, score: scoreFinding(entry.text!) + index * 0.01 }))
    .filter((item) => item.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .sort((a, b) => a.entry.at.localeCompare(b.entry.at));
  for (const { entry } of ranked) bullets.push(clip(`${hhmm(entry.at)}: ${entry.text!}`, 199));
  if (ranked.length === 0) {
    const latest = comments(context).at(-1);
    if (latest) bullets.push(clip(`Latest note: ${latest.text!}`, 199));
  }

  const cause = causalStatements(context)[0];
  const similar = teamHints(knowledge)[0];
  if (cause) bullets.push(clip(`Suspected cause noted: ${cause}`, 199));
  else if (similar) {
    bullets.push(clip(`Similar to past incident "${similar.title}"${similar.fix?.[0] ? ` — fixed by: ${similar.fix[0]}` : ''}`, 199));
  } else bullets.push('Open question: root cause not yet confirmed in the timeline.');

  return { bullets: bullets.slice(0, 5) };
}

const CRITICAL_WORDS = /\b(full outage|complete outage|outage|site (is )?down|is down|went down|all (customers|users|requests|regions)|everyone|data loss|breach|unavailable|100 ?%|nobody can|cannot log ?in|entire)\b/i;
const HIGH_WORDS = /\b(error rate|failing|failed|timeouts?|degraded|elevated errors?|5\d\d|payment|checkout|many customers|major|severe|crash(ing|es)?|exhausted)\b/i;
const LOW_WORDS = /\b(typo|cosmetic|minor|docs?|documentation|no customer impact|staging|internal only|glitch)\b/i;

function errorRate(corpus: string): number | null {
  const match = /(\d{1,3}(?:\.\d+)?)\s?%[^.]{0,40}\b(error|fail|5\d\d|request|traffic)|\b(error|fail|5\d\d)[^.]{0,40}?(\d{1,3}(?:\.\d+)?)\s?%/i.exec(corpus);
  if (!match) return null;
  return Number(match[1] ?? match[4]);
}

function triage(context: CopilotContext, knowledge: CopilotKnowledge) {
  const corpus = incidentCorpus(context);
  const scores: Record<IncidentSeverity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const reasons: string[] = [];

  // 1. what the organization's trained classifier predicts
  scores[knowledge.predictedSeverity] += 0.45 * knowledge.severityConfidence;

  // 2. explicit impact words and error-rate numbers from the timeline
  const rate = errorRate(corpus);
  if (rate !== null) {
    const bucket: IncidentSeverity = rate >= 50 ? 'CRITICAL' : rate >= 10 ? 'HIGH' : rate >= 2 ? 'MEDIUM' : 'LOW';
    scores[bucket] += 0.4;
    reasons.push(`error rate around ${rate}% was reported`);
  }
  const rule = CRITICAL_WORDS.test(corpus) ? 'CRITICAL' : HIGH_WORDS.test(corpus) ? 'HIGH' : LOW_WORDS.test(corpus) ? 'LOW' : null;
  if (rule) {
    scores[rule] += 0.35;
    const word = (rule === 'CRITICAL' ? CRITICAL_WORDS : rule === 'HIGH' ? HIGH_WORDS : LOW_WORDS).exec(corpus)?.[0];
    if (word) reasons.push(`the timeline mentions "${word.toLowerCase()}"`);
  }

  // 3. how the team rated similar incidents in the past
  for (const hint of teamHints(knowledge)) {
    if (hint.severity) scores[hint.severity] += 0.12 * Math.min(1, hint.similarity * 2);
  }
  const pastSeverities = teamHints(knowledge)
    .map((hint) => hint.severity)
    .filter(Boolean);
  if (pastSeverities.length) reasons.push(`similar past incidents in this workspace were ${[...new Set(pastSeverities)].join('/')}`);

  // 4. inertia: the responder's current choice counts for something — the classifier alone must
  //    be fairly sure (> ~55%) before it contradicts a human.
  scores[context.incident.severity] += 0.25;

  const severity = SEVERITIES.reduce((best, label) => (scores[label] > scores[best] ? label : best), context.incident.severity);
  if (knowledge.predictedSeverity === severity && knowledge.severityConfidence >= 0.4) {
    const kind = categoryOf(knowledge) ? ` ${knowledge.categoryLabel.toLowerCase()}` : '';
    reasons.push(`ARCH model rates${kind} incidents like this ${severity} (${Math.round(knowledge.severityConfidence * 100)}% confidence)`);
  }

  const candidates = [...(context.candidates ?? [])].sort((a, b) => {
    if (a.activeOnThisIncident !== b.activeOnThisIncident) return a.activeOnThisIncident ? -1 : 1;
    if (a.isCurrentAssignee !== b.isCurrentAssignee) return a.isCurrentAssignee ? -1 : 1;
    return a.openIncidentsAssigned - b.openIncidentsAssigned;
  });
  const pick = candidates[0];

  const verdict =
    severity === context.incident.severity
      ? `Current severity ${severity} is consistent with the reported impact`
      : `Suggest ${severity} instead of ${context.incident.severity}`;
  const why = reasons.length ? `: ${reasons.slice(0, 3).join('; ')}.` : '.';
  const who = pick
    ? pick.activeOnThisIncident
      ? ' Suggested assignee is already working on this incident.'
      : ` Suggested assignee has the lightest load (${pick.openIncidentsAssigned} open).`
    : '';
  return { severity, assigneeRef: pick?.ref ?? null, rationale: clip(`${verdict}${why}${who}`, 780) };
}

function statusUpdate(context: CopilotContext, knowledge: CopilotKnowledge) {
  const category = categoryOf(knowledge);
  const subject = context.incident.affectedService ? `the ${context.incident.affectedService} service` : 'some of our services';
  const impact = category ? CATEGORIES[category].customerImpact : 'Some customers may see errors or slower responses.';

  if (category === 'security' && context.incident.status !== 'RESOLVED') {
    return { body: `We are investigating a potential security issue affecting ${subject}. ${CATEGORIES.security.customerImpact} We will post another update within 60 minutes.` };
  }
  const bodies: Record<CopilotContext['incident']['status'], string> = {
    INVESTIGATING: `We are investigating an issue affecting ${subject}. ${impact} Our team is actively working on it and we will share another update within 30 minutes.`,
    IDENTIFIED: `We have identified the cause of the issue affecting ${subject} and are working on a fix. ${impact} We will post another update within 30 minutes.`,
    MONITORING: `A fix has been applied for the issue affecting ${subject} and we are monitoring the results. Service should be returning to normal. We will confirm once everything is fully resolved.`,
    RESOLVED: `The issue affecting ${subject} has been resolved and service is operating normally${
      context.incident.durationMinutes > 0 ? ` (total duration about ${formatDuration(context.incident.durationMinutes)})` : ''
    }. We are sorry for the disruption and will share a summary once our review is complete.`,
  };
  return { body: bodies[context.incident.status] };
}

function dedupe(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(clip(item, 390));
    if (out.length >= max) break;
  }
  return out;
}

function postmortem(context: CopilotContext, knowledge: CopilotKnowledge) {
  const { incident } = context;
  const category = categoryOf(knowledge);
  const subject = incident.affectedService ?? 'the affected service';

  const timeline = context.timeline.slice(0, 30).map((entry) => `${hhmm(entry.at)} — ${describe(entry)}`);
  if (context.omittedTimelineEntries > 0) timeline.push(`(${context.omittedTimelineEntries} earlier entries omitted)`);

  const numbers = metrics(context);
  const impact = [
    `${subject} was impacted at ${incident.severity} severity for ${formatDuration(incident.durationMinutes)}${incident.resolvedAt ? '' : ' (incident still open)'}.`,
    numbers.length ? `Reported signals: ${numbers.join(' ')}` : '',
    category ? `Customer-facing effect (typical for ${CATEGORIES[category].label.toLowerCase()}): ${CATEGORIES[category].customerImpact}` : '',
    'Confirm the number of affected customers against support tickets and dashboards.',
  ]
    .filter(Boolean)
    .join(' ');

  const causes = causalStatements(context);
  const hypotheses = knowledge.similarIncidents.filter((hint) => hint.rootCause).slice(0, 2);
  const rootCause = causes.length
    ? `From the timeline: ${causes.join(' ')}${category ? ` This is consistent with a ${CATEGORIES[category].label.toLowerCase()} failure.` : ''} The incident owner should confirm this before publishing.`
    : `Not yet confirmed — the timeline does not state a verified root cause.${
        hypotheses.length ? ` Hypotheses based on similar incidents: ${hypotheses.map((hint, index) => `(${index + 1}) ${hint.rootCause}`).join(' ')}` : ''
      }`;

  const mitigations = mitigationStatements(context);
  const actionItems = dedupe(
    [
      causes.length ? `Add a test or guardrail that would have caught: ${clip(causes[0]!, 160)}` : `Confirm and document the root cause for "${clip(incident.title, 70)}".`,
      ...knowledge.similarIncidents.flatMap((hint) => hint.prevention ?? []).slice(0, 3),
      category ? CATEGORIES[category].detection : 'Add or tune alerting so this failure mode is detected before customers report it.',
      mitigations.length ? `Add the mitigation that worked ("${clip(mitigations[0]!, 100)}") to the runbook.` : 'Write or update the runbook with the mitigation steps used during this incident.',
      incident.durationMinutes > 60 ? 'Review why detection-to-mitigation took over an hour and what would shorten it.' : '',
    ],
    8,
  );

  return { timeline: timeline.length ? timeline : ['No timeline entries recorded.'], impact: clip(impact, 1990), rootCause: clip(rootCause, 1990), actionItems };
}

function codeFix(context: CopilotContext, knowledge: CopilotKnowledge) {
  const pasted = context.attachment?.text ?? '';
  const fromTimeline = comments(context)
    .map((entry) => entry.text!)
    .filter((text) => /(Error|Exception|Traceback|panic|at .+:\d+|File ".+", line \d+|```|ECONN|ETIMEDOUT|OOM)/.test(text))
    .join('\n');
  const source = pasted || fromTimeline;

  if (!source.trim()) {
    const category = categoryOf(knowledge);
    return {
      diagnosis: 'No stack trace, error log or code snippet was found. Paste one in the Copilot panel (or add it to the timeline) for a code-level diagnosis.',
      likelyCause: category ? `Based on the timeline this looks like ${CATEGORIES[category].label.toLowerCase()}.` : 'Unknown from the available data.',
      suggestedFixes: dedupe([...knowledge.similarIncidents.flatMap((hint) => hint.fix ?? []), 'Capture the exact error message and stack trace from logs.'], 6),
      patch: null,
      references: relevantReferences(knowledge),
    };
  }

  const analysis: CodeAnalysis = analyzeCode(source, (context.attachment?.language as never) || null);
  const top = analysis.diagnoses[0];
  const frame = analysis.topFrame ? ` First frame in your code: ${analysis.topFrame.file}:${analysis.topFrame.line}${analysis.topFrame.fn ? ` in ${analysis.topFrame.fn}()` : ''}.` : '';
  const deployed = /\b(deploy|release|rolled out|shipped|merged)\b/i.test(incidentCorpus(context));
  const errors = analysis.findings.filter((finding) => finding.severity !== 'info');

  const diagnosis = top
    ? `${analysis.diagnoses.map((d) => d.title).join(' + ')}. Evidence: "${clip(top.evidence, 160)}".${frame}`
    : errors.length
      ? `Code review found ${errors.length} reliability/security problem${errors.length === 1 ? '' : 's'}: ${errors
          .slice(0, 3)
          .map((finding) => `line ${finding.line}: ${finding.message}`)
          .join(' ')}`
      : `No known error signature matched. ${analysis.summary}`;

  const likelyCause = top
    ? `${top.explanation}${deployed ? ' The timeline mentions a recent deploy — the change touching this code path is the first suspect.' : ''}`
    : errors[0]
      ? `${errors[0].message} ${deployed ? 'A recent deploy is mentioned in the timeline; compare with the previous version.' : ''}`.trim()
      : 'Not determinable from the snippet alone.';

  const suggestedFixes = dedupe(
    [
      ...analysis.diagnoses.flatMap((d) => d.fixes),
      ...errors.map((finding) => `Line ${finding.line}: ${finding.suggestion}`),
      ...teamHints(knowledge).flatMap((hint) => hint.fix ?? []),
      // How real bugs like this were fixed elsewhere (SWE-bench, ManySStuBs4J, code reviews).
      ...codeHints(knowledge).flatMap((hint) => hint.fix ?? []).slice(0, 4),
      deployed ? 'If the error started with the deploy, roll back first and debug on the previous version.' : '',
    ],
    8,
  );

  const patch = analysis.kind !== 'stack_trace' && analysis.appliedFixes.length && analysis.improvedCode !== source ? analysis.improvedCode.slice(0, 7_900) : null;
  return {
    diagnosis: clip(diagnosis, 1490),
    likelyCause: clip(likelyCause, 1490),
    suggestedFixes: suggestedFixes.length ? suggestedFixes : ['Add logging around the failing call to capture inputs (redacted) and the full error.'],
    patch,
    references: relevantReferences(knowledge),
  };
}

// ---------------------------------------------------------------------------------------------

export type IncidentTask = Exclude<CopilotTask, 'code_review'>;

export function archDraft(task: IncidentTask, context: CopilotContext, model?: ArchModelRuntime): unknown {
  const knowledge = knowledgeFor(context, model);
  switch (task) {
    case 'summary':
      return summary(context, knowledge);
    case 'triage':
      return triage(context, knowledge);
    case 'status_update':
      return statusUpdate(context, knowledge);
    case 'postmortem':
      return postmortem(context, knowledge);
    case 'code_fix':
      return codeFix(context, knowledge);
  }
}
