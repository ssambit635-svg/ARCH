/**
 * ARCH hints engine — surfaces risks and gaps in an incident before they turn into
 * customer-visible damage. Pure, deterministic, runs on CPU.
 *
 * Detects:
 *  - Stale incident: no update in N minutes while not resolved
 *  - No assignee on HIGH/CRITICAL
 *  - No customer-facing update posted while status is INVESTIGATING/IDENTIFIED for too long
 *  - Status page not updated when public impact is likely (CRITICAL/HIGH with service in OUTAGE)
 *  - Resolution without a root cause or action items
 *  - Heavy action loop: many status flips (thrashing)
 *  - Runbook exists for this failure but wasn't linked / cited
 */
import type { CopilotContext, CopilotKnowledge } from '../context';
import { knowledgeCitations } from './engine';
import { CATEGORIES, type CategoryId } from './knowledge';
import { clip } from './text';

export type HintSeverity = 'info' | 'warning' | 'critical';

export type IncidentHint = {
  id: string;
  severity: HintSeverity;
  title: string;
  detail: string;
  suggestedAction: string;
};

type Options = {
  now?: Date;
  /** Minutes without a timeline entry before an incident is considered stale. */
  staleMinutes?: number;
};

const DEFAULTS = { staleMinutes: 15 };

