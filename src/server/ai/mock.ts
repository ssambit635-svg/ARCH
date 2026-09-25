import type { CopilotContext, CopilotTimelineEntry } from './context';
import { parseContextFromPrompt } from './prompts';
import { DEFAULT_MODELS, estimateTokens, type AiProvider, type CopilotTask, type GenerateOptions, type GenerateResult } from './provider';

/**
 * Mock provider (AI_PROVIDER="mock") — the default in development and the only provider in tests.
 *
 * It never touches the network. Output is canned but derived from the (already redacted) context
 * so the Copilot panel shows believable drafts in local demos, and it follows exactly the JSON
 * contracts real models are asked for, so the whole pipeline — validation, post-processing,
 * persistence, approval — is exercised without an API key.
 */

function clip(text: string, max = 140): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max - 1)}…` : single;
}

function hhmm(iso: string): string {
  return `${iso.slice(11, 16)} UTC`;
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function describe(entry: CopilotTimelineEntry): string {
  const who = entry.actor === 'integration' ? 'An alert' : entry.actor === 'system' ? 'ARCH' : 'A responder';
  switch (entry.type) {
    case 'CREATED':
      return `${who} opened the incident${entry.change ? ` (${entry.change})` : ''}`;
    case 'STATUS_CHANGED':
      return `Status changed ${entry.change ?? ''}${entry.text ? `: ${clip(entry.text, 90)}` : ''}`.trim();
    case 'SEVERITY_CHANGED':
      return `Severity changed ${entry.change ?? ''}`.trim();
    case 'ASSIGNED':
      return `Incident ${entry.change ?? 'assignment updated'}`;
    case 'LINKED':
      return 'Affected service updated';
    case 'COMMENT':
    default:
      return entry.text ? `${who} noted: ${clip(entry.text, 110)}` : `${who} posted an update`;
  }
}

function comments(context: CopilotContext): string[] {
  return context.timeline.filter((entry) => entry.type === 'COMMENT' && entry.text).map((entry) => entry.text!);
}

function summary(context: CopilotContext) {
  const { incident } = context;
  const where = incident.affectedService ? ` affecting ${incident.affectedService}` : '';
  const notes = comments(context);
  const bullets = [
    `${incident.severity} incident${where}: "${clip(incident.title, 90)}".`,
    incident.resolvedAt
      ? `Resolved after ${duration(incident.durationMinutes)}.`
      : `Currently ${incident.status.toLowerCase()}, open for ${duration(incident.durationMinutes)}.`,
    `${context.timeline.length} timeline entr${context.timeline.length === 1 ? 'y' : 'ies'} so far, ${notes.length} of them responder notes.`,
  ];
  if (notes.length > 0) bullets.push(`Latest finding: ${clip(notes[notes.length - 1]!, 150)}`);
  if (notes.length > 1) bullets.push(`Earlier: ${clip(notes[notes.length - 2]!, 150)}`);
  bullets.push('Open question: root cause not yet confirmed in the timeline.');
  return { bullets: bullets.slice(0, 5) };
}

const CRITICAL_WORDS = /\b(outage|down|unavailable|data loss|breach|all customers|5\d\d errors?|cannot log ?in)\b/i;
const HIGH_WORDS = /\b(error rate|failing|failed|timeouts?|degraded|elevated errors?|payment|checkout)\b/i;
const LOW_WORDS = /\b(typo|cosmetic|minor|docs?|documentation)\b/i;

function triage(context: CopilotContext) {
  const corpus = [context.incident.title, ...comments(context)].join(' ');
  const severity = CRITICAL_WORDS.test(corpus)
    ? 'CRITICAL'
    : HIGH_WORDS.test(corpus)
      ? 'HIGH'
      : LOW_WORDS.test(corpus)
        ? 'LOW'
        : context.incident.severity;

  const candidates = [...(context.candidates ?? [])].sort((a, b) => {
    if (a.activeOnThisIncident !== b.activeOnThisIncident) return a.activeOnThisIncident ? -1 : 1;
    return a.openIncidentsAssigned - b.openIncidentsAssigned;
  });
  const pick = candidates[0];

  return {
    severity,
    assigneeRef: pick?.ref ?? null,
    rationale:
      severity === context.incident.severity
        ? `Current severity ${severity} matches the reported impact.${pick ? ' Suggested assignee is already involved or has the lightest load.' : ''}`
        : `Timeline wording suggests ${severity} impact rather than ${context.incident.severity}.${pick ? ' Suggested assignee is already involved or has the lightest load.' : ''}`,
  };
}

function statusUpdate(context: CopilotContext) {
  const subject = context.incident.affectedService ? `the ${context.incident.affectedService} service` : 'some of our services';
  const bodies: Record<CopilotContext['incident']['status'], string> = {
    INVESTIGATING: `We are investigating reports of issues affecting ${subject}. Some customers may see errors or slower responses. Our team is actively working on it and we will share another update within 30 minutes.`,
    IDENTIFIED: `We have identified the cause of the issues affecting ${subject} and are working on a fix. Some customers may still see errors in the meantime. We will post another update within 30 minutes.`,
    MONITORING: `A fix has been applied for the issues affecting ${subject} and we are monitoring the results. Service should be returning to normal. We will confirm once everything is fully resolved.`,
    RESOLVED: `The issues affecting ${subject} have been resolved and service is operating normally. We are sorry for the disruption and will share a summary of what happened once our review is complete.`,
  };
  return { body: bodies[context.incident.status] };
}

function postmortem(context: CopilotContext) {
  const { incident } = context;
  const subject = incident.affectedService ?? 'the affected service';
  return {
    timeline: context.timeline.slice(0, 20).map((entry) => `${hhmm(entry.at)} — ${describe(entry)}`),
    impact: `${subject} was impacted at ${incident.severity} severity for ${duration(incident.durationMinutes)}${
      incident.resolvedAt ? '' : ' (incident still open)'
    }. Customer-facing impact should be confirmed against support tickets and error-rate dashboards.`,
    rootCause: 'Not yet confirmed. The timeline does not contain a verified root cause; the incident owner should record it here after review.',
    actionItems: [
      `Confirm and document the root cause for "${clip(incident.title, 60)}".`,
      'Add or tune alerting so this failure mode is detected before customers report it.',
      'Write or update the runbook with the mitigation steps used during this incident.',
      'Schedule a blameless review with everyone who responded.',
    ],
  };
}

const HANDLERS: Record<CopilotTask, (context: CopilotContext) => unknown> = {
  summary,
  triage,
  status_update: statusUpdate,
  postmortem,
};

export function createMockProvider(): AiProvider {
  return {
    name: 'mock',
    model: DEFAULT_MODELS.mock,
    async generate(system: string, user: string, options: GenerateOptions): Promise<GenerateResult> {
      if (options.signal.aborted) throw new Error('aborted');
      const context = parseContextFromPrompt(user);
      if (!context) throw new Error('mock provider: prompt has no incident_context block');
      const text = JSON.stringify(HANDLERS[options.task](context));
      return {
        text,
        promptTokens: estimateTokens(system) + estimateTokens(user),
        completionTokens: estimateTokens(text),
        model: DEFAULT_MODELS.mock,
      };
    },
  };
}
