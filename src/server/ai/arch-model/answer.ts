/**
 * ARCH answer engine — answers a responder's natural-language question about an incident using
 * ONLY the facts in the timeline, the organization's runbooks, and similar past incidents.
 *
 * No language model, no network. Deterministic, fast, runs on CPU. Questions are classified by
 * intent (what / why / how-fix / who / when / status / next / impact), then an extractive answer
 * is composed from cited evidence. Unknowns are reported as unknown — the engine never invents.
 *
 * Every claim cites either a timeline entry, a retrieved runbook chunk, or a similar past
 * incident (with its similarity score), so a responder can click through to the source.
 */
import type { CopilotContext, CopilotKnowledge, KnowledgeChunkHint, SimilarIncidentHint } from '../context';
import { clip, formatDuration, sentences } from './text';
import { extractCausalSentences, extractMitigationSentences, incidentCorpus, knowledgeCitations } from './engine';
import { CATEGORIES, type CategoryId } from './knowledge';

export type AnswerCitation = {
  source: 'timeline' | 'runbook' | 'similar_incident' | 'category';
  label: string;
  detail?: string;
  similarity?: number;
};

export type AskAnswer = {
  answer: string;
  intent: IntentId;
  confidence: 'high' | 'medium' | 'low';
  citations: AnswerCitation[];
  suggestions: string[];
};

type IntentId =
  | 'status'          // what's happening now?
  | 'cause'           // why did this happen? root cause?
  | 'impact'          // who/what is affected?
  | 'fix'             // how do we fix / mitigate?
  | 'next'            // what should I do next?
  | 'when'            // timeline / when did X happen?
  | 'who'             // who's involved / assigned?
  | 'what_happened'   // summary / recap
  | 'similar'         // has this happened before?
  | 'runbook'         // what does the runbook say?
  | 'unknown';

// ---------- Intent classification ----------

type IntentRule = { id: IntentId; patterns: RegExp[]; weight?: number };

