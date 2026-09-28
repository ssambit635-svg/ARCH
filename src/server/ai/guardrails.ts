import { AiProviderError, type AiProvider, type CopilotTask, type GenerateResult } from './provider';

/**
 * ARCH Copilot guardrails (AGENTS-V2.md hard rules 2, 4 and the status-draft acceptance rule).
 *
 *  - `redact()`               strips credentials and personal data BEFORE anything leaves ARCH;
 *  - `LIMITS` / `truncate()`  bound how much context a single call can carry;
 *  - `callWithGuardrails()`   per-attempt timeout, one retry, output validation, friendly failure;
 *  - `sanitizeCustomerText()` removes internal hostnames / IPs from customer-facing drafts.
 */

export const LIMITS = {
  maxTitleChars: 200,
  maxEventChars: 800,
  maxTimelineEntries: 60,
  maxContextChars: 16_000,
  maxCandidates: 25,
  maxAttachmentChars: 6_000,
  maxSimilarIncidents: 4,
  /** 1 try + 1 retry. */
  attempts: 2,
} as const;

// ---------------------------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------------------------

const SECRET_KEY_NAMES =
  '[\\w-]*(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credentials?|session[_-]?id|cookie)[\\w-]*';

/** Order matters: the most specific patterns run first so they are not half-eaten by later ones. */
const REDACTION_RULES: { name: string; pattern: RegExp; replacement: string }[] = [
  {
    name: 'private_key',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
    replacement: '[REDACTED_PRIVATE_KEY]',
  },
  // scheme://user:password@host  →  scheme://[REDACTED]@host
  { name: 'url_credentials', pattern: /\b([a-z][a-z0-9+.-]*:\/\/)[^\s:@/]+:[^\s@/]+@/gi, replacement: '$1[REDACTED]@' },
  { name: 'auth_header', pattern: /\b(bearer|basic|token)\s+[A-Za-z0-9._~+/=-]{12,}/gi, replacement: '$1 [REDACTED]' },
  { name: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, replacement: '[REDACTED_JWT]' },
  { name: 'openai_anthropic_key', pattern: /\bsk-[A-Za-z0-9_-]{16,}/g, replacement: '[REDACTED_KEY]' },
  { name: 'github_token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, replacement: '[REDACTED_KEY]' },
  { name: 'slack_token', pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g, replacement: '[REDACTED_KEY]' },
  { name: 'aws_access_key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, replacement: '[REDACTED_KEY]' },
  { name: 'google_api_key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replacement: '[REDACTED_KEY]' },
  { name: 'stripe_key', pattern: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g, replacement: '[REDACTED_KEY]' },
  { name: 'webhook_secret', pattern: /\bwhsec_[A-Za-z0-9+/=]{16,}/g, replacement: '[REDACTED_KEY]' },
  // password=hunter2, "api_key": "abc", X-Api-Key: abc, DB_PASSWORD='x y'
  {
    name: 'key_value_secret',
    pattern: new RegExp(`(["']?\\b${SECRET_KEY_NAMES}["']?)(\\s*[:=]\\s*)("[^"]*"|'[^']*'|[^\\s,;&]+)`, 'gi'),
    replacement: '$1$2[REDACTED]',
  },
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[REDACTED_EMAIL]' },
  // Long hex runs are hashes, session ids or keys far more often than prose.
  { name: 'long_hex', pattern: /\b[a-f0-9]{32,}\b/gi, replacement: '[REDACTED_HEX]' },
];

export function redact(text: string): string {
  let result = text;
  for (const rule of REDACTION_RULES) result = result.replace(rule.pattern, rule.replacement);
  return result;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

// ---------------------------------------------------------------------------------------------
// Customer-safe output (status-update drafts)
// ---------------------------------------------------------------------------------------------

const INTERNAL_PHRASE = 'an internal system';

const INTERNAL_SUFFIXES = [
  'internal',
  'local',
  'localdomain',
  'lan',
  'corp',
  'intra',
  'intranet',
  'private',
  'svc',
  'cluster',
  'consul',
  'home.arpa',
];

const HOST_LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';

const CUSTOMER_UNSAFE_PATTERNS: RegExp[] = [
  // Any URL — the approving human can add a public link back if it is really wanted.
  /\b(?:https?|wss?|ftp|postgres(?:ql)?|mysql|redis|amqp|mongodb(?:\+srv)?):\/\/[^\s)>\]]+/gi,
  // IPv4 (optionally with port) and IPv6.
  /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?\b/g,
  /\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/gi,
  // EC2-style and Kubernetes pod names.
  /\bip-\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}\b/gi,
  /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*-[a-f0-9]{8,10}-[a-z0-9]{5}\b/g,
  // Hostnames under internal suffixes: db-1.prod.internal, cache.svc, api.cluster.local, redis.lan
  new RegExp(`\\b${HOST_LABEL}(?:\\.${HOST_LABEL})*\\.(?:${INTERNAL_SUFFIXES.map((s) => s.replace('.', '\\.')).join('|')})\\b`, 'gi'),
  // Cloud-provider infrastructure hostnames.
  new RegExp(`\\b(?:${HOST_LABEL}\\.)+(?:amazonaws\\.com|cloudapp\\.net|azurewebsites\\.net|googleusercontent\\.com|rds\\.amazonaws\\.com)\\b`, 'gi'),
  // host:port, e.g. redis-primary:6379 or db.acme.net:5432
  new RegExp(`\\b[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.${HOST_LABEL})*:\\d{2,5}\\b`, 'gi'),
  // Any fully qualified name with 3+ labels (db-primary-03.prod.acme.net).
  new RegExp(`\\b${HOST_LABEL}\\.${HOST_LABEL}\\.(?:${HOST_LABEL}\\.)*[a-z]{2,}\\b`, 'gi'),
];

/**
 * Remove internal hostnames, IPs, URLs and pod names from text meant for customers. Runs on every
 * status-update draft after the model responds, so the guarantee does not depend on the prompt.
 */
export function sanitizeCustomerText(text: string): string {
  let result = text;
  for (const pattern of CUSTOMER_UNSAFE_PATTERNS) result = result.replace(pattern, INTERNAL_PHRASE);
  // Tidy up "an internal system, an internal system" style repetitions.
  const repeated = new RegExp(`(${INTERNAL_PHRASE})(?:[\\s,/]+(?:and\\s+)?${INTERNAL_PHRASE})+`, 'g');
  return result.replace(repeated, '$1').replace(/[ \t]{2,}/g, ' ').trim();
}

/** True when `text` still contains something `sanitizeCustomerText` would remove. */
export function containsInternalReferences(text: string): boolean {
  return CUSTOMER_UNSAFE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    const found = pattern.test(text);
    pattern.lastIndex = 0;
    return found;
  });
}

