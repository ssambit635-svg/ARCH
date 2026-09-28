/**
 * ARCH Chat engine — the conversational face of the ARCH model.
 *
 * This is the part the dev team actually talks to: an open-ended conversation with ARCH about the
 * workspace's incidents, its history, its runbooks and ops problems in general. It is deliberately
 * NOT the incident-scoped `answer.ts` engine (that one answers about one incident in the incident
 * page) and it is deliberately not a code generator.
 *
 * Grounding rules, same as everywhere else in ARCH:
 *   - every factual sentence comes from the snapshot it is handed (counts, incidents, services,
 *     members, retrieved runbooks, retrieved past incidents) — never invented;
 *   - every fact is cited, and citations carry a link when one exists;
 *   - when the data is not there, ARCH says so and suggests what would make the answer possible.
 *
 * It is pure: no database, no network, no language model, no clock beyond the injected snapshot.
 * That makes it fast (single-digit milliseconds), free, reproducible and testable.
 *
 * Language: the reply follows the question. Hindi/Hinglish questions get Hinglish answers, English
 * questions get English answers — the team writes in both, so ARCH does too.
 */
import type { IncidentSeverity, IncidentStatus } from '@/generated/prisma/client';
import { AI_NAME } from '@/lib/brand';
import { matchAdvisoryTopic, wantsAdvice } from './advisory';
import { clip, formatDuration } from './text';

// ---------------------------------------------------------------------------------------------
// Session titles
// ---------------------------------------------------------------------------------------------

const TITLE_MAX = 60;

/**
 * Turn the first message into a session title, the way a chat product would: one line, no markdown,
 * no trailing question mark, cut at a word boundary. Purely cosmetic — the full text is always in
 * the transcript.
 */
