/**
 * ARCH Thinker — intent + slot extraction. No language model.
 *
 * Developers describe a small piece of work in plain language (or Hinglish). We score keyword
 * patterns, pick one intent, and pull a resource name / fields. Unknown intent still returns a
 * conservative stub plus a checklist — we never invent a multi-file agent plan.
 */

export const THINKER_INTENTS = [
  'crud_route',
  'zod_schema',
  'prisma_model',
  'webhook_handler',
  'status_machine',
  'unit_test',
  'react_form',
  'unknown',
] as const;

export type ThinkerIntent = (typeof THINKER_INTENTS)[number];

export type ThinkerSlots = {
  resource: string;
  resourceCamel: string;
  resourcePascal: string;
  resourcePlural: string;
  fields: { name: string; type: string }[];
};

export type ThinkerRequest = {
  intent: ThinkerIntent;
  confidence: number;
  slots: ThinkerSlots;
  notes: string[];
};

const STOP = new Set([
  'a', 'an', 'the', 'for', 'with', 'and', 'or', 'to', 'of', 'in', 'on', 'my', 'our', 'please',
  'banao', 'bana', 'karo', 'do', 'ek', 'ka', 'ke', 'ki', 'se', 'me', 'mein', 'chahiye', 'need',
  'bhai', 'bro', 'yaar', 'pls', 'plz', 'hey', 'hi',
  'want', 'make', 'create', 'add', 'write', 'small', 'simple', 'new', 'feature', 'code', 'script',
]);

const FIELD_TYPES: Record<string, string> = {
  email: 'string',
  name: 'string',
  title: 'string',
  slug: 'string',
  status: 'string',
  severity: 'string',
  body: 'string',
  description: 'string',
  url: 'string',
  password: 'string',
  count: 'number',
  amount: 'number',
  age: 'number',
  enabled: 'boolean',
  active: 'boolean',
};

type Pattern = { intent: ThinkerIntent; re: RegExp; weight: number };

const PATTERNS: Pattern[] = [
  { intent: 'crud_route', re: /\b(crud|rest\s*api|api\s*route|route\s*handler|endpoint|next\.js\s*route|app\s*router)\b/i, weight: 4 },
  { intent: 'crud_route', re: /\b(get|post|patch|delete)\b.+\b(user|users|item|resource|incident)\b/i, weight: 3 },
  { intent: 'crud_route', re: /\b(list|create|update|delete)\b.+\b(api|route|handler)\b/i, weight: 3 },
  { intent: 'zod_schema', re: /\b(zod|validation\s*schema|input\s*schema|parse\s*body)\b/i, weight: 5 },
  { intent: 'prisma_model', re: /\b(prisma|data\s*model|schema\.prisma|table\s*model)\b/i, weight: 5 },
  { intent: 'webhook_handler', re: /\b(webhook|hmac|inbound\s*alert|signature\s*verif)/i, weight: 5 },
  { intent: 'status_machine', re: /\b(state\s*machine|status\s*transition|incident\s*status)\b/i, weight: 5 },
  { intent: 'unit_test', re: /\b(unit\s*test|vitest|test\s*file|spec\b)\b/i, weight: 4 },
  { intent: 'react_form', re: /\b(form|textarea|select)\b.+\b(react|component|ui)\b/i, weight: 3 },
  { intent: 'react_form', re: /\breact\s*form\b/i, weight: 4 },
];

function toPascal(raw: string): string {
  return raw
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('') || 'Resource';
}

function toCamel(pascal: string): string {
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function pluralize(word: string): string {
  if (word.endsWith('s')) return word;
  if (word.endsWith('y') && word.length > 1 && !/[aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

function extractResource(text: string): string {
  const labeled = /\b(?:for|of|named|called|naam)\s+([a-z][a-z0-9_-]{1,40})\b/i.exec(text);
  if (labeled && !STOP.has(labeled[1]!.toLowerCase())) return labeled[1]!;
  const nouns = text
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP.has(token) && !/^(api|crud|zod|prisma|route|schema|model|handler|test|form)$/.test(token));
  return nouns[0] ?? 'item';
}

function extractFields(text: string): { name: string; type: string }[] {
  const withClause = /\bwith\s+([a-z0-9_,\s]+?)(?:\.|$)/i.exec(text);
  const chunk = withClause?.[1] ?? '';
  const names = chunk
    .split(/,|\band\b/i)
    .map((part) => part.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))
    .filter((name) => name.length >= 2 && name.length <= 32 && !STOP.has(name));
  const unique = [...new Set(names.length ? names : ['name'])];
  return unique.slice(0, 8).map((name) => ({ name, type: FIELD_TYPES[name] ?? 'string' }));
}

export function classifyThinkerRequest(text: string): ThinkerRequest {
  const source = text.trim().slice(0, 4000);
  const scores = new Map<ThinkerIntent, number>();
  for (const pattern of PATTERNS) {
    if (pattern.re.test(source)) scores.set(pattern.intent, (scores.get(pattern.intent) ?? 0) + pattern.weight);
  }
  let intent: ThinkerIntent = 'unknown';
  let best = 0;
  for (const [key, value] of scores) {
    if (value > best) {
      best = value;
      intent = key;
    }
  }
  const resource = extractResource(source);
  const pascal = toPascal(resource);
  const camel = toCamel(pascal);
  const notes: string[] = [];
  if (intent === 'unknown') notes.push('No strong intent matched. Returning a tiny handler stub plus a checklist — not a full feature.');
  if (best < 3 && intent !== 'unknown') notes.push('Intent is a weak match; treat the snippet as a starting point, not a design.');
  const confidence = intent === 'unknown' ? 0.2 : Math.min(0.95, 0.35 + best / 10);
  return {
    intent,
    confidence,
    slots: {
      resource: camel,
      resourceCamel: camel,
      resourcePascal: pascal,
      resourcePlural: pluralize(camel),
      fields: extractFields(source),
    },
    notes,
  };
}