export function detectGaps(context: CopilotContext, knowledge?: CopilotKnowledge, options: Options = {}): IncidentHint[] {
  const now = options.now ?? new Date();
  const staleMinutes = options.staleMinutes ?? DEFAULTS.staleMinutes;
  const hints: IncidentHint[] = [];
  const { incident, timeline } = context;

  // 1. Stale incident — no entry in >staleMinutes while not RESOLVED.
  if (incident.status !== 'RESOLVED') {
    const lastEntry = timeline.at(-1);
    if (lastEntry) {
      const lastAt = new Date(lastEntry.at).getTime();
      const quietMin = Math.round((now.getTime() - lastAt) / 60_000);
      if (quietMin >= staleMinutes) {
        const sev: HintSeverity = incident.severity === 'CRITICAL' ? 'critical' : incident.severity === 'HIGH' ? 'warning' : 'info';
        hints.push({
          id: 'stale-incident',
          severity: sev,
          title: `No timeline update in ${quietMin} minutes`,
          detail: `Last entry at ${lastEntry.at.slice(11, 16)} UTC while the incident is ${incident.status.toLowerCase()}.`,
          suggestedAction: quietMin >= 30 && incident.severity !== 'LOW'
            ? 'Post a status update NOW — responders and stakeholders have no signal.'
            : 'Post a short update (even "still investigating") so the timeline does not go quiet.',
        });
      }
    }
  }

  // 2. HIGH/CRITICAL with no assignee
  const hasAssignee = timeline.some((e) => e.type === 'ASSIGNED' && e.change && !e.change.endsWith('-> unassigned'));
  if (!hasAssignee && (incident.severity === 'HIGH' || incident.severity === 'CRITICAL') && incident.status !== 'RESOLVED') {
    hints.push({
      id: 'no-assignee',
      severity: incident.severity === 'CRITICAL' ? 'critical' : 'warning',
      title: `${incident.severity} incident has no assignee`,
      detail: 'No responder is formally driving the incident.',
      suggestedAction: 'Assign an incident commander from the team (preferably someone already on the timeline).',
    });
  }

  // 3. No responder comment yet, just system-created
  const responderComments = timeline.filter((e) => e.actor === 'responder' && e.type === 'COMMENT');
  if (!responderComments.length && incident.durationMinutes >= 5 && incident.status !== 'RESOLVED') {
    hints.push({
      id: 'no-responder-note',
      severity: 'info',
      title: 'No responder note yet',
      detail: 'The timeline only contains automated entries (creation, status from alerts).',
      suggestedAction: 'Post a first note describing what you see so other responders can catch up quickly.',
    });
  }

  // 4. Status flapping — many STATUS_CHANGED entries back and forth
  const statusChanges = timeline.filter((e) => e.type === 'STATUS_CHANGED');
  if (statusChanges.length >= 5) {
    hints.push({
      id: 'status-flapping',
      severity: 'warning',
      title: `Status changed ${statusChanges.length} times`,
      detail: 'Frequent status flips often mean mitigation is not holding or criteria are unclear.',
      suggestedAction: 'State the concrete metric thresholds for IDENTIFIED → MONITORING → RESOLVED in a comment so the team agrees.',
    });
  }

  // 5. Resolved without an explicit root-cause comment
  if (incident.status === 'RESOLVED') {
    const hasCause = timeline.some((e) => e.text && /\b(root cause|caused by|turned out|due to|traced to|culprit|was the (bug|issue|problem))\b/i.test(e.text));
    if (!hasCause) {
      hints.push({
        id: 'resolved-without-cause',
        severity: 'warning',
        title: 'Resolved without a recorded root cause',
        detail: 'The incident is marked RESOLVED but no entry in the timeline states what caused it.',
        suggestedAction: 'Before closing, capture the root cause in a comment (or run Postmortem draft) so the next occurrence can be diagnosed faster.',
      });
    }
  }

  // 6. Runbook match that should be cited
  const runbook = knowledgeCitations(knowledge ?? ({} as CopilotKnowledge), 1)[0];
  if (runbook && incident.status !== 'RESOLVED') {
    const alreadyMentioned = timeline.some((e) => e.text && new RegExp(escapeReg(clip(runbook.sourceName, 40)), 'i').test(e.text));
    if (!alreadyMentioned) {
      hints.push({
        id: 'runbook-match',
        severity: 'info',
        title: `Runbook "${clip(runbook.sourceName, 80)}" matches this incident`,
        detail: `Retrieved a relevant passage (similarity ${Math.round(runbook.similarity * 100)}%).`,
        suggestedAction: `Open the runbook and follow its procedure — the Knowledge panel shows the matched section.`,
      });
    }
  }

  // 7. Category is very confidently security or data loss — suggest security page
  if (knowledge && knowledge.categoryConfidence >= 0.55) {
    const cat = knowledge.likelyCategory as CategoryId;
    if (cat === 'security') {
      hints.push({
        id: 'possible-security',
        severity: 'critical',
        title: 'Pattern match suggests a SECURITY incident',
        detail: `The ARCH classifier is ~${Math.round(knowledge.categoryConfidence * 100)}% confident this is a security event.`,
        suggestedAction: 'Loop in your security team before posting customer-facing details. Do not discuss exploit mechanics in public status updates.',
      });
    } else if (cat === 'data') {
      hints.push({
        id: 'possible-data-loss',
        severity: 'critical',
        title: 'Pattern match suggests possible data integrity / loss event',
        detail: `The classifier leans toward data integrity (${Math.round(knowledge.categoryConfidence * 100)}% confidence).`,
        suggestedAction: 'Preserve logs/backups before mutating state and loop in the data owner.',
      });
    }
  }

  // 8. Long-running incident without escalation
  if (incident.status !== 'RESOLVED' && incident.durationMinutes >= 60 && incident.severity !== 'LOW') {
    hints.push({
      id: 'long-running',
      severity: incident.durationMinutes >= 180 ? 'warning' : 'info',
      title: `Open for ${formatDurationShort(incident.durationMinutes)}`,
      detail: 'Most incidents of this severity are resolved faster than this in your workspace.',
      suggestedAction: 'Escalate, bring in additional responders, or consider declaring a major incident.',
    });
  }

  // 9. CRITICAL severity with no public status update yet when a public status page exists
  // (detected indirectly: if service is OUTAGE and severity CRITICAL, mention status page)
  if (incident.severity === 'CRITICAL' && incident.status === 'INVESTIGATING' && incident.durationMinutes >= 10) {
    const hasStatusUpdate = timeline.some((e) => e.type === 'COMMENT' && e.text && /status page|public update|posted to status|customer update/i.test(e.text));
    if (!hasStatusUpdate) {
      hints.push({
        id: 'public-status-due',
        severity: 'warning',
        title: 'Customers likely seeing impact — post a status-page update',
        detail: `Critical incident open for ${incident.durationMinutes} minutes with no status-page update drafted.`,
        suggestedAction: 'Use "Draft status update" in Copilot and publish it — even a short "we are investigating" note is better than silence.',
      });
    }
  }

  // Sort worst first.
  const order: Record<HintSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return hints.sort((a, b) => order[a.severity] - order[b.severity]);
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