// ---------------------------------------------------------------------------------------------
// Calling the provider: timeout, retry once, validate output
// ---------------------------------------------------------------------------------------------

export type CopilotFailureReason = 'timeout' | 'provider_error' | 'invalid_output' | 'not_configured';

export class CopilotCallError extends Error {
  constructor(
    readonly reason: CopilotFailureReason,
    readonly attempts: number,
    message: string,
  ) {
    super(message);
    this.name = 'CopilotCallError';
  }
}

class AttemptTimeout extends Error {}

/** Pull the first JSON object out of a completion (models sometimes wrap it in ``` fences). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1]!.trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in completion');
  return JSON.parse(candidate.slice(start, end + 1));
}

export type GuardedCall<T> = {
  value: T;
  result: GenerateResult;
  attempts: number;
  latencyMs: number;
  /** Tokens across every attempt, including a failed first one. */
  promptTokens: number;
  completionTokens: number;
};

export async function callWithGuardrails<T>(params: {
  provider: AiProvider;
  task: CopilotTask;
  system: string;
  user: string;
  maxTokens: number;
  timeoutMs: number;
  /** Validates + transforms the raw completion. Throw to reject it (counts as a failed attempt). */
  parse: (text: string) => T;
  attempts?: number;
}): Promise<GuardedCall<T>> {
  const maxAttempts = params.attempts ?? LIMITS.attempts;
  const started = Date.now();
  let lastReason: CopilotFailureReason = 'provider_error';
  let promptTokens = 0;
  let completionTokens = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AttemptTimeout());
      }, params.timeoutMs);
    });

    try {
      // Race as well as abort: a provider that ignores the signal still cannot hang the request.
      const result = await Promise.race([
        params.provider.generate(params.system, params.user, {
          task: params.task,
          maxTokens: params.maxTokens,
          signal: controller.signal,
        }),
        timeout,
      ]);
      promptTokens += result.promptTokens;
      completionTokens += result.completionTokens;

      try {
        const value = params.parse(result.text);
        return { value, result, attempts: attempt, latencyMs: Date.now() - started, promptTokens, completionTokens };
      } catch {
        lastReason = 'invalid_output';
      }
    } catch (error) {
      if (error instanceof AttemptTimeout || controller.signal.aborted) {
        lastReason = 'timeout';
      } else if (error instanceof AiProviderError && error.options.retryable === false) {
        throw new CopilotCallError(error.options.status ? 'provider_error' : 'not_configured', attempt, error.message);
      } else {
        lastReason = 'provider_error';
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw new CopilotCallError(lastReason, maxAttempts, `Copilot call failed after ${maxAttempts} attempts (${lastReason}).`);
}