export function titleFromMessage(message: string): string {
  const cleaned = message
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'New chat';
  const withoutPunctuation = cleaned.replace(/[?!.,;:]+$/g, '');
  if (withoutPunctuation.length <= TITLE_MAX) {
    return withoutPunctuation.charAt(0).toUpperCase() + withoutPunctuation.slice(1);
  }
  const cut = withoutPunctuation.slice(0, TITLE_MAX);
  const boundary = cut.lastIndexOf(' ');
  const title = (boundary > 24 ? cut.slice(0, boundary) : cut).trim();
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}…`;
}

// ---------------------------------------------------------------------------------------------
// Inputs (built by archChat.service — nothing here touches the database)
// ---------------------------------------------------------------------------------------------

export type ChatIncident = {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  service: string | null;
  startedAt: string;
  resolvedAt: string | null;
  /** Minutes from start to resolve (or to now for an open incident). */
  durationMinutes: number | null;
  category: string | null;
  categoryLabel: string | null;
  rootCause: string | null;
  fix: string[];
  prevention: string[];
  assignedTo: string | null;
  /** Set when the row came from retrieval rather than the recent list. */
  similarity?: number;
  matchSource?: 'team' | 'pattern' | 'public';
};

export type ChatService = {
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'MAINTENANCE';
  openIncidents: number;
};

export type ChatMember = { name: string; role: string; openIncidents: number };

export type ChatKnowledgeChunk = {
  sourceName: string;
  heading: string | null;
  text: string;
  url?: string | null;
  similarity: number;
};

export type ChatSnapshot = {
  organizationName: string;
  now: string;
  model: { name: string; version: number; trainedAt: string | null; teamDocuments: number; totalDocuments: number };
  counts: {
    open: number;
    bySeverity: Partial<Record<IncidentSeverity, number>>;
    resolvedLast7Days: number;
    resolvedLast30Days: number;
    totalTracked: number;
    /** Median minutes-to-resolve over the last 30 days, null when there is not enough history. */
    medianResolveMinutes: number | null;
  };
  openIncidents: ChatIncident[];
  recentIncidents: ChatIncident[];
  services: ChatService[];
  members: ChatMember[];
  /** Incidents the ARCH model matched to this question (team history first). */
  matches: ChatIncident[];
  /** Read-only knowledge (public postmortems / pattern library) matched to this question. */
  generalMatches: { title: string; categoryLabel: string | null; rootCause: string | null; fix: string[]; similarity: number }[];
  knowledgeChunks: ChatKnowledgeChunk[];
  /** True when the workspace has at least one indexed knowledge source. */
  hasKnowledge: boolean;
};

export type ChatTurn = { role: 'user' | 'arch'; content: string };

export type ChatCitation = {
  source: 'incident' | 'runbook' | 'past_incident' | 'pattern' | 'service' | 'workspace' | 'playbook';
  label: string;
  detail?: string;
  /** Dashboard link for anything clickable. */
  href?: string;
  similarity?: number;
};

export type ChatIntent =
  | 'greet'
  | 'thanks'
  | 'smalltalk'
  | 'identity'
  | 'help'
  | 'open_incidents'
  | 'recent_incidents'
  | 'incident_search'
  | 'explain_incident'
  | 'stats'
  | 'services'
  | 'team'
  | 'runbook'
  | 'lessons'
  | 'advice'
  | 'code_request'
  | 'unknown';

export type ChatAnswer = {
  answer: string;
  intent: ChatIntent;
  confidence: 'high' | 'medium' | 'low';
  citations: ChatCitation[];
  suggestions: string[];
  lang: ChatLang;
};

export type ChatLang = 'en' | 'hinglish';

// ---------------------------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------------------------

const HINGLISH_MARKERS =
  /\b(kya|kyu|kyun|kaise|kaisa|kaisi|hai|hain|ho|hoon|hu|bata|batao|karo|karu|karun|kaun|kab|kahan|kitna|kitne|kitni|nahi|nahin|haan|han|bhai|yaar|acha|achha|theek|thik|matlab|abhi|phir|wapas|sab|kuch|bhi|apna|hamara|hamare|tum|aap|mera|mere|de|do|raha|rahi|rahe|hua|huyi|hoga|chahiye|dikha|dikhao|batana|samjha|samjhao|pichla|pichhle|pehle|baad|mein|me|ka|ki|ke|se|par|aur|ya|thoda|zyada|bohot|bahut|bal|thoda|sahi|galat|konsa|kaunsa|chal|chalta|chalte|karna|krna|kr|wala|wali|wale|vala|jwab|jawab|sawal|sawaal|namaste|shukriya|dhanyavad)\b/i;

export function detectChatLanguage(question: string): ChatLang {
  if (/[\u0900-\u097F]/.test(question)) return 'hinglish';
  const tokens = question.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (tokens.length === 0) return 'en';
  const hits = tokens.filter((token) => HINGLISH_MARKERS.test(token)).length;
  // Two markers, or a quarter of a short question, is enough — "hai" alone is not.
  return hits >= 2 || (tokens.length <= 4 && hits >= 1) ? 'hinglish' : 'en';
}

/**
 * Copy with a voice. `en` for English questions, `hi` for Hinglish ones; keys are shared so the
 * two versions cannot drift apart.
 */
const SAY = {
  greeting: {
    en: () =>
      `Hey! I'm ${AI_NAME} — your on-call intelligence for this workspace. ` +
      'Ask me about incidents (open, past, one in particular), your runbooks, or any ops problem you are staring at.',
    hinglish: () =>
      `Namaste! Main ${AI_NAME} hoon — is workspace ka on-call intelligence. ` +
      'Incidents (open, purane, koi bhi), runbooks, ya jo bhi ops problem aa rahi ho — pooch lo.',
  },
  help: {
    en: () =>
      'Here is what I can do, in plain words:\n' +
      '• **Incidents** — what is open right now, what happened last week, how long things took.\n' +
      '• **History** — "have we seen payment timeouts before?" — I search every resolved incident, the pattern library and (if you loaded it) public postmortems.\n' +
      '• **Runbooks** — what your own docs say about a topic, cited.\n' +
      '• **Ops advice** — describe a problem ("redis misses spiking, kya karu?") and I walk you through checks, mitigations and prevention.\n' +
      '• **Your model** — what I have learned from this workspace, how accurate it is, how training works.\n\n' +
      'I do not write code and I never change anything by myself — Code Assist (Review / Fix / Thinker) is the coding surface. Everything I say is advice for a human to verify.',
    hinglish: () =>
      'Main ye kaam karta hoon:\n' +
      '• **Incidents** — abhi kya open hai, pichhle hafte kya hua, kitna time laga.\n' +
      '• **History** — "payment timeouts pehle bhi hue the?" — main har resolved incident, pattern library aur public postmortems (agar load kiye hain) search karta hoon.\n' +
      '• **Runbooks** — aapke docs kya kehte hain, citation ke saath.\n' +
      '• **Ops advice** — problem batao ("redis misses badh rahe hain, kya karu?") — checks, mitigation aur prevention step by step.\n' +
      '• **Aapka model** — is workspace se maine kya seekha, accuracy kitni hai, training kaise hoti hai.\n\n' +
      'Code main likhta nahi hoon, aur khud se kuch change bhi nahi karta — code ke liye Code Assist (Review / Fix / Thinker) hai. Meri baat advice hai, verify karke use karo.',
  },
  thanks: {
    en: () => 'Any time. Ping me whenever the picture changes — I will be right here.',
    hinglish: () => 'Koi baat nahi! Jab bhi picture badle, bata dena — main yahin hoon.',
  },
  smalltalk: {
    en: () => 'Running fine, thanks — no incidents in my own stack today. How is the on-call shift treating you?',
    hinglish: () => 'Main ekdum fit hoon, thanks — mere stack mein aaj koi incident nahi. Aapki on-call shift kaisi chal rahi hai?',
  },
  identity: {
    en: (model: string) =>
      `I am ${AI_NAME} — ARCH's own native model (\`${model}\`). I run on this server on CPU, with no API key and no external vendor: the classifiers, retrieval and templates are all ARCH's own code, trained on this workspace's incidents.`,
    hinglish: (model: string) =>
      `Main ${AI_NAME} hoon — ARCH ka apna native model (\`${model}\`). Sab kuch isi server par, CPU par chalta hai — na API key, na koi external vendor. Classifier, retrieval aur templates sab ARCH ka apna code hai, jo is workspace ke incidents par train hota hai.`,
  },
  codeRefusal: {
    en: () =>
      'Code likhna ARCH Chat ka kaam nahi hai — I will not generate or patch code here, and I am not a coding agent. Two deliberate reasons: (1) a wrong snippet pasted into production is worse than no snippet, and (2) code needs the repo, not a chat window.\n\nWhat I *can* do: explain the failure behind a stack trace, point you at the past incident that matches it, and tell you what usually fixed it. For actual code, use **Code Assist → Review** (findings + fixed code), **Fix** (safe mechanical fixes) or **Thinker** (boilerplate snippet, file path and what breaks if you paste it blind).',
    hinglish: () =>
      'Code likhna ARCH Chat ka kaam nahi hai — main yahan code generate ya patch nahi karta, aur coding agent bhi nahi hoon. Do sochne wali baatein: (1) production mein paste kiya galat snippet, na hone se zyada kharab hai, aur (2) code ke liye repo chahiye, chat window nahi.\n\nMain ye kar sakta hoon: stack trace ke peeche ka failure samjha sakta hoon, matching past incident dikha sakta hoon, aur batana ki usse aam taur par kaise fix kiya gaya. Actual code ke liye **Code Assist → Review** (findings + fixed code), **Fix** (safe mechanical fixes) ya **Thinker** (boilerplate snippet + file path + paste-risks) use karo.',
  },
  unknown: {
    en: () =>
      'I did not quite catch what you are after. I am strongest on: what is open right now, what happened before, what your runbooks say, and how to approach a problem you describe.',
    hinglish: () =>
      'Mujhe theek se samajh nahi aaya aap kya chahte ho. Main in cheezon mein sabse acha hoon: abhi kya open hai, pehle kya hua tha, aapke runbooks kya kehte hain, aur kisi problem ko kaise handle karna hai.',
  },
} as const;

function say(key: keyof typeof SAY, lang: ChatLang, ...args: string[]): string {
  const entry = SAY[key] as unknown as Record<ChatLang, (...rest: string[]) => string>;
  return entry[lang](...args);
}

// ---------------------------------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------------------------------

type IntentRule = { id: ChatIntent; patterns: RegExp[]; weight?: number };

/** Social intents never override a real question ("thanks — what's open?" is an incidents question). */
const SOCIAL = new Set<ChatIntent>(['greet', 'thanks', 'smalltalk', 'help', 'identity']);

