/**
 * ARCH Model — text processing.
 *
 * Deliberately small and deterministic: no external tokenizer, no network, no native code. The
 * same function is used at training time and at inference time, so a model trained on one machine
 * behaves identically on another.
 */

const STOPWORDS = new Set(
  (
    'a an the and or but if then else of to in on at by for from with without into onto over under about as is are was were be been ' +
    'being am do does did doing have has had having it its this that these those there here we our ours us you your yours they them ' +
    'their theirs he she his her i me my mine what which who whom whose when where why how all any both each few more most other some ' +
    'such no nor not only own same so than too very can will just should would could may might must shall also after before during ' +
    'while until again further once up down out off per via us please via been one two three new get got still now around across ' +
    'within due because since though although however whether'
  ).split(/\s+/),
);

/** Tokens that carry meaning even though they are short or numeric. */
const KEEP_SHORT = new Set(['db', 'io', 'ip', 'os', 'ui', 'ux', 'vm', 'k8', 'tls', 'ssl', 'dns', 'cdn', 'api', 'cpu', 'ram', 'oom', 'bgp', 'sso', 'jvm', 'gc', 'lb', 'az']);

/** Light suffix stripping — enough to merge "timeouts/timed/timing" without a dictionary. */
export function stem(token: string): string {
  if (token.length <= 4 || /\d/.test(token)) return token;
  for (const suffix of ['ations', 'ation', 'ments', 'ment', 'ness', 'ities', 'ity', 'ingly', 'ings', 'ing', 'edly', 'ies', 'ied', 'ers', 'er', 'ed', 'es', 's']) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      const base = token.slice(0, -suffix.length);
      return suffix === 'ies' || suffix === 'ied' ? `${base}y` : base;
    }
  }
  return token;
}

/**
 * Words → normalized unigrams + a few semantic class tokens.
 *   "HTTP 502s"   → ["http", "502", "#5xx"]
 *   "p99 latency" → ["p99", "latency"]
 */
export function words(text: string): string[] {
  const out: string[] = [];
  const lowered = text.toLowerCase().replace(/\[redacted[a-z_]*\]/g, ' ');
  for (const raw of lowered.split(/[^a-z0-9%]+/)) {
    if (!raw) continue;
    if (/^[1-5]\d\ds?$/.test(raw)) {
      const code = raw.replace(/s$/, '');
      out.push(code, `#${code[0]}xx`);
      continue;
    }
    if (/^\d+(\.\d+)?%$/.test(raw)) {
      out.push('#percent');
      continue;
    }
    if (/^\d+$/.test(raw)) continue;
    if (raw.length < 3 && !KEEP_SHORT.has(raw)) continue;
    if (STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

/** Unigrams + adjacent bigrams ("connection_pool", "roll_back"). */
export function tokenize(text: string): string[] {
  const unigrams = words(text).filter((token) => !token.startsWith('#') || token === '#5xx' || token === '#4xx');
  const tokens = [...unigrams];
  for (let index = 0; index + 1 < unigrams.length; index += 1) {
    tokens.push(`${unigrams[index]}_${unigrams[index + 1]}`);
  }
  return tokens;
}

export function termCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

/** Split prose into sentences without breaking on "v1.2", "e.g." or hostnames. */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function clip(text: string, max: number): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max - 1).trimEnd()}…` : single;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 48) return `${Math.round(hours / 24)} days`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