const INTENT_RULES: IntentRule[] = [
  { id: 'status', patterns: [/\b(what'?s? (going on|happening|the status|current)|status (update|right now|now)|current state|where (are we|do we) stand|still (down|broken|happening)|update (me|us|pl(ea)?se)|kya (ho raha|chal raha|haalat|sthit(i|ee))|abhi kya (hai|ho raha)|present me kya)\b/i] },
  { id: 'cause', patterns: [/\b(why|root cause|what caused|culprit|reason|how did (this|it) happen|what broke|yahan kya hua|kaise hua|kyun (hua|haya|haa)|kya wajah|kya karan|root cause kya)\b/i] },
  { id: 'impact', patterns: [/\b(impact|affected|who is affected|customer|user|how (bad|many|much)|kitna nuksan|who'?s? impacted|blast radius|kitna impact|kaun prabhavit|kitna loss)\b/i] },
  { id: 'fix', patterns: [/\b(fix|mitigat|rollback|revert|resolve|how (do|can|should) i|kaise thik|workaround|repair|remedy|solution|what do i do|kaise solve|ise kaise thik|thik kaise|kaise sahi|kya upay)\b/i] },
  { id: 'next', patterns: [/\b(next step|what next|ab kya|should i do now|action item|priorit|what now|age kya|aage kya|ab kya karna|next kya)\b/i] },
  { id: 'when', patterns: [/\b(when|kitne baje|started at|how long|duration|kab (hua|se|tha)|since when|last update|kab se|kitni der|kab shuru)\b/i] },
  { id: 'who', patterns: [/\b(who|assigned|on ?call|owner|responding|kaun|whose working|in charge|kaun dekh raha|kaun hai|kaun responsible)\b/i] },
  { id: 'similar', patterns: [/\b(before|happened before|last time|seen this|similar|recurr|past incident|pehle bhi|pehle kabhi|pichli baar)\b/i] },
  { id: 'runbook', patterns: [/\b(runbook|doc|procedure|playbook|process|guide|check ?list|runbook kya|doc kya|process kya)\b/i] },
  { id: 'what_happened', patterns: [/\b(what happened|recap|summary|tldr|brief|sab kuch|kya hua tha|kya hua|poora recap|poori kahani)\b/i] },
];

function classifyIntent(question: string): IntentId {
  const scores: Record<string, number> = {};
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(question)) scores[rule.id] = (scores[rule.id] ?? 0) + 1;
    }
  }
  const [best = 'unknown'] = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  return best as IntentId;
}

// ---------- Evidence extraction ----------

function timelineCitations(context: CopilotContext, predicate?: (entry: CopilotContext['timeline'][number]) => boolean, max = 3): AnswerCitation[] {
  const items = predicate ? context.timeline.filter(predicate) : context.timeline;
  return items.slice(-max).map((entry) => ({
    source: 'timeline' as const,
    label: `${entry.at.slice(11, 16)} UTC — ${entry.type.toLowerCase()}`,
    detail: entry.text ? clip(entry.text, 220) : entry.change ?? '',
  }));
}

function lastComment(context: CopilotContext): CopilotContext['timeline'][number] | undefined {
  return [...context.timeline].reverse().find((entry) => entry.text && entry.type === 'COMMENT');
}

function lastStatusChange(context: CopilotContext): CopilotContext['timeline'][number] | undefined {
  return [...context.timeline].reverse().find((entry) => entry.type === 'STATUS_CHANGED');
}

function assigneeFromTimeline(context: CopilotContext): { assigned: boolean; at?: string; change?: string } {
  const assign = [...context.timeline].reverse().find((entry) => entry.type === 'ASSIGNED');
  if (!assign) return { assigned: false };
  return { assigned: true, at: assign.at, change: assign.change };
}

// ---------- Answers per intent ----------

function answerStatus(context: CopilotContext): { text: string; cites: AnswerCitation[] } {
  const { incident } = context;
  const svc = incident.affectedService ? ` on ${incident.affectedService}` : '';
  const sc = lastStatusChange(context);
  const comment = lastComment(context);
  const parts: string[] = [
    `${incident.severity}${svc}, currently ${incident.status.toLowerCase()}, open for ${formatDuration(incident.durationMinutes)}.`,
  ];
  const cites: AnswerCitation[] = [];
  if (sc) {
    cites.push({ source: 'timeline', label: `Status moved to ${(sc.change ?? '').replace(/.+ -> /, '')} at ${sc.at.slice(11, 16)} UTC` });
  }
  if (comment) {
    parts.push(`Latest note (${comment.at.slice(11, 16)} UTC): "${clip(comment.text ?? '', 220)}".`);
    cites.push({ source: 'timeline', label: `${comment.at.slice(11, 16)} UTC note`, detail: clip(comment.text ?? '', 220) });
  } else {
    parts.push('No responder note yet in the timeline.');
  }
  return { text: parts.join(' '), cites };
}

function answerCause(context: CopilotContext, knowledge?: CopilotKnowledge): { text: string; cites: AnswerCitation[] } {
  const causal = extractCausalSentences(context.timeline.map((e) => e.text ?? ''));
  const cites: AnswerCitation[] = [];
  if (causal.length) {
    return {
      text: `From the timeline: ${causal.slice(0, 2).join(' ')} Mark as the verified root cause once you confirm it.`,
      cites: timelineCitations(context, (e) => e.text ? /\b(because|caused by|root cause|due to|culprit|traced to|turned out)\b/i.test(e.text) : false, 2),
    };
  }
  const similar = (knowledge?.similarIncidents ?? []).filter((h) => h.rootCause).slice(0, 2);
  const catHints: string[] = [];
  if (knowledge && knowledge.categoryConfidence >= 0.35 && knowledge.likelyCategory in CATEGORIES) {
    const cat = CATEGORIES[knowledge.likelyCategory as CategoryId];
    catHints.push(`Pattern match: this looks like ${cat.label.toLowerCase()} (${Math.round(knowledge.categoryConfidence * 100)}% confidence). ${cat.customerImpact}`);
    cites.push({ source: 'category', label: `Classifier: ${cat.label} (${Math.round(knowledge.categoryConfidence * 100)}%)` });
  }
  if (similar.length) {
    for (const s of similar) cites.push({ source: 'similar_incident', label: clip(s.title, 120), detail: clip(s.rootCause ?? '', 220), similarity: Math.round(s.similarity * 100) / 100 });
    return {
      text: `Root cause not yet confirmed in the timeline. ${catHints.join(' ') || ''} Hypothesis from similar incidents: ${similar.map((s) => `"${clip(s.rootCause ?? '', 180)}"`).join('; ')}. These are HYPOTHESES — verify before stating publicly.`,
      cites,
    };
  }
  return {
    text: `Root cause is not confirmed yet. ${catHints.join(' ') || 'No strong pattern match yet.'} Capture the full error, identify the first failure frame, and state the suspected cause in the timeline once you have evidence.`,
    cites,
  };
}

function answerFix(context: CopilotContext, knowledge?: CopilotKnowledge): { text: string; cites: AnswerCitation[]; suggestions: string[] } {
  const mitigations = extractMitigationSentences(context.timeline.map((e) => e.text ?? ''));
  const cites: AnswerCitation[] = [];
  const suggestions: string[] = [];
  if (mitigations.length) {
    cites.push(...timelineCitations(context, (e) => e.text ? /\b(rolled back|roll ?back|revert|restart|failover|hotfix|drain|scaled|blocked|disabled|flushed|patched)\b/i.test(e.text) : false, 2));
  }
  const fixes = new Set<string>();
  for (const m of mitigations) fixes.add(clip(m, 180));
  for (const h of knowledge?.similarIncidents ?? []) for (const f of h.fix ?? []) fixes.add(clip(f, 180));
  const runbook = knowledgeCitations(knowledge ?? ({} as CopilotKnowledge), 2);
  for (const chunk of runbook) {
    cites.push({ source: 'runbook', label: `"${chunk.sourceName}"${chunk.heading ? ` — ${clip(chunk.heading, 80)}` : ''}`, detail: clip(chunk.text, 260), similarity: chunk.similarity });
    suggestions.push(`Check runbook "${chunk.sourceName}" — matches this incident.`);
  }
  if (deployMentioned(context) && !mitigations.length) suggestions.push('Timeline mentions a recent deploy — consider rolling back first, then debug on the previous version.');
  suggestions.push('Capture the failing request/error with full stack trace and redact secrets before sharing externally.');
  const fixList = [...fixes].slice(0, 5);
  const text = mitigations.length
    ? `Mitigation already attempted (from timeline): ${mitigations.slice(0, 2).join(' ')}`
    : fixList.length
      ? `Nothing confirmed yet. Based on similar incidents and the category, likely mitigations to consider: ${fixList.map((f, i) => `(${i + 1}) ${f}`).join(' ')} These are starting points, not instructions.`
      : 'No mitigation recorded yet, and no strong runbook match. Start by containing impact: drain the affected node/route, roll back recent deploys, or fail over to a healthy region.';
  return { text, cites, suggestions };
}

function answerNext(context: CopilotContext, knowledge?: CopilotKnowledge): { text: string; cites: AnswerCitation[]; suggestions: string[] } {
  const steps: string[] = [];
  const cites: AnswerCitation[] = [];
  const assignee = assigneeFromTimeline(context);
  const mins = context.incident.durationMinutes;
  const hasComment = context.timeline.some((e) => e.type === 'COMMENT');
  const sc = lastStatusChange(context);

  if (!assignee.assigned) steps.push('Assign an incident commander (OWNER/ADMIN/RESPONDER) so one person is driving.');
  if (context.incident.status === 'INVESTIGATING') {
    if (!hasComment) steps.push('Post a first comment describing what you see (symptoms + first data point) so responders have context.');
    if (mins >= 15 && sc && (new Date().getTime() - new Date(sc.at).getTime()) / 60000 > 15) steps.push(`It has been ~${mins} minutes without a status update — post one to the timeline (and to customers if impact is external).`);
    steps.push('Narrow the blast radius: is it one service, one region, or one customer tier? Check the "Blast radius" panel.');
  }
  if (context.incident.status === 'IDENTIFIED') {
    steps.push('You have a likely cause — apply the safest mitigation first (rollback/drain/failover) before writing a fix.');
    steps.push('Move status to MONITORING once mitigation is applied, with a short note.');
  }
  if (context.incident.status === 'MONITORING') {
    steps.push('Watch key metrics (error rate, latency, saturation) for at least 15–30 minutes before resolving.');
    steps.push('If metrics regress, move back to IDENTIFIED and capture what changed.');
  }
  if (deployMentioned(context)) steps.push('If a recent deploy correlates, roll back before deep debugging — that usually resolves faster.');
  const runbook = knowledgeCitations(knowledge ?? ({} as CopilotKnowledge), 1)[0];
  if (runbook) {
    steps.unshift(`Follow the runbook "${runbook.sourceName}" — ARCH matched it to this incident.`);
    cites.push({ source: 'runbook', label: runbook.sourceName, detail: clip(runbook.text, 200), similarity: runbook.similarity });
  }
  const fix = answerFix(context, knowledge);
  if (fix.suggestions[0]) steps.push(...fix.suggestions.slice(0, 2));
  return { text: `Prioritized next steps for ${context.incident.status.toLowerCase()}:`, cites, suggestions: dedupe(steps, 6) };
}

function answerImpact(context: CopilotContext, knowledge?: CopilotKnowledge): { text: string; cites: AnswerCitation[] } {
  const { incident } = context;
  const svc = incident.affectedService ?? 'services';
  const cat = knowledge && knowledge.likelyCategory in CATEGORIES ? CATEGORIES[knowledge.likelyCategory as CategoryId] : null;
  const cites: AnswerCitation[] = [];
  const parts = [
    `${incident.severity} severity affecting ${svc}, open for ${formatDuration(incident.durationMinutes)}${incident.resolvedAt ? ' (now resolved)' : ''}.`,
  ];
  if (cat) parts.push(`Typical customer impact for this pattern (${cat.label.toLowerCase()}): ${cat.customerImpact}`);
  const metric = metricFromTimeline(context);
  if (metric) {
    parts.push(`Reported signal from the timeline: "${metric}".`);
    cites.push(...timelineCitations(context, (e) => e.text ? /(error rate|latency|p99|cpu|memory|5\d\d|timeouts?|failing|spike)/i.test(e.text) : false, 1));
  }
  parts.push('Confirm actual customer impact against support tickets and the error-rate dashboard before declaring severity externally.');
  return { text: parts.join(' '), cites };
}

function answerWhen(context: CopilotContext): { text: string; cites: AnswerCitation[] } {
  const { incident } = context;
  const cites: AnswerCitation[] = [];
  const sc = lastStatusChange(context);
  const parts = [
    `Incident opened at ${hhmm(incident.startedAt)} UTC; status is ${incident.status.toLowerCase()}; duration so far ${formatDuration(incident.durationMinutes)}.`,
  ];
  if (incident.resolvedAt) parts.push(`Resolved at ${hhmm(incident.resolvedAt)} UTC.`);
  if (sc) {
    parts.push(`Last status change at ${hhmm(sc.at)} UTC (${sc.change ?? sc.type}).`);
    cites.push({ source: 'timeline', label: `${hhmm(sc.at)} UTC — ${sc.change ?? 'status update'}`, detail: clip(sc.text ?? '', 200) });
  }
  return { text: parts.join(' '), cites };
}

function answerWho(context: CopilotContext): { text: string; cites: AnswerCitation[] } {
  const a = assigneeFromTimeline(context);
  const cites: AnswerCitation[] = [];
  const responders = new Set<string>();
  for (const entry of context.timeline) if (entry.actor === 'responder') responders.add(entry.at.slice(11, 16));
  const text = a.assigned
    ? `An assignee was set at ${a.at ? hhmm(a.at) : 'some point'} UTC${a.change ? ` (${a.change})` : ''}.`
    : 'No responder has been assigned yet — assign an incident commander.';
  cites.push(...timelineCitations(context, (e) => e.type === 'ASSIGNED', 1));
  return { text: `${text} ${responders.size} responder update${responders.size === 1 ? '' : 's'} in the timeline.`, cites };
}

function answerWhatHappened(context: CopilotContext, knowledge?: CopilotKnowledge): { text: string; cites: AnswerCitation[] } {
  const { incident } = context;
  const svc = incident.affectedService ? ` on ${incident.affectedService}` : '';
  const cat = knowledge && knowledge.categoryConfidence >= 0.35 ? `${CATEGORIES[knowledge.likelyCategory as CategoryId]?.label ?? ''}` : '';
  const comments = context.timeline.filter((e) => e.text).slice(0, 3);
  const cites = comments.map((e) => ({ source: 'timeline' as const, label: `${hhmm(e.at)} UTC`, detail: clip(e.text ?? '', 200) }));
  const parts = [`${incident.severity}${svc}: "${incident.title}". Status: ${incident.status.toLowerCase()}. Open for ${formatDuration(incident.durationMinutes)}.`];
  if (cat) parts.push(`Looks like ${cat.toLowerCase()}.`);
  for (const c of comments.slice(-2)) parts.push(`${hhmm(c.at)} UTC: ${clip(c.text ?? '', 180)}`);
  return { text: parts.join(' '), cites };
}

function answerSimilar(context: CopilotContext, knowledge?: CopilotKnowledge): { text: string; cites: AnswerCitation[] } {
  const sims = knowledge?.similarIncidents ?? [];
  if (!sims.length) return { text: 'No strong matches in this workspace\'s history or the pattern library for this incident yet.', cites: [] };
  const cites: AnswerCitation[] = sims.slice(0, 3).map((s) => ({
    source: s.source === 'your_team' ? 'similar_incident' : 'similar_incident',
    label: clip(s.title, 120),
    detail: [s.rootCause ? `Cause: ${clip(s.rootCause, 160)}` : '', (s.fix?.[0] ? `Fix: ${clip(s.fix[0], 140)}` : '')].filter(Boolean).join(' '),
    similarity: s.similarity,
  }));
  return {
    text: `Top similar incidents (from ${sims[0]!.source.replace('_', ' ')}): ${sims.slice(0, 3).map((s, i) => `(${i + 1}) "${clip(s.title, 90)}"${s.rootCause ? ` — ${clip(s.rootCause, 120)}` : ''}`).join(' ')}`,
    cites,
  };
}

function answerRunbook(context: CopilotContext, knowledge?: CopilotKnowledge): { text: string; cites: AnswerCitation[] } {
  const chunks = knowledgeCitations(knowledge ?? ({} as CopilotKnowledge), 3);
  if (!chunks.length) return { text: 'No runbook/doc passage was retrieved for this incident. Add your team\'s runbooks from the Knowledge tab and ARCH will cite them next time.', cites: [] };
  const cites: AnswerCitation[] = chunks.map((c) => ({ source: 'runbook' as const, label: `"${c.sourceName}"${c.heading ? ` — ${clip(c.heading, 80)}` : ''}`, detail: clip(c.text, 400), similarity: c.similarity }));
  return { text: `From your team's knowledge base: ${chunks.map((c) => `"${c.sourceName}"${c.heading ? ` (${c.heading})` : ''}`).join(', ')}.`, cites };
}

// ---------- Helpers ----------

function hhmm(iso: string): string {
  return iso.slice(11, 16);
}

function metricFromTimeline(context: CopilotContext): string | null {
  const METRIC = /\b\d{1,3}(?:\.\d+)?\s?%|p9\d[^.]{0,20}|\b[1-5]\d\d\b errors?/i;
  for (const entry of context.timeline) {
    if (!entry.text) continue;
    for (const sentence of sentences(entry.text)) if (METRIC.test(sentence)) return clip(sentence, 200);
  }
  return null;
}

function deployMentioned(context: CopilotContext): boolean {
  return /\b(deploy|rolled out|shipped|released|merged|canary)\b/i.test(incidentCorpus(context));
}

function dedupe(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(clip(item, 280));
    if (out.length >= max) break;
  }
  return out;
}

// ---------- Main entry point ----------

export function answerQuestion(question: string, context: CopilotContext, knowledge?: CopilotKnowledge): AskAnswer {
  const q = question.trim();
  const intent = classifyIntent(q);

  let text = '';
  let cites: AnswerCitation[] = [];
  let suggestions: string[] = [];
  let confidence: AskAnswer['confidence'] = 'medium';

  switch (intent) {
    case 'status':
      ({ text, cites } = answerStatus(context));
      confidence = 'high';
      break;
    case 'cause':
      ({ text, cites } = answerCause(context, knowledge));
      confidence = cites.some((c) => c.source === 'timeline') ? 'high' : 'low';
      break;
    case 'impact':
      ({ text, cites } = answerImpact(context, knowledge));
      confidence = 'medium';
      break;
    case 'fix': {
      const r = answerFix(context, knowledge);
      text = r.text; cites = r.cites; suggestions = r.suggestions;
      confidence = cites.some((c) => c.source === 'timeline') ? 'high' : 'medium';
      break;
    }
    case 'next': {
      const r = answerNext(context, knowledge);
      text = r.text; cites = r.cites; suggestions = r.suggestions;
      confidence = 'high';
      break;
    }
    case 'when':
      ({ text, cites } = answerWhen(context));
      confidence = 'high';
      break;
    case 'who':
      ({ text, cites } = answerWho(context));
      confidence = cites.length ? 'high' : 'medium';
      break;
    case 'what_happened':
      ({ text, cites } = answerWhatHappened(context, knowledge));
      confidence = 'high';
      break;
    case 'similar':
      ({ text, cites } = answerSimilar(context, knowledge));
      confidence = cites.length ? 'medium' : 'low';
      break;
    case 'runbook':
      ({ text, cites } = answerRunbook(context, knowledge));
      confidence = cites.length ? 'high' : 'low';
      break;
    case 'unknown':
    default: {
      // Fall back to what_happened plus offer follow-ups
      const r = answerWhatHappened(context, knowledge);
      text = `I didn't quite pin down the intent of that question. Here's the current picture: ${r.text} Try asking "what's the status", "why did this happen", "what should I do next", or "has this happened before".`;
      cites = r.cites;
      confidence = 'low';
      suggestions = ['What\'s the current status?', 'What should I do next?', 'Has this happened before?'];
    }
  }

  // Always offer useful follow-ups based on state.
  if (!suggestions.length) {
    suggestions = [
      'What should I do next?',
      context.incident.status !== 'RESOLVED' ? 'How do I mitigate this?' : 'What follow-ups does this incident need?',
      'Has this happened before?',
    ];
  }

  return { answer: text, intent, confidence, citations: cites.slice(0, 6), suggestions: dedupe(suggestions, 4) };
}