const INTENT_RULES: IntentRule[] = [
  {
    id: 'code_request',
    weight: 3,
    patterns: [
      /\b(write|generate|create|give me|likh|bana|banao|bana do)\b[^.]{0,30}\b(code|function|class|component|script|snippet|api|endpoint|query|patch|pr|test case)\b/i,
      /\b(refactor|implement)\b[^.]{0,30}\b(function|code|api|endpoint|class)\b/i,
      /\bcode (likh|bana|generate|de|do)\b/i,
      /\b(fix this code|optimise this code|optimize this code|rewrite this|write a regex|write me a)\b/i,
    ],
  },
  {
    id: 'open_incidents',
    weight: 2,
    patterns: [
      /\b(what'?s? (open|broken|down|on fire|failing)|what (is|are) (open|broken|down|failing)|anything (open|down|broken|failing)|(open|live|current|active) incidents?|any incidents?|koi incidents?|kya (kuch )?(open|down|tuta|chal raha|problem)|abhi kya (open|problem|chal raha)|kuch (open|down)|kaunse incidents?|kitne incidents? open|on fire)\b/i,
    ],
  },
  {
    id: 'recent_incidents',
    patterns: [
      /\b(recent|last (week|few days|month)|latest|yesterday|today|pichhl[ea]|pichl[ea]|haal hi|abhi tak ke|history of incidents|incident list|list.*incidents|incidents? (dikha|bata|list)|sab incidents?)\b/i,
    ],
  },
  {
    id: 'incident_search',
    weight: 2,
    patterns: [
      /\b(have we seen|happened before|before this|last time|similar|recurr|pehle bhi|pehle hua|pichhli baar|pichli baar|kabhi hua|repeat|seen this)\b/i,
      /\b(search|find|khoj|dhoondh|talash|dhundh|match)\b[^.]{0,40}\b(incident|outage|failure|error|issue|problem|crash|timeout|hoga|hua)\b/i,
      /\bwhich incidents? (had|have|matched|were about)\b/i,
    ],
  },
  {
    id: 'lessons',
    patterns: [
      /\b(what did we learn|lessons? learned|post-?mortem|retro|root cause of|what caused|why did .* (happen|fail)|kya seekha|sabak|kya wajah thi|reason kya tha)\b/i,
    ],
  },
  {
    id: 'stats',
    patterns: [
      /\b(how many incidents?|how (are|is) we doing|mttr|mean time to|average (time|duration)|median|stats?|statistics|metrics?|numbers?|severity (breakdown|mix|distribution)|trends?|kitne|kitna time lagta|ao?r kitne|summary of (the )?month|dashboard numbers)\b/i,
    ],
  },
  {
    id: 'team',
    weight: 1,
    patterns: [
      /\b(who('?s| is| are)?\s+(on|in)\s+(the\s+)?(team|call|shift|roster)|team\s+(members?|roster)|(list|show)\s+(me\s+)?(the\s+)?team|assignees?|who\s+(is|are)\s+(assigned|working|on\s+call)|kaun\s*kaun\s+(hai|hain)|team\s+mein\s+kaun|kaun\s+(hai|hain)\s+(team|on\s*call)|kaun\s+(dekh\s+raha|assigned)|roster|members?\s+(list|kaunse))\b/i,
    ],
  },
  {
    id: 'services',
    patterns: [/\b(services?|service status|which services|kya (degraded|down) hai|degraded|status of (my|our) services?|service (list|health|dikha))\b/i],
  },
  {
    id: 'runbook',
    patterns: [
      /\b(runbook|playbook|procedure|process|checklist|check ?list|doc(ument)?s?|guide|policy|sop|knowledge base|kya likha hai|doc kya kehta|runbook kya)\b/i,
    ],
  },
  {
    id: 'explain_incident',
    patterns: [
      /\b(about (the|that) .*(incident|outage|issue)|explain (the|that|this)|tell me about|bata(o)? .* ke bare|kya hua tha|details? of|what happened (with|in|to)|status of)\b/i,
    ],
  },
  {
    id: 'identity',
    weight: 3,
    patterns: [
      /\b(who are you|what are you|tum kaun|aap kaun|tumhara naam|your name|what model|kis model|which model|are you (gpt|chatgpt|claude|openai|anthropic|gemini)|kya tum (gpt|chatgpt|claude)|did (openai|anthropic) (make|build) you)\b/i,
    ],
  },
  {
    id: 'help',
    weight: 3,
    patterns: [
      /\b(what can you do|what do you do|help me use|capabilit|features? of|how (do|does) (you|arch)( chat)? work|tum kya kar sakte|aap kya kar sakte|kaise use karu|kaise kaam karta|kya kya kar sakte)\b/i,
    ],
  },
  {
    id: 'advice',
    weight: 2,
    patterns: [
      /\b(kya kar(u|un)?|kaise (solve|fix|thik|theek|sahi|handle|deal|manage)|how (do|can|should) (i|we)|how to|what should i do about|solution|upay|samadhan|best practice|tips|prevent|reduce|improve|guide me|advice|suggest(ion)?s?)\b/i,
    ],
  },
  {
    id: 'greet',
    weight: 3,
    patterns: [/^(hi|hey|hello|yo|namaste|namaskar|salaam|good (morning|afternoon|evening)|hii+|helo)\b[\s!.]*$/i, /\b(kaise ho|kya haal|how are you|kaise hain)\b/i],
  },
  {
    id: 'thanks',
    weight: 3,
    patterns: [/\b(thanks?|thank you|thx|shukriya|shukria|dhanyavad|dhanyavaad|badhiya|bahut badhiya|great help|nice work|helpful)\b/i],
  },
  {
    id: 'smalltalk',
    patterns: [/\b(tumhara din|how'?s? your day|what'?s up|kya chal raha hai tumhara|bored|joke|mazak|kaisi chal rahi)\b/i],
  },
];

export function classifyChatIntent(question: string): ChatIntent {
  const scores = new Map<ChatIntent, number>();
  for (const rule of INTENT_RULES) {
    let hits = 0;
    for (const pattern of rule.patterns) if (pattern.test(question)) hits += 1;
    if (hits > 0) scores.set(rule.id, (scores.get(rule.id) ?? 0) + hits * (rule.weight ?? 1));
  }
  if (scores.size === 0) return 'unknown';
  const ranked = [...scores.entries()].sort((a, b) => {
    const socialA = SOCIAL.has(a[0]) ? 1 : 0;
    const socialB = SOCIAL.has(b[0]) ? 1 : 0;
    if (socialA !== socialB && a[1] !== b[1]) return socialA - socialB; // real question wins ties
    if (b[1] !== a[1]) return b[1] - a[1];
    return socialA - socialB;
  });
  return ranked[0]![0];
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function severityLabel(severity: IncidentSeverity): string {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

function statusLabel(status: IncidentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function serviceStatusLabel(status: ChatService['status']): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function day(iso: string): string {
  return iso.slice(0, 10);
}

function when(iso: string): string {
  return `${day(iso)} ${iso.slice(11, 16)}`;
}

function ageMinutes(iso: string, now: string): number {
  return Math.max(0, Math.round((Date.parse(now) - Date.parse(iso)) / 60_000));
}

function openAgeText(incident: ChatIncident, now: string): string {
  const minutes = incident.durationMinutes ?? ageMinutes(incident.startedAt, now);
  return minutes < 1 ? 'just now' : formatDuration(minutes);
}

function bullet(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

/**
 * A timeline sentence often already reads "Root cause: ...". When ARCH quotes it after its own
 * "Root cause:" label, the prefix is stripped once so the answer does not stutter.
 */
function cleanCause(text: string): string {
  return text.replace(/^\s*(root\s*cause|cause|reason|karan|vajah|wajah)\s*[:\-–]\s*/i, '').trim();
}

function incidentLine(incident: ChatIncident, now: string): string {
  const service = incident.service ? ` on ${incident.service}` : '';
  const tail =
    incident.status === 'RESOLVED' && incident.durationMinutes !== null
      ? `resolved in ${formatDuration(incident.durationMinutes)}`
      : `open ${openAgeText(incident, now)}`;
  return `**${incident.title}**${service} — ${severityLabel(incident.severity)}, ${statusLabel(incident.status)}, ${tail}`;
}

function incidentCitations(incidents: ChatIncident[], max = 3): ChatCitation[] {
  return incidents.slice(0, max).map((incident) => {
    const citation: ChatCitation = {
      source: incident.matchSource === 'pattern' || incident.matchSource === 'public' ? 'past_incident' : 'incident',
      label: incident.title,
      detail: [incident.categoryLabel, incident.rootCause ? clip(cleanCause(incident.rootCause), 200) : null].filter(Boolean).join(' · ') || undefined,
      href: incident.matchSource === 'team' || !incident.matchSource ? `/dashboard/incidents/${incident.id}` : undefined,
    };
    if (typeof incident.similarity === 'number') citation.similarity = incident.similarity;
    return citation;
  });
}

/** A question that names a service, a severity or a word from an incident title picks that incident up. */
function findNamedIncident(question: string, snapshot: ChatSnapshot): ChatIncident | null {
  const pool = [...snapshot.matches, ...snapshot.openIncidents, ...snapshot.recentIncidents];
  if (pool.length === 0) return null;
  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
  if (tokens.length === 0) return pool[0]!;

  let best: { incident: ChatIncident; score: number } | null = null;
  for (const incident of pool) {
    const haystack = `${incident.title} ${incident.service ?? ''} ${incident.categoryLabel ?? ''}`.toLowerCase();
    let score = 0;
    for (const token of tokens) if (haystack.includes(token)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { incident, score };
  }
  return best?.incident ?? null;
}

const STOPWORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'have', 'has', 'had', 'does', 'did', 'doing',
  'about', 'there', 'their', 'them', 'then', 'than', 'with', 'from', 'into', 'your', 'yours', 'ours', 'please', 'tell', 'show',
  'give', 'want', 'need', 'know', 'kya', 'kaise', 'kaun', 'kab', 'kahan', 'kitna', 'kitne', 'bata', 'batao', 'hua', 'huan',
  'tha', 'thi', 'the', 'hai', 'hain', 'kar', 'karo', 'raha', 'rahi', 'baare', 'bare', 'mein', 'more', 'most', 'last', 'time',
  'some', 'again', 'happened', 'incident', 'incidents', 'issue', 'issues', 'problem', 'problems', 'outage', 'error', 'errors',
]);

// ---------------------------------------------------------------------------------------------
// Answer builders
// ---------------------------------------------------------------------------------------------

function emptyWorkspaceHint(lang: ChatLang): string {
  return lang === 'hinglish'
    ? 'Is workspace mein abhi koi incident record nahi hai. Monitoring webhook ya dashboard se pehla incident declare karo — jaise hi data aayega, main uspar jawab de sakta hoon.'
    : 'There are no incidents recorded in this workspace yet. Declare one from the dashboard or start sending alerts to a webhook endpoint — as soon as there is data, I can answer from it.';
}

function answerOpenIncidents(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const open = snapshot.openIncidents;
  const critical = open.filter((incident) => incident.severity === 'CRITICAL' || incident.severity === 'HIGH');

  if (open.length === 0) {
    const text =
      lang === 'hinglish'
        ? `Aaj sab shaant hai — koi incident open nahi hai. Pichhle 7 din mein ${snapshot.counts.resolvedLast7Days} resolve hue${snapshot.counts.resolvedLast30Days ? `, 30 din mein ${snapshot.counts.resolvedLast30Days}` : ''}.`
        : `All quiet — nothing is open right now. ${snapshot.counts.resolvedLast7Days} incident${snapshot.counts.resolvedLast7Days === 1 ? '' : 's'} resolved in the last 7 days${snapshot.counts.resolvedLast30Days ? `, ${snapshot.counts.resolvedLast30Days} in the last 30` : ''}.`;
    return { text, cites: [], suggestions: ['Show me recent incidents', 'How are we doing this month?', 'What should I watch out for?'], confidence: 'high' };
  }

  const lines = open.slice(0, 6).map((incident) => incidentLine(incident, snapshot.now));
  // Only mention severity when it adds information: "1 of 1 is HIGH" is noise.
  const severityClause =
    critical.length === 0
      ? ''
      : critical.length < open.length
        ? lang === 'hinglish'
          ? ` — inme se ${critical.length} HIGH/CRITICAL`
          : ` — ${critical.length} of them ${critical.length === 1 ? 'is' : 'are'} HIGH or CRITICAL`
        : open.length === 1
          ? ''
          : lang === 'hinglish'
            ? ' — sab HIGH/CRITICAL'
            : ' — all of them HIGH or CRITICAL';
  const headline =
    lang === 'hinglish'
      ? `${open.length} incident open ${open.length === 1 ? 'hai' : 'hain'}${severityClause}. Sabse purana ${openAgeText(open[0]!, snapshot.now)} se chal raha hai:`
      : `${open.length} incident${open.length === 1 ? ' is' : 's are'} open${severityClause}. The oldest has been running ${openAgeText(open[0]!, snapshot.now)}:`;
  const tail =
    lang === 'hinglish'
      ? 'Pehle sabse purane HIGH/CRITICAL par focus karo — open incidents ka kaam wahi hai. Kisi bhi incident ka naam lo aur main uske timeline se poochho-answer karunga.'
      : 'Work the oldest HIGH/CRITICAL first — that is the queue. Name any of them and I will answer from its timeline.';
  return {
    text: `${headline}\n\n${bullet(lines)}\n\n${tail}`,
    cites: incidentCitations(open, 4),
    suggestions: open[0] ? [`Tell me about "${clip(open[0].title, 60)}"`, 'What should I do next?', 'Have we seen this before?'] : [],
    confidence: 'high',
  };
}

function answerRecentIncidents(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const recent = snapshot.recentIncidents;
  if (recent.length === 0) {
    return { text: emptyWorkspaceHint(lang), cites: [], suggestions: ['What can you do?', 'How does training work?'], confidence: 'low' };
  }
  const lines = recent.slice(0, 8).map((incident) => `${incidentLine(incident, snapshot.now)} · ${when(incident.startedAt)}`);
  const head = lang === 'hinglish' ? `Last ke ${recent.length} resolved incidents:` : `The last ${recent.length} incidents I have on record:`;
  const tail =
    lang === 'hinglish'
      ? `Average resolve time pichhle 30 din mein ${snapshot.counts.medianResolveMinutes !== null ? formatDuration(snapshot.counts.medianResolveMinutes) : 'abhi measure nahi hua'}. Kai incidents ek hi category mein hain? Poocho "kya repeat ho raha hai" — main pattern nikal dunga.`
      : `Median time to resolve over the last 30 days: ${snapshot.counts.medianResolveMinutes !== null ? formatDuration(snapshot.counts.medianResolveMinutes) : 'not measurable yet (needs 3+ resolved incidents)'}. Ask me which ones recur and I will pull the pattern out.`;
  return {
    text: `${head}\n\n${bullet(lines)}\n\n${tail}`,
    cites: incidentCitations(recent, 3),
    suggestions: ['Which incidents keep repeating?', 'What is open right now?', 'What did we learn from these?'],
    confidence: 'high',
  };
}

function answerStats(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const { counts, services } = snapshot;
  const severityParts = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as IncidentSeverity[])
    .map((severity) => [severity, counts.bySeverity[severity] ?? 0] as const)
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => `${severity}: ${count}`);

  const busiest = [...services].sort((a, b) => b.openIncidents - a.openIncidents)[0];
  const lines = [
    lang === 'hinglish' ? `Open: ${counts.open}` : `Open now: ${counts.open}`,
    `${lang === 'hinglish' ? 'Resolved (7 din)' : 'Resolved (7 days)'}: ${counts.resolvedLast7Days}`,
    `${lang === 'hinglish' ? 'Resolved (30 din)' : 'Resolved (30 days)'}: ${counts.resolvedLast30Days}`,
    `${lang === 'hinglish' ? 'Median resolve time (30 din)' : 'Median time to resolve (30 days)'}: ${counts.medianResolveMinutes !== null ? formatDuration(counts.medianResolveMinutes) : '—'}`,
    `${lang === 'hinglish' ? 'Open severity mix' : 'Open by severity'}: ${severityParts.length ? severityParts.join(', ') : '—'}`,
  ];

  const extra =
    busiest && busiest.openIncidents > 0
      ? lang === 'hinglish'
        ? ` Sabse zyada open incidents ${busiest.name} par hain (${busiest.openIncidents}).`
        : ` ${busiest.name} carries the most open incidents (${busiest.openIncidents}).`
      : '';

  return {
    text:
      (lang === 'hinglish' ? 'Yeh numbers is workspace ke apne data se hain:\n\n' : 'Numbers straight from this workspace:\n\n') +
      bullet(lines) +
      extra,
    cites: [{ source: 'workspace', label: `${counts.totalTracked} incidents on record`, detail: `${snapshot.counts.open} open · ${snapshot.counts.resolvedLast30Days} resolved in 30 days` }],
    suggestions: ['What is open right now?', 'Which incidents keep repeating?', 'How accurate is your model?'],
    confidence: 'high',
  };
}

function answerServices(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  if (snapshot.services.length === 0) {
    const text =
      lang === 'hinglish'
        ? 'Is workspace mein abhi koi service register nahi hai. Project & services page se services add karo — phir main unka status bata sakta hoon.'
        : 'No services are registered yet. Add them under Projects & services — then I can report their status and blast radius.';
    return { text, cites: [], suggestions: ['What can you do?', 'Show me recent incidents'], confidence: 'low' };
  }
  const hurting = snapshot.services.filter((service) => service.status !== 'OPERATIONAL' || service.openIncidents > 0);
  const lines = (hurting.length ? hurting : snapshot.services)
    .slice(0, 8)
    .map((service) => `**${service.name}** — ${serviceStatusLabel(service.status)}${service.openIncidents ? `, ${service.openIncidents} open incident${service.openIncidents === 1 ? '' : 's'}` : ''}`);
  const head =
    hurting.length === 0
      ? lang === 'hinglish'
        ? `Saari ${snapshot.services.length} services operational hain, koi open incident nahi.`
        : `All ${snapshot.services.length} services are operational, with no open incidents.`
      : lang === 'hinglish'
        ? `${hurting.length} service${hurting.length === 1 ? '' : 's'} par dhyan chahiye:`
        : `${hurting.length} service${hurting.length === 1 ? '' : 's'} need attention:`;
  return {
    text: `${head}\n\n${bullet(lines)}`,
    cites: hurting.slice(0, 3).map((service) => ({ source: 'service' as const, label: service.name, detail: `${serviceStatusLabel(service.status)} · ${service.openIncidents} open` })),
    suggestions: ['What is open right now?', 'Which service fails most often?', 'What should I watch out for?'],
    confidence: 'high',
  };
}

function answerTeam(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  if (snapshot.members.length === 0) {
    return { text: emptyWorkspaceHint(lang), cites: [], suggestions: ['What can you do?'], confidence: 'low' };
  }
  const lines = snapshot.members
    .slice(0, 12)
    .map((member) => `**${member.name}** — ${member.role.toLowerCase()}${member.openIncidents ? `, ${member.openIncidents} open assigned` : ''}`);
  const load = [...snapshot.members].sort((a, b) => b.openIncidents - a.openIncidents)[0];
  const tail =
    load && load.openIncidents > 1
      ? lang === 'hinglish'
        ? `${load.name} ke paas sabse zyada open assignments hain (${load.openIncidents}) — distribute karne layak hai.`
        : `${load.name} is carrying the most open assignments (${load.openIncidents}) — worth redistributing.`
      : lang === 'hinglish'
        ? 'Assignment ka load abhi balanced lag raha hai.'
        : 'Assignment load looks balanced right now.';
  return {
    text: (lang === 'hinglish' ? 'Team roster aur current load:\n\n' : 'Team roster and current load:\n\n') + bullet(lines) + `\n\n${tail}`,
    cites: [],
    suggestions: ['What is open right now?', 'Who has not updated an incident in a while?'],
    confidence: 'high',
  };
}

function answerSearch(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const team = snapshot.matches.filter((match) => match.matchSource !== 'pattern' && match.matchSource !== 'public');
  const general = snapshot.matches.filter((match) => match.matchSource === 'pattern' || match.matchSource === 'public');

  if (team.length === 0 && general.length === 0 && snapshot.generalMatches.length === 0) {
    const text =
      lang === 'hinglish'
        ? 'Mujhe is workspace ki history mein isse milta-julta kuch nahi mila. Ya to yeh pehli baar ho raha hai, ya description mein thode aur keywords chahiye — symptom likho (error, timeout, service ka naam) aur dobara poochho.'
        : 'Nothing in this workspace\'s history matches that yet. Either this is the first time, or I need a few more keywords — add the symptom (error text, timeout, service name) and ask again.';
    return { text, cites: [], suggestions: ['What is open right now?', 'Show me recent incidents', 'How does the model match past incidents?'], confidence: 'low' };
  }

  const parts: string[] = [];
  if (team.length === 0) {
    parts.push(
      lang === 'hinglish'
        ? 'Aapke apne incidents ki history mein isse milta-julta kuch nahi hai.'
        : 'Nothing in your own incident history matches this yet.',
    );
  }
  if (team.length) {
    parts.push(
      lang === 'hinglish'
        ? `Haan — is workspace mein ${team.length} milta-julta incident mila:`
        : `Yes — ${team.length} matching incident${team.length === 1 ? '' : 's'} from this workspace:`,
    );
    for (const incident of team.slice(0, 4)) {
      const line = incidentLine(incident, snapshot.now);
      const lesson = incident.rootCause ? `\n   Root cause: ${clip(cleanCause(incident.rootCause), 220)}` : '';
      const fix = incident.fix.length ? `\n   What fixed it: ${clip(incident.fix.slice(0, 2).join(' '), 240)}` : '';
      parts.push(`${line}${lesson}${fix}`);
    }
  }
  if (general.length || snapshot.generalMatches.length) {
    const refs = [
      ...general.map((match) => ({ title: match.title, rootCause: match.rootCause ? cleanCause(match.rootCause) : null, fix: match.fix, similarity: match.similarity })),
      ...snapshot.generalMatches,
    ].slice(0, 2);
    parts.push(
      lang === 'hinglish'
        ? 'Pattern library / public postmortems mein bhi milta-julta case hai:'
        : 'The pattern library and public postmortems have matches too:',
    );
    for (const ref of refs) {
      parts.push(`**${clip(ref.title, 110)}**${ref.rootCause ? ` — ${clip(ref.rootCause, 200)}` : ''}${ref.fix.length ? `\n   Usually fixed by: ${clip(ref.fix.slice(0, 2).join(' '), 200)}` : ''}`);
    }
  }

  const tail =
    lang === 'hinglish'
      ? 'Bharosa sirf apne incidents par zyada rakho — pattern library general guidance hai, aapka data nahi. Kisi bhi incident ka naam lo aur main timeline se detail dunga.'
      : 'Trust your own incidents first — the library is general guidance, not your data. Name any of them and I will go deeper into its timeline.';
  return {
    text: `${parts.join('\n\n')}\n\n${tail}`,
    cites: [...incidentCitations(team, 3), ...snapshot.generalMatches.slice(0, 1).map((match) => ({ source: 'pattern' as const, label: match.title, detail: match.rootCause ? clip(match.rootCause, 200) : undefined, similarity: match.similarity }))],
    suggestions: ['What is open right now?', 'What should I do next?', 'Which incidents keep repeating?'],
    confidence: team.length ? 'high' : 'medium',
  };
}

function answerLessons(question: string, snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const subject = findNamedIncident(question, snapshot) ?? snapshot.matches[0] ?? snapshot.recentIncidents[0] ?? null;
  if (!subject) {
    return { text: emptyWorkspaceHint(lang), cites: [], suggestions: ['Show me recent incidents'], confidence: 'low' };
  }
  const parts: string[] = [];
  parts.push(
    lang === 'hinglish'
      ? `**${subject.title}** ke baare mein jo record hai:`
      : `Here is what the record says about **${subject.title}**:`,
  );
  if (subject.rootCause) parts.push(`• Root cause: ${clip(cleanCause(subject.rootCause), 400)}`);
  if (subject.fix.length) parts.push(`• ${lang === 'hinglish' ? 'Fix' : 'Fix'}: ${clip(subject.fix.slice(0, 3).join(' '), 400)}`);
  if (subject.prevention.length) parts.push(`• ${lang === 'hinglish' ? 'Prevention' : 'Prevention'}: ${clip(subject.prevention.slice(0, 3).join(' '), 400)}`);
  if (parts.length === 1) {
    parts.push(
      lang === 'hinglish'
        ? 'Timeline mein abhi root cause ya fix likha nahi hai — isliye main kuch bana kar nahi bataunga. Postmortem draft generate karo (incident page → Copilot) ya timeline mein cause likho, phir poochho.'
        : 'There is no recorded root cause or fix on the timeline yet, and I will not invent one. Generate a postmortem draft from the incident page (Copilot) or add the cause to the timeline, then ask me again.',
    );
  }
  parts.push(
    lang === 'hinglish'
      ? `Yeh ${subject.resolvedAt ? `${formatDuration(subject.durationMinutes ?? 0)} mein resolve hua` : `abhi ${openAgeText(subject, snapshot.now)} se open hai`}${subject.categoryLabel ? `, category ${subject.categoryLabel}` : ''}.`
      : `It ${subject.resolvedAt ? `resolved in ${formatDuration(subject.durationMinutes ?? 0)}` : `has been open for ${openAgeText(subject, snapshot.now)}`}${subject.categoryLabel ? `, category ${subject.categoryLabel}` : ''}.`,
  );
  return {
    text: parts.join('\n'),
    cites: incidentCitations([subject], 1),
    suggestions: ['Which incidents keep repeating?', 'What is open right now?', 'What are the open gaps on this incident?'],
    confidence: subject.rootCause ? 'high' : 'medium',
  };
}

function answerExplainIncident(question: string, snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const incident = findNamedIncident(question, snapshot) ?? snapshot.matches[0] ?? snapshot.openIncidents[0] ?? snapshot.recentIncidents[0] ?? null;
  if (!incident) return answerRecentIncidents(snapshot, lang);
  return answerLessons(question, snapshot, lang);
}

function answerRunbook(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const chunks = snapshot.knowledgeChunks.filter((chunk) => chunk.similarity >= 0.08);
  if (chunks.length === 0) {
    const text = snapshot.hasKnowledge
      ? lang === 'hinglish'
        ? 'Aapke knowledge base mein is topic par kuch nahi mila. Source ka naam ya keyword thoda alag likh ke dekho, ya Knowledge page se runbook add karo.'
        : 'I could not find anything on that topic in your knowledge base. Try a different keyword or source name — or add the runbook on the Knowledge page.'
      : lang === 'hinglish'
        ? 'Workspace ka knowledge base abhi khaali hai, isliye main kisi runbook ka hawala nahi de sakta. Knowledge page se runbook ya doc paste karo (ya public URL fetch karo) — indexing ke baad main usse cite karke jawab dunga.'
        : 'The workspace knowledge base is empty, so I have no runbook to cite. Paste a runbook or doc on the Knowledge page (or fetch a public URL) — once it is indexed I answer from it with citations.';
    return { text, cites: [], suggestions: ['What is open right now?', 'How do I add a runbook?', 'What should I do next?'], confidence: 'low' };
  }
  const parts = chunks.slice(0, 2).map((chunk, index) => {
    const title = chunk.heading ? `${chunk.sourceName} → ${chunk.heading}` : chunk.sourceName;
    return `${index + 1}. **${title}**: ${clip(chunk.text, 600)}`;
  });
  return {
    text: (lang === 'hinglish' ? 'Aapke apne knowledge base se:\n\n' : 'From your own knowledge base:\n\n') + parts.join('\n\n'),
    cites: chunks.slice(0, 3).map((chunk) => ({
      source: 'runbook' as const,
      label: `${chunk.sourceName}${chunk.heading ? ` — ${chunk.heading}` : ''}`,
      detail: clip(chunk.text, 300),
      similarity: chunk.similarity,
    })),
    suggestions: ['What is open right now?', 'Has this happened before?', 'What should I watch out for?'],
    confidence: chunks[0]!.similarity >= 0.25 ? 'high' : 'medium',
  };
}

function answerAdvice(question: string, snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const match = matchAdvisoryTopic(question);
  const parts: string[] = [];
  const cites: ChatCitation[] = [];

  if (match) {
    const playbook = match.playbook;
    cites.push({ source: 'playbook', label: `Playbook: ${playbook.label}`, detail: clip(playbook.usuallyIs, 240) });
    parts.push(lang === 'hinglish' ? `Yeh ${playbook.label.toLowerCase()} jaisa lagta hai. Aam taur par: ${playbook.usuallyIs}` : `This looks like ${playbook.label.toLowerCase()}. It usually is: ${playbook.usuallyIs}`);
    parts.push(`${lang === 'hinglish' ? 'Pehle yeh dekho' : 'Check first'}:\n${bullet(playbook.checks.slice(0, 4))}`);
    parts.push(`${lang === 'hinglish' ? 'Jo aam taur par fix karta hai' : 'What usually fixes it'}:\n${bullet(playbook.fixes.slice(0, 3))}`);
    parts.push(`${lang === 'hinglish' ? 'Prevention' : 'Prevention'}:\n${bullet(playbook.prevention.slice(0, 2))}`);
  } else {
    parts.push(
      lang === 'hinglish'
        ? 'Is exact problem ka playbook mere paas nahi hai, lekin kisi bhi production issue ke liye yeh approach kaam karti hai:\n' +
          bullet([
            'Recent kya change hua — deploy, config, traffic — aur symptom kab shuru hua, dono ko line up karo.',
            'Symptom kahan shuru hota hai — DNS → LB → app → DB, pehla failing tier dhoondho.',
            'Scope: ek tenant/endpoint ya sab? Ek region ya sab?',
            'Diagnose se pehle mitigate karo (rollback, failover, load shed), phir recovered system par root cause fix karo.',
          ])
        : 'I do not have a playbook for that exact problem, but this approach works for almost any production issue:\n' +
          bullet([
            'What changed recently — deploys, config, traffic — lined up with when the symptom started.',
            'Where the symptom begins: walk the request path (DNS → LB → app → DB) to the first failing tier.',
            'Scope it: one tenant/endpoint or everyone? One region or all?',
            'Mitigate before you fully diagnose (rollback, failover, shed load), then fix the root cause on the recovered system.',
          ]),
    );
  }

  if (snapshot.knowledgeChunks.length) {
    const chunk = snapshot.knowledgeChunks[0]!;
    parts.push(
      lang === 'hinglish'
        ? `Aapke runbook "${chunk.sourceName}"${chunk.heading ? ` → ${chunk.heading}` : ''} bhi isse match karta hai: ${clip(chunk.text, 300)}`
        : `Your runbook "${chunk.sourceName}"${chunk.heading ? ` → ${chunk.heading}` : ''} matches this too: ${clip(chunk.text, 300)}`,
    );
    cites.push({ source: 'runbook', label: `${chunk.sourceName}${chunk.heading ? ` — ${chunk.heading}` : ''}`, detail: clip(chunk.text, 300), similarity: chunk.similarity });
  }

  if (snapshot.matches.length) {
    const past = snapshot.matches[0]!;
    parts.push(
      lang === 'hinglish'
        ? `Is workspace mein milta-julta incident: **${past.title}**${past.rootCause ? ` — root cause: ${clip(cleanCause(past.rootCause), 200)}` : ''}${past.fix.length ? `. Fix: ${clip(past.fix.slice(0, 2).join(' '), 200)}` : ''}`
        : `Closest incident in this workspace: **${past.title}**${past.rootCause ? ` — root cause: ${clip(cleanCause(past.rootCause), 200)}` : ''}${past.fix.length ? `. Fix: ${clip(past.fix.slice(0, 2).join(' '), 200)}` : ''}`,
    );
    cites.push(...incidentCitations([past], 1));
  }

  parts.push(
    lang === 'hinglish'
      ? 'Yeh verify karne wali advice hai, command nahi — jo mile wo incident timeline mein likhte jao.'
      : 'This is advice to verify, not a command — write what you find into the incident timeline as you go.',
  );

  return {
    text: parts.join('\n\n'),
    cites,
    suggestions: lang === 'hinglish'
      ? ['Iske liye koi past incident hai?', 'Abhi kya open hai?', 'Runbook mein kya likha hai?']
      : ['Has this happened before?', 'What is open right now?', 'What does the runbook say?'],
    confidence: match ? 'medium' : 'low',
  };
}

function answerUnknown(snapshot: ChatSnapshot, lang: ChatLang): { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] } {
  const open = snapshot.openIncidents.length;
  const state =
    open > 0
      ? lang === 'hinglish'
        ? `Abhi ${open} incident open hain.`
        : `There ${open === 1 ? 'is' : 'are'} ${open} incident${open === 1 ? '' : 's'} open right now.`
      : lang === 'hinglish'
        ? 'Abhi kuch open nahi hai.'
        : 'Nothing is open right now.';
  return {
    text: `${say('unknown', lang)}\n\n${state}`,
    cites: [],
    suggestions: ['What is open right now?', 'Show me recent incidents', 'Has this happened before?'],
    confidence: 'low',
  };
}

// ---------------------------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------------------------

/**
 * Answer one chat turn. `question` is the raw user text, `snapshot` is everything the service
 * loaded for it (workspace state + retrieval), `history` is the conversation so far — used to
 * resolve follow-ups ("aur uske baad?" / "what about the database one?") that carry no subject.
 */
export function answerChat(params: {
  question: string;
  snapshot: ChatSnapshot;
  history?: ChatTurn[];
}): ChatAnswer {
  const question = params.question.trim();
  const snapshot = params.snapshot;
  const lang = detectChatLanguage(question);

  let intent = classifyChatIntent(question);
  let subject = question;

  // Follow-up resolution: an unrecognized turn inherits the subject of the previous question, so
  // "and the fix?" / "uska root cause?" work right after an answer.
  if (intent === 'unknown' && params.history?.length) {
    const previous = [...params.history].reverse().find((turn) => turn.role === 'user');
    if (previous) {
      const merged = `${previous.content} ${question}`;
      const retry = classifyChatIntent(merged);
      if (retry !== 'unknown' && !SOCIAL.has(retry)) {
        intent = retry;
        subject = merged;
      } else if (matchAdvisoryTopic(merged) && merged.split(/\s+/).length >= 4) {
        intent = 'advice';
        subject = merged;
      }
    }
  }

  if (intent === 'unknown' && wantsAdvice(question) && question.split(/\s+/).length >= 4) {
    intent = 'advice';
    subject = question;
  }

  const modelLabel = snapshot.model.name;
  switch (intent) {
    case 'greet':
      return result(say('greeting', lang), intent, 'high', lang, [], ['What is open right now?', 'Show me recent incidents', 'What can you do?']);
    case 'thanks':
      return result(say('thanks', lang), intent, 'high', lang, [], ['Show me what is open', 'Have we seen this before?']);
    case 'smalltalk':
      return result(say('smalltalk', lang), intent, 'high', lang, [], ['What is open right now?', 'What can you do?']);
    case 'identity':
      return result(say('identity', lang, modelLabel), intent, 'high', lang, [{ source: 'workspace', label: `Model ${modelLabel} · v${snapshot.model.version}`, detail: `trained on ${snapshot.model.teamDocuments} of your incidents, ${snapshot.model.totalDocuments} documents total` }], ['How accurate are you?', 'How does training work?', 'What can you do?']);
    case 'help':
      return result(say('help', lang), intent, 'high', lang, [], ['What is open right now?', 'Which incidents keep repeating?', 'Redis misses are spiking — what should I check?']);
    case 'code_request':
      return result(say('codeRefusal', lang), intent, 'high', lang, [], ['Explain the stack trace I am looking at', 'What usually fixes a database timeout?', 'What did we do last time this broke?']);
    case 'open_incidents':
      return spread(answerOpenIncidents(snapshot, lang), intent, lang);
    case 'recent_incidents':
      return spread(answerRecentIncidents(snapshot, lang), intent, lang);
    case 'stats':
      return spread(answerStats(snapshot, lang), intent, lang);
    case 'services':
      return spread(answerServices(snapshot, lang), intent, lang);
    case 'team':
      return spread(answerTeam(snapshot, lang), intent, lang);
    case 'incident_search':
      return spread(answerSearch(snapshot, lang), intent, lang);
    case 'lessons':
      return spread(answerLessons(subject, snapshot, lang), intent, lang);
    case 'explain_incident':
      return spread(answerExplainIncident(subject, snapshot, lang), intent, lang);
    case 'runbook':
      return spread(answerRunbook(snapshot, lang), intent, lang);
    case 'advice':
      return spread(answerAdvice(subject, snapshot, lang), intent, lang);
    case 'unknown':
    default:
      return spread(answerUnknown(snapshot, lang), intent, lang);
  }
}

function result(
  text: string,
  intent: ChatIntent,
  confidence: ChatAnswer['confidence'],
  lang: ChatLang,
  citations: ChatCitation[],
  suggestions: string[],
): ChatAnswer {
  return { answer: text, intent, confidence, citations, suggestions, lang };
}

function spread(
  built: { text: string; cites: ChatCitation[]; suggestions: string[]; confidence: ChatAnswer['confidence'] },
  intent: ChatIntent,
  lang: ChatLang,
): ChatAnswer {
  const followUps = built.suggestions.length ? built.suggestions : lang === 'hinglish' ? ['Abhi kya open hai?', 'Pichhle incidents dikhao'] : ['What is open right now?', 'Show me recent incidents'];
  return { answer: built.text, intent, confidence: built.confidence, citations: built.cites.slice(0, 6), suggestions: dedupe(followUps, 4), lang };
}

function dedupe(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

/** Exported for the model page: a short, honest description of what chat can and cannot do. */
export const CHAT_CAPABILITIES = [
  'Open incidents and what needs attention now',
  'History search across every resolved incident',
  'Runbook and knowledge-base answers, cited',
  'Ops problem-solving for anything you describe',
  'Model status: what was learned from this workspace',
] as const;

export const CHAT_LIMITS = {
  /** Longest accepted question. */
  maxQuestionChars: 1_200,
  /** Longest stored answer (the engine never gets close; a guard for corrupted rows). */
  maxAnswerChars: 6_000,
  /** Turns of history handed to the engine for follow-up resolution. */
  maxHistoryTurns: 8,
  /** Messages loaded when a session is opened. */
  maxLoadedMessages: 200,
} as const;
